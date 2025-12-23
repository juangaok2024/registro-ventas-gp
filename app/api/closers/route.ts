// app/api/closers/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

export async function GET() {
  try {
    const closersRef = collection(db, 'closers');
    const q = query(closersRef, orderBy('totalAmount', 'desc'));
    
    const snapshot = await getDocs(q);
    
    const closers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastSaleAt: doc.data().lastSaleAt?.toDate?.()?.toISOString() || doc.data().lastSaleAt,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    }));
    
    return NextResponse.json({ closers, count: closers.length });
    
  } catch (error) {
    console.error('Error fetching closers:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
