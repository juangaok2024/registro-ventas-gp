// app/api/sales/[id]/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';

const OUTGOING_WEBHOOK_URL = process.env.OUTGOING_WEBHOOK_URL || '';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { verified, verifiedBy } = await request.json();
    const saleId = params.id;

    if (typeof verified !== 'boolean') {
      return NextResponse.json(
        { error: 'verified must be a boolean' },
        { status: 400 }
      );
    }

    const saleRef = doc(db, 'sales', saleId);
    const saleSnap = await getDoc(saleRef);

    if (!saleSnap.exists()) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    const saleData = saleSnap.data();
    const previousStatus = saleData.status || 'pending';
    const newStatus = verified ? 'verified' : 'rejected';

    await updateDoc(saleRef, {
      verified,
      verifiedAt: new Date(),
      verifiedBy: verifiedBy || 'admin',
      status: newStatus,
      updatedAt: new Date(),
    });

    // Create audit log entry
    await addDoc(collection(db, 'audit_logs'), {
      action: verified ? 'verify' : 'reject',
      entityType: 'sale',
      entityId: saleId,
      previousStatus,
      newStatus,
      performedBy: verifiedBy || 'admin',
      entityData: {
        clientName: saleData.clientName,
        amount: saleData.amount,
        currency: saleData.currency,
        closerName: saleData.closerName,
      },
      createdAt: new Date(),
    });

    console.log(`✅ Venta ${saleId} ${verified ? 'verificada' : 'rechazada'}`);

    // Enviar webhook de salida si está configurado y la venta fue verificada
    if (OUTGOING_WEBHOOK_URL && verified) {
      try {
        await fetch(OUTGOING_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'sale_verified',
            saleId,
            data: {
              client: saleData.clientName,
              clientEmail: saleData.clientEmail,
              clientPhone: saleData.clientPhone,
              amount: saleData.amount,
              currency: saleData.currency,
              product: saleData.product,
              closer: saleData.closerName,
              closerPhone: saleData.closerPhone,
              proofUrl: saleData.proofUrl,
              verifiedAt: new Date().toISOString(),
              verifiedBy: verifiedBy || 'admin',
            }
          })
        });
        console.log('🔔 Webhook de verificación enviado');
      } catch (e) {
        console.error('Error enviando webhook de verificación:', e);
      }
    }

    return NextResponse.json({
      status: 'success',
      saleId,
      verified,
      newStatus,
    });

  } catch (error) {
    console.error('Error verificando venta:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
