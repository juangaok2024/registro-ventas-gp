// app/chat/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
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
  X,
  TrendingUp,
  Users
} from 'lucide-react';
import { MessageBubble } from '@/components/MessageBubble';
import { Card, CardContent } from '@/components/ui/card';
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

// Generate unique colors for closers
const CLOSER_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

function getCloserColor(index: number): string {
  return CLOSER_COLORS[index % CLOSER_COLORS.length];
}

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
  const [selectedCloser, setSelectedCloser] = useState<string | null>(null);
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
    router.push(`/?saleId=${saleId}`);
  };

  const formatDateHeader = (date: Date) => {
    if (isToday(date)) return 'Hoy';
    if (isYesterday(date)) return 'Ayer';
    return format(date, "EEEE, d 'de' MMMM", { locale: es });
  };

  // Get unique closers from sales
  const closers = useMemo(() => {
    const closerMap = new Map<string, { name: string; phone: string; count: number; total: number }>();

    messages.forEach(m => {
      if (m.classification.isSale && m.parsedSale) {
        const existing = closerMap.get(m.senderPhone);
        if (existing) {
          existing.count++;
          existing.total += m.parsedSale.amount;
        } else {
          closerMap.set(m.senderPhone, {
            name: m.senderName,
            phone: m.senderPhone,
            count: 1,
            total: m.parsedSale.amount,
          });
        }
      }
    });

    return Array.from(closerMap.entries()).map(([phone, data], index) => ({
      ...data,
      color: getCloserColor(index),
    }));
  }, [messages]);

  // Create closer color map for MessageBubble
  const closerColorMap = useMemo(() => {
    const map = new Map<string, string>();
    closers.forEach(c => map.set(c.phone, c.color));
    return map;
  }, [closers]);

  // Filter messages by date and closer
  const filteredMessages = useMemo(() => {
    let result = messages;

    if (dateFilter) {
      result = result.filter(m => {
        const msgDate = new Date(m.timestamp);
        return isSameDay(msgDate, dateFilter);
      });
    }

    if (selectedCloser) {
      result = result.filter(m => m.senderPhone === selectedCloser);
    }

    return result;
  }, [messages, dateFilter, selectedCloser]);

  // Group messages by date - NEWEST FIRST
  const groupedMessages = useMemo(() => {
    const groups: { date: Date; messages: ChatMessage[] }[] = [];
    let currentGroup: { date: Date; messages: ChatMessage[] } | null = null;

    const sortedMessages = [...filteredMessages].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    sortedMessages.forEach(message => {
      const messageDate = new Date(message.timestamp);
      if (!currentGroup || !isSameDay(currentGroup.date, messageDate)) {
        currentGroup = { date: messageDate, messages: [] };
        groups.push(currentGroup);
      }
      currentGroup.messages.push(message);
    });

    return groups;
  }, [filteredMessages]);

  // Stats - calculated from filtered messages
  const stats = useMemo(() => {
    const salesMessages = filteredMessages.filter(m => m.classification.isSale && m.parsedSale);
    const totalAmount = salesMessages.reduce((sum, m) => sum + (m.parsedSale?.amount || 0), 0);
    const currencySet = new Set(salesMessages.map(m => m.parsedSale?.currency).filter(Boolean));
    const currencies = Array.from(currencySet);

    return {
      messageCount: filteredMessages.filter(m => m.type !== 'reaction').length,
      salesCount: salesMessages.length,
      proofsCount: filteredMessages.filter(m => m.classification.isProof).length,
      totalAmount,
      mainCurrency: currencies[0] || 'USD',
    };
  }, [filteredMessages]);

  const filterLabels: Record<FilterType, { label: string; icon: React.ReactNode }> = {
    all: { label: 'Todos', icon: <MessageSquare className="w-4 h-4" /> },
    sales: { label: 'Ventas', icon: <Tag className="w-4 h-4" /> },
    proofs: { label: 'Comprobantes', icon: <ImageIcon className="w-4 h-4" /> },
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      {/* Grid Background Pattern */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
        {/* Gradient overlays */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      {/* Header - Mini Dashboard */}
      <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 py-4">
          {/* Top Row: Navigation + Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-foreground">Chat del Grupo</h1>
                {(dateFilter || selectedCloser) && (
                  <p className="text-xs text-muted-foreground">
                    {dateFilter && format(dateFilter, "d 'de' MMMM", { locale: es })}
                    {dateFilter && selectedCloser && ' · '}
                    {selectedCloser && closers.find(c => c.phone === selectedCloser)?.name}
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
                    size="sm"
                    className={`h-8 px-3 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 ${
                      dateFilter ? 'border-emerald-500/50 bg-emerald-500/10' : ''
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span className="text-xs">
                      {dateFilter ? format(dateFilter, 'd MMM', { locale: es }) : 'Fecha'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#0f0f11] border-white/10" align="end">
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
                    <div className="p-2 border-t border-white/10">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => {
                          setDateFilter(undefined);
                          setDatePickerOpen(false);
                        }}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Limpiar
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Filter dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="h-8 px-3 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                >
                  {filterLabels[filter].icon}
                  <span className="text-xs ml-2 hidden sm:inline">{filterLabels[filter].label}</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>

                {showFilterMenu && (
                  <Card className="absolute right-0 mt-2 w-44 shadow-2xl overflow-hidden z-50 bg-[#0f0f11] border-white/10">
                    <CardContent className="p-1">
                      {(Object.keys(filterLabels) as FilterType[]).map(f => (
                        <button
                          key={f}
                          onClick={() => {
                            setFilter(f);
                            setShowFilterMenu(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors ${
                            filter === f
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'hover:bg-white/5 text-muted-foreground'
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

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchMessages()}
                disabled={loading}
                className="h-8 w-8 p-0 bg-white/5 border-white/10 hover:bg-white/10"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Total Amount - Hero Stat */}
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400/70 uppercase tracking-wider">
                    Total {dateFilter ? 'del día' : 'en vista'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-emerald-400 tracking-tight">
                    ${stats.totalAmount.toLocaleString()}
                  </span>
                  <span className="text-sm text-emerald-400/60">{stats.mainCurrency}</span>
                </div>
              </div>
              <div className="flex gap-4 text-center">
                <div>
                  <div className="text-xl font-bold font-mono text-foreground">{stats.salesCount}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Ventas</div>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <div className="text-xl font-bold font-mono text-foreground">{stats.proofsCount}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Comprobantes</div>
                </div>
              </div>
            </div>
          </div>

          {/* Closer Filter Chips */}
          {closers.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                <Users className="w-3 h-3" />
                <span>Closers:</span>
              </div>

              {/* All closers chip */}
              <button
                onClick={() => setSelectedCloser(null)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  !selectedCloser
                    ? 'bg-white/10 text-foreground border border-white/20'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10 border border-transparent'
                }`}
              >
                Todos
              </button>

              {closers.map((closer) => (
                <button
                  key={closer.phone}
                  onClick={() => setSelectedCloser(selectedCloser === closer.phone ? null : closer.phone)}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedCloser === closer.phone
                      ? 'text-white border'
                      : 'bg-white/5 text-muted-foreground hover:bg-white/10 border border-transparent'
                  }`}
                  style={{
                    backgroundColor: selectedCloser === closer.phone ? `${closer.color}20` : undefined,
                    borderColor: selectedCloser === closer.phone ? `${closer.color}60` : undefined,
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: closer.color }}
                  />
                  <span>{closer.name}</span>
                  <span className="text-[10px] opacity-60">({closer.count})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Chat Timeline */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <Card className="border-dashed border-white/10 bg-white/[0.02]">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <h2 className="text-lg font-semibold mb-1 text-foreground/80">No hay mensajes</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {filter === 'all'
                    ? 'Los mensajes del grupo aparecerán aquí'
                    : filter === 'sales'
                    ? 'No hay ventas para los filtros seleccionados'
                    : 'No hay comprobantes para los filtros seleccionados'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {groupedMessages.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-4">
                  {/* Date separator */}
                  <div className="sticky top-0 z-10 flex justify-center py-2">
                    <span className="px-4 py-1.5 bg-[#09090b]/90 backdrop-blur-sm rounded-full text-[10px] font-medium text-muted-foreground uppercase tracking-wider border border-white/5">
                      {formatDateHeader(group.date)}
                    </span>
                  </div>

                  {/* Messages for this date */}
                  <div className="space-y-4">
                    {group.messages.map((message, index) => (
                      <div
                        key={message.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
                      >
                        <MessageBubble
                          message={message}
                          quotedMessage={
                            message.quotedMessageId
                              ? quotedMessages[message.quotedMessageId]
                              : null
                          }
                          onSaleClick={handleSaleClick}
                          closerColor={closerColorMap.get(message.senderPhone) || '#10b981'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Load more indicator */}
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                </div>
              )}

              {!hasMore && messages.length > 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground/50">
                  No hay más mensajes
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating scroll to top */}
      {filteredMessages.length > 10 && (
        <button
          onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shadow-2xl hover:bg-emerald-500/30 transition-all hover:scale-105"
          title="Ir al inicio"
        >
          <ChevronDown className="w-5 h-5 rotate-180" />
        </button>
      )}
    </div>
  );
}
