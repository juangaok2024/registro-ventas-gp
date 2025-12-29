// app/api/audit-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const entityType = searchParams.get('entityType');
    const action = searchParams.get('action');

    let q = query(
      collection(db, 'audit_logs'),
      orderBy('createdAt', 'desc'),
      limit(Math.min(limitParam, 200))
    );

    const snapshot = await getDocs(q);

    let logs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        previousStatus: data.previousStatus,
        newStatus: data.newStatus,
        performedBy: data.performedBy,
        entityData: data.entityData,
        bulkOperation: data.bulkOperation || false,
        totalInBatch: data.totalInBatch,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      };
    });

    // Filter in memory if needed (Firestore doesn't allow combining orderBy with where on different fields without index)
    if (entityType) {
      logs = logs.filter(log => log.entityType === entityType);
    }
    if (action) {
      logs = logs.filter(log => log.action === action);
    }

    return NextResponse.json({
      logs,
      count: logs.length,
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
