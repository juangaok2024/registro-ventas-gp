// app/chat/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MessageSquare,
  Tag,
  Image as ImageIcon,
  RefreshCw,
  ArrowLeft,
  Filter,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { MessageBubble } from '@/components/MessageBubble';

interface ChatMessage {
  id: string;
  messageId: string;
  timestamp: string;
  senderPhone: string;
  senderName: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'reaction' | 'unknown';
  content: string;
  mediaUrl?: string;
  mimetype?: string;
  quotedMessageId?: string;
  classification: {
    isSale: boolean;
    isProof: boolean;
    saleId?: string;
    proofId?: string;
  };
  parsedSale?: {
    clientName: string;
    amount: number;
    currency: string;
    product: string;
    paymentType: string;
    status: 'pending' | 'verified' | 'rejected';
  };
}

type FilterType = 'all' | 'sales' | 'proofs';

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quotedMessages, setQuotedMessages] = useState<Record<string, ChatMessage>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async (append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const lastTimestamp = append && messages.length > 0
        ? messages[messages.length - 1].timestamp
        : '';

      const params = new URLSearchParams({
        limit: '50',
        filter,
        ...(lastTimestamp && { lastTimestamp }),
      });

      const res = await fetch(`/api/messages?${params}`);
      const data = await res.json();

      if (append) {
        setMessages(prev => [...prev, ...data.messages]);
      } else {
        setMessages(data.messages);
      }

      setQuotedMessages(prev => ({ ...prev, ...data.quotedMessages }));
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }

    setLoading(false);
    setLoadingMore(false);
  }, [filter, messages]);

  useEffect(() => {
    fetchMessages();
  }, [filter]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || loadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      fetchMessages(true);
    }
  }, [fetchMessages, loadingMore, hasMore]);

  const handleSaleClick = (saleId: string) => {
    // Navigate to main dashboard with sale selected
    router.push(`/?saleId=${saleId}`);
  };

  const formatDateHeader = (date: Date) => {
    if (isToday(date)) return 'Hoy';
    if (isYesterday(date)) return 'Ayer';
    return format(date, "EEEE, d 'de' MMMM", { locale: es });
  };

  // Group messages by date
  const groupedMessages: { date: Date; messages: ChatMessage[] }[] = [];
  let currentGroup: { date: Date; messages: ChatMessage[] } | null = null;

  // Reverse to show oldest first within each day, but days in reverse
  const sortedMessages = [...messages].reverse();

  sortedMessages.forEach(message => {
    const messageDate = new Date(message.timestamp);
    if (!currentGroup || !isSameDay(currentGroup.date, messageDate)) {
      currentGroup = { date: messageDate, messages: [] };
      groupedMessages.push(currentGroup);
    }
    currentGroup.messages.push(message);
  });

  // Reverse groups to show newest day first
  groupedMessages.reverse();

  const filterLabels: Record<FilterType, { label: string; icon: React.ReactNode }> = {
    all: { label: 'Todos los mensajes', icon: <MessageSquare className="w-4 h-4" /> },
    sales: { label: 'Solo ventas', icon: <Tag className="w-4 h-4" /> },
    proofs: { label: 'Solo comprobantes', icon: <ImageIcon className="w-4 h-4" /> },
  };

  // Stats
  const totalSales = messages.filter(m => m.classification.isSale).length;
  const totalProofs = messages.filter(m => m.classification.isProof).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold">Chat del Grupo</h1>
                <p className="text-xs text-muted-foreground">
                  {messages.length} mensajes · {totalSales} ventas · {totalProofs} comprobantes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-sm"
                >
                  {filterLabels[filter].icon}
                  <span className="hidden sm:inline">{filterLabels[filter].label}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showFilterMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
                    {(Object.keys(filterLabels) as FilterType[]).map(f => (
                      <button
                        key={f}
                        onClick={() => {
                          setFilter(f);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
                          filter === f
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-secondary'
                        }`}
                      >
                        {filterLabels[f].icon}
                        {filterLabels[f].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => fetchMessages()}
                disabled={loading}
                className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Timeline */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MessageSquare className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No hay mensajes</h2>
              <p className="text-muted-foreground">
                {filter === 'all'
                  ? 'Los mensajes del grupo aparecerán aquí'
                  : filter === 'sales'
                  ? 'No se han detectado ventas aún'
                  : 'No hay comprobantes registrados'}
              </p>
            </div>
          ) : (
            <>
              {groupedMessages.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-4">
                  {/* Date separator */}
                  <div className="sticky top-0 z-10 flex justify-center">
                    <span className="px-4 py-1.5 bg-secondary/80 backdrop-blur-sm rounded-full text-xs font-medium text-muted-foreground capitalize">
                      {formatDateHeader(group.date)}
                    </span>
                  </div>

                  {/* Messages for this date */}
                  <div className="space-y-3">
                    {group.messages.map((message, index) => (
                      <div
                        key={message.id}
                        className={`animate-fade-in`}
                        style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                      >
                        <MessageBubble
                          message={message}
                          quotedMessage={
                            message.quotedMessageId
                              ? quotedMessages[message.quotedMessageId]
                              : null
                          }
                          onSaleClick={handleSaleClick}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Load more indicator */}
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}

              {!hasMore && messages.length > 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No hay más mensajes
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating action - scroll to latest */}
      {messages.length > 10 && (
        <button
          onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
        >
          <ChevronDown className="w-5 h-5 rotate-180" />
        </button>
      )}
    </div>
  );
}
