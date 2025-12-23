// app/api/sales/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const closerPhone = searchParams.get('closer');
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');
    
    const salesRef = collection(db, 'sales');
    let q = query(salesRef, orderBy('createdAt', 'desc'), limit(limitParam));
    
    // Filtrar por closer si se especifica
    if (closerPhone) {
      q = query(salesRef, where('closerPhone', '==', closerPhone), orderBy('createdAt', 'desc'), limit(limitParam));
    }
    
    // Filtrar por fecha si se especifica
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      q = query(salesRef, where('createdAt', '>=', Timestamp.fromDate(fromDate)), orderBy('createdAt', 'desc'), limit(limitParam));
    }
    
    const snapshot = await getDocs(q);
    
    const sales = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
    }));
    
    return NextResponse.json({ sales, count: sales.length });
    
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
