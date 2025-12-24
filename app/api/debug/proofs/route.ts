// app/api/debug/proofs/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET() {
  try {
    const proofsRef = collection(db, 'proofs');
    const snapshot = await getDocs(proofsRef);

    const proofs = snapshot.docs.map(doc => ({
      id: doc.id,
      messageId: doc.data().messageId,
      senderName: doc.data().senderName,
      linkedToSale: doc.data().linkedToSale,
      mediaUrl: doc.data().mediaUrl?.substring(0, 80) + '...',
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    }));

    return NextResponse.json({
      total: proofs.length,
      linked: proofs.filter(p => p.linkedToSale).length,
      unlinked: proofs.filter(p => !p.linkedToSale).length,
      proofs
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
