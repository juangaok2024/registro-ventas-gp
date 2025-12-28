// app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  startAfter,
  Timestamp
} from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const filter = searchParams.get('filter') || 'all'; // all, sales, proofs
    const lastTimestamp = searchParams.get('lastTimestamp');

    const messagesRef = collection(db, 'messages');

    // Build query
    let q = query(messagesRef, orderBy('timestamp', 'desc'), limit(limitParam));

    // Apply filters
    if (filter === 'sales') {
      q = query(
        messagesRef,
        where('classification.isSale', '==', true),
        orderBy('timestamp', 'desc'),
        limit(limitParam)
      );
    } else if (filter === 'proofs') {
      q = query(
        messagesRef,
        where('classification.isProof', '==', true),
        orderBy('timestamp', 'desc'),
        limit(limitParam)
      );
    }

    // Pagination
    if (lastTimestamp) {
      const lastDate = new Date(lastTimestamp);
      q = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        startAfter(Timestamp.fromDate(lastDate)),
        limit(limitParam)
      );
    }

    const snapshot = await getDocs(q);

    interface MessageDoc {
      id: string;
      messageId: string;
      timestamp: string;
      processedAt: string;
      quotedMessageId?: string;
      [key: string]: unknown;
    }

    const messages: MessageDoc[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        messageId: data.messageId,
        quotedMessageId: data.quotedMessageId,
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
        processedAt: data.processedAt?.toDate?.()?.toISOString() || data.processedAt,
      };
    });

    // Get quoted messages if any
    const quotedMessageIds = messages
      .filter(m => m.quotedMessageId)
      .map(m => m.quotedMessageId) as string[];

    let quotedMessages: Record<string, unknown> = {};
    if (quotedMessageIds.length > 0) {
      // Fetch quoted messages in batches of 10 (Firestore limit for 'in' queries)
      const uniqueIds = Array.from(new Set(quotedMessageIds));
      for (let i = 0; i < uniqueIds.length; i += 10) {
        const batch = uniqueIds.slice(i, i + 10);
        const quotedQuery = query(
          messagesRef,
          where('messageId', 'in', batch)
        );
        const quotedSnapshot = await getDocs(quotedQuery);
        quotedSnapshot.docs.forEach(doc => {
          const data = doc.data();
          quotedMessages[data.messageId] = {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
          };
        });
      }
    }

    return NextResponse.json({
      messages,
      quotedMessages,
      hasMore: messages.length === limitParam,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
