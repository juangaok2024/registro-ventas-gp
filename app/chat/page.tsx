// app/chat/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, isToday, isYesterday, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MessageSquare,
  Tag,
  Image as ImageIcon,
  RefreshCw,
  ArrowLeft,
  ChevronDown,
  Loader2,
  DollarSign,
  Receipt,
  Calendar as CalendarIcon,
  X
} from 'lucide-react';
import { MessageBubble } from '@/components/MessageBubble';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
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

      // Asegurar que messages siempre sea un array
      const newMessages = Array.isArray(data.messages) ? data.messages : [];

      if (append) {
        setMessages(prev => [...prev, ...newMessages]);
      } else {
        setMessages(newMessages);
      }

      setQuotedMessages(prev => ({ ...prev, ...(data.quotedMessages || {}) }));
      setHasMore(data.hasMore ?? false);
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

  // Filter messages by date if dateFilter is set
  const filteredByDateMessages = dateFilter
    ? messages.filter(m => {
        const msgDate = new Date(m.timestamp);
        return isSameDay(msgDate, dateFilter);
      })
    : messages;

  // Group messages by date - NEWEST FIRST
  const groupedMessages: { date: Date; messages: ChatMessage[] }[] = [];
  let currentGroup: { date: Date; messages: ChatMessage[] } | null = null;

  // Sort messages by timestamp descending (newest first)
  const sortedMessages = [...filteredByDateMessages].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  sortedMessages.forEach(message => {
    const messageDate = new Date(message.timestamp);
    if (!currentGroup || !isSameDay(currentGroup.date, messageDate)) {
      currentGroup = { date: messageDate, messages: [] };
      groupedMessages.push(currentGroup);
    }
    currentGroup.messages.push(message);
  });

  // Groups are already in newest-first order due to sorting above

  const filterLabels: Record<FilterType, { label: string; icon: React.ReactNode }> = {
    all: { label: 'Todos los mensajes', icon: <MessageSquare className="w-4 h-4" /> },
    sales: { label: 'Solo ventas', icon: <Tag className="w-4 h-4" /> },
    proofs: { label: 'Solo comprobantes', icon: <ImageIcon className="w-4 h-4" /> },
  };

  // Stats (excluir reacciones del conteo de mensajes) - use filtered messages
  const visibleMessages = filteredByDateMessages.filter(m => m.type !== 'reaction');
  const totalSales = filteredByDateMessages.filter(m => m.classification.isSale).length;
  const totalProofs = filteredByDateMessages.filter(m => m.classification.isProof).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold">Chat del Grupo</h1>
                {dateFilter && (
                  <p className="text-sm text-muted-foreground">
                    Filtrando: {format(dateFilter, "EEEE, d 'de' MMMM", { locale: es })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Date picker */}
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`flex items-center gap-2 px-3 py-2 h-auto rounded-xl bg-secondary/50 hover:bg-secondary text-sm border-border/50 ${
                      dateFilter ? 'border-primary/50 bg-primary/10' : ''
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {dateFilter ? format(dateFilter, 'd MMM', { locale: es }) : 'Fecha'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={(date) => {
                      setDateFilter(date);
                      setDatePickerOpen(false);
                    }}
                    locale={es}
                    initialFocus
                  />
                  {dateFilter && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setDateFilter(undefined);
                          setDatePickerOpen(false);
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Limpiar filtro
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Filter dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-sm border border-border/50"
                >
                  {filterLabels[filter].icon}
                  <span className="hidden sm:inline">{filterLabels[filter].label}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showFilterMenu && (
                  <Card className="absolute right-0 mt-2 w-52 shadow-xl overflow-hidden animate-fade-in z-50">
                    <CardContent className="p-1">
                      {(Object.keys(filterLabels) as FilterType[]).map(f => (
                        <button
                          key={f}
                          onClick={() => {
                            setFilter(f);
                            setShowFilterMenu(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                            filter === f
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-secondary'
                          }`}
                        >
                          {filterLabels[f].icon}
                          {filterLabels[f].label}
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              <button
                onClick={() => fetchMessages()}
                disabled={loading}
                className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors border border-border/50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/30">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{visibleMessages.length}</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">mensajes</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">{totalSales}</span>
              <span className="text-xs text-primary/70 hidden sm:inline">ventas</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Receipt className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-bold text-emerald-500">{totalProofs}</span>
              <span className="text-xs text-emerald-500/70 hidden sm:inline">comprobantes</span>
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
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No hay mensajes</h2>
                <p className="text-muted-foreground max-w-sm">
                  {filter === 'all'
                    ? 'Los mensajes del grupo aparecerán aquí cuando lleguen'
                    : filter === 'sales'
                    ? 'No se han detectado ventas aún. Las ventas aparecerán cuando los closers envíen el formato de venta.'
                    : 'No hay comprobantes registrados. Los comprobantes se detectan automáticamente cuando se envían imágenes o PDFs.'}
                </p>
              </CardContent>
            </Card>
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
          className="fixed bottom-6 right-6 p-4 bg-primary text-primary-foreground rounded-2xl shadow-2xl hover:bg-primary/90 transition-all hover:scale-105 border border-primary-foreground/10"
          title="Ir al inicio"
        >
          <ChevronDown className="w-5 h-5 rotate-180" />
        </button>
      )}
    </div>
  );
}
