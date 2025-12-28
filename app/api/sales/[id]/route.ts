// app/api/sales/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const saleId = params.id;

    const saleRef = doc(db, 'sales', saleId);
    const saleSnap = await getDoc(saleRef);

    if (!saleSnap.exists()) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    const data = saleSnap.data();

    const sale = {
      id: saleSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      verifiedAt: data.verifiedAt?.toDate?.()?.toISOString() || data.verifiedAt,
    };

    return NextResponse.json({ sale });

  } catch (error) {
    console.error('Error fetching sale:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
