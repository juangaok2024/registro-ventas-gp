// app/api/sales/bulk-verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, writeBatch } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { saleIds, verified, verifiedBy } = await request.json();

    if (!Array.isArray(saleIds) || saleIds.length === 0) {
      return NextResponse.json(
        { error: 'saleIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (typeof verified !== 'boolean') {
      return NextResponse.json(
        { error: 'verified must be a boolean' },
        { status: 400 }
      );
    }

    const newStatus = verified ? 'verified' : 'rejected';
    const now = new Date();
    const performer = verifiedBy || 'admin';

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    // Process each sale
    for (const saleId of saleIds) {
      try {
        const saleRef = doc(db, 'sales', saleId);
        const saleSnap = await getDoc(saleRef);

        if (!saleSnap.exists()) {
          results.failed.push({ id: saleId, error: 'Not found' });
          continue;
        }

        const saleData = saleSnap.data();
        const previousStatus = saleData.status || 'pending';

        // Update the sale
        await updateDoc(saleRef, {
          verified,
          verifiedAt: now,
          verifiedBy: performer,
          status: newStatus,
          updatedAt: now,
        });

        // Create audit log entry
        await addDoc(collection(db, 'audit_logs'), {
          action: verified ? 'bulk_verify' : 'bulk_reject',
          entityType: 'sale',
          entityId: saleId,
          previousStatus,
          newStatus,
          performedBy: performer,
          entityData: {
            clientName: saleData.clientName,
            amount: saleData.amount,
            currency: saleData.currency,
            closerName: saleData.closerName,
          },
          bulkOperation: true,
          totalInBatch: saleIds.length,
          createdAt: now,
        });

        results.success.push(saleId);
      } catch (error) {
        results.failed.push({ id: saleId, error: String(error) });
      }
    }

    console.log(`✅ Bulk ${verified ? 'verify' : 'reject'}: ${results.success.length} success, ${results.failed.length} failed`);

    return NextResponse.json({
      status: 'completed',
      verified,
      newStatus,
      results,
    });

  } catch (error) {
    console.error('Error in bulk verify:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
