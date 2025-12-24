// app/api/debug/linkage/route.ts
// Verifica la vinculación entre ventas y comprobantes
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET() {
  try {
    // Obtener todas las ventas
    const salesRef = collection(db, 'sales');
    const salesSnapshot = await getDocs(salesRef);
    const sales = salesSnapshot.docs.map(doc => ({
      id: doc.id,
      clientName: doc.data().clientName,
      proofMessageId: doc.data().proofMessageId || 'NO_ID',
      proofUrl: doc.data().proofUrl ? 'HAS_URL' : 'NO_URL',
      messageId: doc.data().messageId,
    }));

    // Obtener todos los proofs
    const proofsRef = collection(db, 'proofs');
    const proofsSnapshot = await getDocs(proofsRef);
    const proofs = proofsSnapshot.docs.map(doc => ({
      id: doc.id,
      messageId: doc.data().messageId,
      senderName: doc.data().senderName,
      linkedToSale: doc.data().linkedToSale,
    }));

    // Verificar matches
    const proofMessageIds = new Set(proofs.map(p => p.messageId));

    const analysis = sales.map(sale => {
      const hasMatchingProof = proofMessageIds.has(sale.proofMessageId);
      return {
        ...sale,
        hasMatchingProof,
        proofMessageIdLength: sale.proofMessageId?.length || 0,
      };
    });

    return NextResponse.json({
      salesCount: sales.length,
      proofsCount: proofs.length,
      proofMessageIds: Array.from(proofMessageIds),
      salesAnalysis: analysis,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
