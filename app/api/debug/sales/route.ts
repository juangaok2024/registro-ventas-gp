// app/api/debug/sales/route.ts
// Endpoint temporal para debug - ver TODAS las ventas sin filtros
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET() {
  try {
    const salesRef = collection(db, 'sales');
    const snapshot = await getDocs(salesRef); // Sin orderBy ni limit

    const sales = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        clientName: data.clientName,
        amount: data.amount,
        createdAt: data.createdAt,
        createdAtType: typeof data.createdAt,
        hasToDate: typeof data.createdAt?.toDate === 'function',
        closerName: data.closerName,
      };
    });

    return NextResponse.json({
      total: sales.length,
      sales
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
