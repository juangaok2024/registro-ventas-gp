// app/api/reprocess/route.ts
// Endpoint para reprocesar mensajes existentes y detectar ventas no reconocidas
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  updateDoc,
  addDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  increment
} from 'firebase/firestore';
import { parseSaleMessage, isSaleReport } from '@/lib/parser';

export async function POST() {
  try {
    const results = {
      processed: 0,
      newSalesFound: 0,
      sales: [] as { messageId: string; clientName: string; amount: number; currency: string }[],
      errors: [] as string[],
    };

    // Buscar todos los mensajes recientes (sin filtro compuesto para evitar índice faltante)
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(200) // Traer más y filtrar en memoria
    );

    const snapshot = await getDocs(q);

    // Filtrar en memoria: solo mensajes de texto que NO son ventas
    const candidates = snapshot.docs.filter(docSnap => {
      const data = docSnap.data();
      return data.type === 'text' && data.classification?.isSale === false;
    });

    for (const docSnap of candidates) {
      results.processed++;
      const data = docSnap.data();
      const content = data.content || '';

      // Verificar si es un reporte de venta
      if (!isSaleReport(content)) {
        continue;
      }

      const parsedData = parseSaleMessage(content);
      if (!parsedData) {
        results.errors.push(`Could not parse message ${docSnap.id}`);
        continue;
      }

      // ¡Encontramos una venta no reconocida!
      results.newSalesFound++;
      results.sales.push({
        messageId: data.messageId,
        clientName: parsedData.clientName,
        amount: parsedData.amount,
        currency: parsedData.currency,
      });

      // Buscar comprobante asociado
      let proofUrl = '';
      let proofType: 'image' | 'pdf' = 'image';
      const quotedMessageId = data.quotedMessageId || '';

      if (quotedMessageId) {
        const proofsRef = collection(db, 'proofs');
        const proofQuery = query(proofsRef, where('messageId', '==', quotedMessageId));
        const proofSnapshot = await getDocs(proofQuery);

        if (!proofSnapshot.empty) {
          const proofDoc = proofSnapshot.docs[0];
          const proofData = proofDoc.data();
          proofUrl = proofData.mediaUrl;
          proofType = proofData.mediaType === 'image' ? 'image' : 'pdf';

          // Marcar proof como vinculado
          await updateDoc(doc(db, 'proofs', proofDoc.id), { linkedToSale: true });
        }
      }

      // Fallback: buscar proof reciente del mismo sender
      if (!proofUrl) {
        const messageTime = data.timestamp?.toDate?.() || new Date(data.timestamp);
        const tenMinutesBefore = new Date(messageTime.getTime() - 10 * 60 * 1000);

        const proofsRef = collection(db, 'proofs');
        const recentProofQuery = query(
          proofsRef,
          where('senderPhone', '==', data.senderPhone),
          where('linkedToSale', '==', false),
          orderBy('createdAt', 'desc'),
          limit(1)
        );

        try {
          const recentSnapshot = await getDocs(recentProofQuery);
          if (!recentSnapshot.empty) {
            const proofDoc = recentSnapshot.docs[0];
            const proofData = proofDoc.data();
            const proofTime = proofData.timestamp?.toDate?.() || new Date(proofData.timestamp);

            // Solo vincular si el proof es de los últimos 10 minutos antes del mensaje
            if (proofTime >= tenMinutesBefore && proofTime <= messageTime) {
              proofUrl = proofData.mediaUrl;
              proofType = proofData.mediaType === 'image' ? 'image' : 'pdf';
              await updateDoc(doc(db, 'proofs', proofDoc.id), { linkedToSale: true });
            }
          }
        } catch {
          // Índice compuesto faltante, continuar sin proof
        }
      }

      // Crear registro de venta
      const saleData = {
        closerPhone: data.senderPhone,
        closerName: data.senderName,
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
        proofMessageId: quotedMessageId,
        rawMessage: content,
        groupJid: data.groupJid,
        messageId: data.messageId,
        status: 'pending',
        verified: false,
        verifiedAt: null,
        verifiedBy: null,
        createdAt: data.timestamp?.toDate?.() || new Date(data.timestamp),
        updatedAt: new Date(),
      };

      const salesRef = collection(db, 'sales');
      const saleDocRef = await addDoc(salesRef, saleData);

      // Actualizar el mensaje original
      await updateDoc(doc(db, 'messages', docSnap.id), {
        'classification.isSale': true,
        'classification.saleId': saleDocRef.id,
        parsedSale: {
          clientName: parsedData.clientName,
          amount: parsedData.amount,
          currency: parsedData.currency,
          product: parsedData.product,
          paymentType: parsedData.paymentType,
          status: 'pending',
        },
      });

      // Actualizar stats del closer
      await updateCloserStats(data.senderPhone, data.senderName, parsedData.amount, parsedData.currency);
    }

    return NextResponse.json({
      status: 'success',
      ...results,
    });
  } catch (error) {
    console.error('Error reprocessing:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}

async function updateCloserStats(phone: string, name: string, amount: number, currency: string) {
  const closersRef = collection(db, 'closers');
  const q = query(closersRef, where('phone', '==', phone));
  const snapshot = await getDocs(q);

  let amountUsd = amount;
  if (currency === 'ARS') {
    amountUsd = amount / 1000;
  } else if (currency === 'EUR') {
    amountUsd = amount * 1.1;
  }

  if (snapshot.empty) {
    await addDoc(closersRef, {
      phone,
      name,
      totalSales: 1,
      totalAmount: amountUsd,
      lastSaleAt: new Date(),
      createdAt: new Date(),
    });
  } else {
    const closerDoc = snapshot.docs[0];
    await updateDoc(doc(db, 'closers', closerDoc.id), {
      name,
      totalSales: increment(1),
      totalAmount: increment(amountUsd),
      lastSaleAt: new Date(),
    });
  }
}

// GET para verificar estado
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'POST to this endpoint to reprocess messages and detect unrecognized sales',
  });
}
