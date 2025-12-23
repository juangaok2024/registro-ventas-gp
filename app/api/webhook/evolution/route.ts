// app/api/webhook/evolution/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  increment,
  orderBy,
  limit
} from 'firebase/firestore';
import { parseSaleMessage, isSaleReport, extractPhoneFromJid } from '@/lib/parser';
import { EvolutionWebhookPayload, Sale } from '@/types/sales';

// ID del grupo de comprobantes - configurar en .env
const SALES_GROUP_JID = process.env.SALES_GROUP_JID || '';
const OUTGOING_WEBHOOK_URL = process.env.OUTGOING_WEBHOOK_URL || '';

export async function POST(request: NextRequest) {
  try {
    const payload: EvolutionWebhookPayload = await request.json();

    console.log('📨 Webhook received:', payload.event);

    // Solo procesar mensajes
    if (payload.event !== 'messages.upsert' && payload.event !== 'MESSAGES_UPSERT') {
      return NextResponse.json({ status: 'ignored', reason: 'not a message event' });
    }

    const { data } = payload;
    const groupJid = data.key.remoteJid;

    // Verificar que sea de un grupo
    if (!groupJid?.endsWith('@g.us')) {
      return NextResponse.json({ status: 'ignored', reason: 'not from a group' });
    }

    // Extraer datos del remitente - usar participantAlt para el número real del closer
    const senderPhone = data.participantAlt || extractPhoneFromJid(data.key.participant || data.key.remoteJid);
    const senderName = data.pushName || senderPhone;
    const messageId = data.key.id;
    const messageTimestamp = data.messageTimestamp;

    // Caso 1: Es un mensaje con imagen/documento (comprobante)
    // La URL está en data.message.mediaUrl para ambos tipos
    // Se detecta el tipo por imageMessage.mimetype (image/jpeg) o documentMessage (application/pdf)
    if (data.message?.imageMessage || data.message?.documentMessage || data.message?.mediaUrl) {
      // mediaUrl está directamente en data.message.mediaUrl
      const mediaUrl = data.message?.mediaUrl ||
                       data.message?.imageMessage?.url ||
                       data.message?.imageMessage?.mediaUrl ||
                       data.message?.documentMessage?.url ||
                       data.message?.documentMessage?.mediaUrl || '';

      // Detectar tipo por mimetype del imageMessage o documentMessage
      const mimetype = data.message?.imageMessage?.mimetype ||
                       data.message?.documentMessage?.mimetype || '';
      const isImage = mimetype.startsWith('image/');
      const caption = data.message?.imageMessage?.caption || '';

      if (mediaUrl) {
        // Guardar comprobante en Firestore (colección 'proofs')
        const proofsRef = collection(db, 'proofs');
        await addDoc(proofsRef, {
          messageId,
          mediaUrl,
          mediaType: isImage ? 'image' : 'document',
          mimetype,
          caption,
          senderPhone,
          senderName,
          groupJid,
          timestamp: new Date(messageTimestamp * 1000),
          createdAt: new Date(),
          linkedToSale: false, // Se actualiza cuando se vincula a una venta
        });

        console.log('📎 Comprobante guardado en Firestore:', messageId);
      }

      return NextResponse.json({ status: 'proof_saved', messageId });
    }

    // Caso 2: Es un mensaje de texto (posible reporte de venta)
    const messageText = data.message?.conversation ||
                        data.message?.extendedTextMessage?.text || '';

    if (!messageText || !isSaleReport(messageText)) {
      return NextResponse.json({ status: 'ignored', reason: 'not a sale report' });
    }

    console.log('📝 Procesando reporte de venta de:', senderName);

    // Parsear el mensaje
    const parsedData = parseSaleMessage(messageText);

    if (!parsedData) {
      return NextResponse.json({ status: 'error', reason: 'failed to parse message' });
    }

    // Buscar el comprobante asociado
    let proofUrl = '';
    let proofType: 'image' | 'pdf' = 'image';
    let proofMessageId = '';

    // Opción 1: Buscar por mensaje citado (quotedMessageId)
    const quotedMessageId = data.message?.extendedTextMessage?.contextInfo?.stanzaId;

    if (quotedMessageId) {
      // Buscar en la colección de proofs
      const proofsRef = collection(db, 'proofs');
      const proofQuery = query(proofsRef, where('messageId', '==', quotedMessageId));
      const proofSnapshot = await getDocs(proofQuery);

      if (!proofSnapshot.empty) {
        const proofDoc = proofSnapshot.docs[0];
        const proofData = proofDoc.data();
        proofUrl = proofData.mediaUrl;
        proofType = proofData.mediaType === 'image' ? 'image' : 'pdf';
        proofMessageId = proofData.messageId;

        // Marcar como vinculado
        await updateDoc(doc(db, 'proofs', proofDoc.id), { linkedToSale: true });
        console.log('✅ Comprobante vinculado desde Firestore');
      }
    }

    // Opción 2: Si el mensaje citado tiene imagen/documento directamente en el payload
    const quotedMessage = data.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!proofUrl && quotedMessage) {
      if (quotedMessage.imageMessage?.url) {
        proofUrl = quotedMessage.imageMessage.url;
        proofType = 'image';
      } else if (quotedMessage.documentMessage?.url) {
        proofUrl = quotedMessage.documentMessage.url;
        proofType = 'pdf';
      }
    }

    // Opción 3: Buscar el último comprobante del mismo sender en los últimos 10 minutos
    if (!proofUrl) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const proofsRef = collection(db, 'proofs');
      const recentProofQuery = query(
        proofsRef,
        where('senderPhone', '==', senderPhone),
        where('linkedToSale', '==', false),
        where('createdAt', '>=', tenMinutesAgo),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      try {
        const recentSnapshot = await getDocs(recentProofQuery);
        if (!recentSnapshot.empty) {
          const proofDoc = recentSnapshot.docs[0];
          const proofData = proofDoc.data();
          proofUrl = proofData.mediaUrl;
          proofType = proofData.mediaType === 'image' ? 'image' : 'pdf';
          proofMessageId = proofData.messageId;

          await updateDoc(doc(db, 'proofs', proofDoc.id), { linkedToSale: true });
          console.log('✅ Comprobante reciente vinculado automáticamente');
        }
      } catch (e) {
        // Si falla el query compuesto (índice faltante), continuar sin comprobante
        console.log('⚠️ No se pudo buscar comprobante reciente:', e);
      }
    }

    // Crear el registro de venta
    const saleData: Omit<Sale, 'id'> = {
      closerPhone: senderPhone,
      closerName: senderName,
      clientName: parsedData.clientName,
      clientEmail: parsedData.clientEmail,
      clientPhone: parsedData.clientPhone,
      amount: parsedData.amount,
      currency: parsedData.currency,
      product: parsedData.product,
      funnel: parsedData.funnel,
      paymentMethod: parsedData.paymentMethod,
      paymentType: parsedData.paymentType,
      extras: parsedData.extras,
      proofUrl,
      proofType,
      proofMessageId,
      rawMessage: messageText,
      groupJid,
      messageId,
      status: 'pending', // Siempre pendiente hasta verificación manual
      verified: false,
      verifiedAt: null,
      verifiedBy: null,
      createdAt: new Date(messageTimestamp * 1000),
      updatedAt: new Date(),
    };

    // Guardar en Firestore
    const salesRef = collection(db, 'sales');
    const docRef = await addDoc(salesRef, saleData);

    console.log('💾 Venta guardada:', docRef.id);

    // Actualizar stats del closer
    await updateCloserStats(senderPhone, senderName, parsedData.amount, parsedData.currency);

    // Enviar webhook de salida si está configurado
    if (OUTGOING_WEBHOOK_URL) {
      try {
        await fetch(OUTGOING_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'new_sale',
            saleId: docRef.id,
            data: {
              client: parsedData.clientName,
              clientEmail: parsedData.clientEmail,
              clientPhone: parsedData.clientPhone,
              amount: parsedData.amount,
              currency: parsedData.currency,
              product: parsedData.product,
              closer: senderName,
              closerPhone: senderPhone,
              proofUrl,
              createdAt: saleData.createdAt,
            }
          })
        });
        console.log('🔔 Webhook de salida enviado');
      } catch (e) {
        console.error('Error enviando webhook de salida:', e);
      }
    }

    return NextResponse.json({
      status: 'success',
      saleId: docRef.id,
      data: {
        client: parsedData.clientName,
        amount: parsedData.amount,
        currency: parsedData.currency,
        product: parsedData.product,
        proofUrl: proofUrl ? 'attached' : 'none',
      }
    });

  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}

async function updateCloserStats(phone: string, name: string, amount: number, currency: string) {
  const closersRef = collection(db, 'closers');
  const q = query(closersRef, where('phone', '==', phone));
  const snapshot = await getDocs(q);

  // Convertir a USD si es necesario
  let amountUsd = amount;
  if (currency === 'ARS') {
    amountUsd = amount / 1000; // Ajustar según tipo de cambio
  } else if (currency === 'EUR') {
    amountUsd = amount * 1.1;
  }

  if (snapshot.empty) {
    // Crear nuevo closer
    await addDoc(closersRef, {
      phone,
      name,
      totalSales: 1,
      totalAmount: amountUsd,
      lastSaleAt: new Date(),
      createdAt: new Date(),
    });
  } else {
    // Actualizar existente
    const closerDoc = snapshot.docs[0];
    await updateDoc(doc(db, 'closers', closerDoc.id), {
      name,
      totalSales: increment(1),
      totalAmount: increment(amountUsd),
      lastSaleAt: new Date(),
    });
  }
}

// Endpoint para verificar el webhook
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Sales Tracker Webhook Active',
    salesGroupJid: SALES_GROUP_JID ? 'configured' : 'NOT CONFIGURED',
    outgoingWebhook: OUTGOING_WEBHOOK_URL ? 'configured' : 'NOT CONFIGURED'
  });
}
