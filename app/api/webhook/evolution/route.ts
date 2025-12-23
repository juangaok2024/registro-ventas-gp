// app/api/webhook/evolution/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { parseSaleMessage, isSaleReport, extractPhoneFromJid } from '@/lib/parser';
import { EvolutionWebhookPayload, Sale } from '@/types/sales';

// ID del grupo de comprobantes - configurar en .env
const SALES_GROUP_JID = process.env.SALES_GROUP_JID || '';

// Cache temporal para asociar comprobantes con mensajes de venta
// En producción, usar Redis o similar
const pendingProofs = new Map<string, { url: string; type: 'image' | 'pdf'; messageId: string }>();

export async function POST(request: NextRequest) {
  try {
    const payload: EvolutionWebhookPayload = await request.json();
    
    console.log('📨 Webhook received:', payload.event);
    
    // Solo procesar mensajes del grupo de ventas
    if (payload.event !== 'messages.upsert') {
      return NextResponse.json({ status: 'ignored', reason: 'not a message event' });
    }
    
    const { data } = payload;
    const groupJid = data.key.remoteJid;
    
    // Verificar que sea del grupo correcto
    if (groupJid !== SALES_GROUP_JID && !groupJid.endsWith('@g.us')) {
      return NextResponse.json({ status: 'ignored', reason: 'not from sales group' });
    }
    
    const senderJid = data.key.participant || data.key.remoteJid;
    const senderPhone = extractPhoneFromJid(senderJid);
    const senderName = data.pushName || senderPhone;
    const messageId = data.key.id;
    
    // Caso 1: Es un mensaje con imagen/documento (comprobante)
    if (data.message.imageMessage || data.message.documentMessage) {
      const isImage = !!data.message.imageMessage;
      const mediaUrl = isImage 
        ? data.message.imageMessage?.url 
        : data.message.documentMessage?.url;
      
      if (mediaUrl) {
        // Guardar en cache temporal esperando el mensaje con los datos
        pendingProofs.set(messageId, {
          url: mediaUrl,
          type: isImage ? 'image' : 'pdf',
          messageId,
        });
        
        console.log('📎 Comprobante guardado en cache:', messageId);
        
        // Limpiar cache después de 30 minutos
        setTimeout(() => pendingProofs.delete(messageId), 30 * 60 * 1000);
      }
      
      return NextResponse.json({ status: 'proof_cached', messageId });
    }
    
    // Caso 2: Es un mensaje de texto (posible reporte de venta)
    const messageText = data.message.conversation || 
                        data.message.extendedTextMessage?.text || '';
    
    if (!isSaleReport(messageText)) {
      return NextResponse.json({ status: 'ignored', reason: 'not a sale report' });
    }
    
    console.log('📝 Procesando reporte de venta de:', senderName);
    
    // Parsear el mensaje
    const parsedData = parseSaleMessage(messageText);
    
    if (!parsedData) {
      return NextResponse.json({ status: 'error', reason: 'failed to parse message' });
    }
    
    // Buscar el comprobante asociado (mensaje citado)
    let proofUrl = '';
    let proofType: 'image' | 'pdf' = 'image';
    let proofMessageId = '';
    
    const quotedMessageId = data.message.extendedTextMessage?.contextInfo?.stanzaId;
    
    if (quotedMessageId && pendingProofs.has(quotedMessageId)) {
      const proof = pendingProofs.get(quotedMessageId)!;
      proofUrl = proof.url;
      proofType = proof.type;
      proofMessageId = proof.messageId;
      pendingProofs.delete(quotedMessageId);
      console.log('✅ Comprobante asociado encontrado');
    }
    
    // Si el mensaje citado tiene imagen/documento directamente
    const quotedMessage = data.message.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quotedMessage?.imageMessage?.url) {
      proofUrl = quotedMessage.imageMessage.url;
      proofType = 'image';
    } else if (quotedMessage?.documentMessage?.url) {
      proofUrl = quotedMessage.documentMessage.url;
      proofType = 'pdf';
    }
    
    // Descargar y guardar el comprobante en Firebase Storage
    let storedProofUrl = proofUrl;
    if (proofUrl) {
      try {
        // Descargar desde Evolution API
        const proofResponse = await fetch(proofUrl);
        const proofBlob = await proofResponse.blob();
        
        // Subir a Firebase Storage
        const fileName = `proofs/${Date.now()}_${messageId}.${proofType === 'image' ? 'jpg' : 'pdf'}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, proofBlob);
        storedProofUrl = await getDownloadURL(storageRef);
        
        console.log('☁️ Comprobante subido a Storage:', fileName);
      } catch (error) {
        console.error('Error subiendo comprobante:', error);
        // Continuar sin el comprobante
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
      proofUrl: storedProofUrl,
      proofType,
      proofMessageId,
      rawMessage: messageText,
      groupJid,
      messageId,
      status: parsedData.hasCheckmark ? 'verified' : 'pending',
      createdAt: new Date(data.messageTimestamp * 1000),
      updatedAt: new Date(),
    };
    
    // Guardar en Firestore
    const salesRef = collection(db, 'sales');
    const docRef = await addDoc(salesRef, saleData);
    
    console.log('💾 Venta guardada:', docRef.id);
    
    // Actualizar stats del closer
    await updateCloserStats(senderPhone, senderName, parsedData.amount, parsedData.currency);
    
    return NextResponse.json({ 
      status: 'success', 
      saleId: docRef.id,
      data: {
        client: parsedData.clientName,
        amount: parsedData.amount,
        currency: parsedData.currency,
        product: parsedData.product,
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
  
  // Convertir a USD si es necesario (aproximación)
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
      name, // Por si cambió
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
    salesGroupJid: SALES_GROUP_JID ? 'configured' : 'NOT CONFIGURED'
  });
}
