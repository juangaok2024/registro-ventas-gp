// app/api/debug/timing/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET() {
  try {
    // La venta de GRAMAJO
    const salesRef = collection(db, 'sales');
    const salesSnapshot = await getDocs(salesRef);
    const gramajo = salesSnapshot.docs.find(d => d.data().clientName?.includes('GRAMAJO'));

    if (!gramajo) {
      return NextResponse.json({ error: 'No se encontró GRAMAJO' });
    }

    const saleData = gramajo.data();
    const proofMessageId = saleData.proofMessageId;

    // Buscar el proof correspondiente
    const proofsRef = collection(db, 'proofs');
    const proofsSnapshot = await getDocs(proofsRef);
    const matchingProof = proofsSnapshot.docs.find(d => d.data().messageId === proofMessageId);

    return NextResponse.json({
      sale: {
        id: gramajo.id,
        clientName: saleData.clientName,
        proofMessageId: saleData.proofMessageId,
        proofUrl: saleData.proofUrl || 'EMPTY',
        createdAt: saleData.createdAt?.toDate?.()?.toISOString(),
        messageId: saleData.messageId,
      },
      proof: matchingProof ? {
        id: matchingProof.id,
        messageId: matchingProof.data().messageId,
        mediaUrl: matchingProof.data().mediaUrl?.substring(0, 100),
        createdAt: matchingProof.data().createdAt?.toDate?.()?.toISOString(),
        linkedToSale: matchingProof.data().linkedToSale,
      } : null,
      timing: matchingProof ? {
        saleTime: saleData.createdAt?.toDate?.()?.toISOString(),
        proofTime: matchingProof.data().createdAt?.toDate?.()?.toISOString(),
        proofArrivedFirst: new Date(matchingProof.data().createdAt?.toDate?.()) < new Date(saleData.createdAt?.toDate?.()),
      } : null,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
