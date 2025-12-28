// app/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  RefreshCw,
  Calendar,
  X,
  Check,
  XCircle,
  MessageSquare,
  ArrowUpRight,
  Sparkles,
  Eye,
  MoreHorizontal,
  LogOut
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Sale {
  id: string;
  closerName: string;
  closerPhone: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  amount: number;
  currency: string;
  product: string;
  funnel: string;
  paymentMethod: string;
  paymentType: string;
  extras: string;
  proofUrl: string;
  proofType: 'image' | 'pdf';
  status: 'pending' | 'verified' | 'rejected';
  verified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
  createdAt: string;
}

interface Closer {
  id: string;
  name: string;
  phone: string;
  totalSales: number;
  totalAmount: number;
  lastSaleAt: string;
}

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month';

export default function Dashboard() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [closers, setClosers] = useState<Closer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, closersRes] = await Promise.all([
        fetch('/api/sales?limit=100'),
        fetch('/api/closers')
      ]);

      const salesData = await salesRes.json();
      const closersData = await closersRes.json();

      setSales(salesData.sales || []);
      setClosers(closersData.closers || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleLogout = () => {
    document.cookie = 'auth_token=; path=/; max-age=0';
    router.push('/login');
    router.refresh();
  };

  // Filter sales by date
  const filteredSales = sales.filter(sale => {
    if (dateFilter === 'all') return true;

    const saleDate = new Date(sale.createdAt);
    const now = new Date();

    switch (dateFilter) {
      case 'today':
        return isWithinInterval(saleDate, {
          start: startOfDay(now),
          end: endOfDay(now)
        });
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return isWithinInterval(saleDate, {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday)
        });
      case 'week':
        return isWithinInterval(saleDate, {
          start: startOfDay(subDays(now, 7)),
          end: endOfDay(now)
        });
      case 'month':
        return isWithinInterval(saleDate, {
          start: startOfDay(subDays(now, 30)),
          end: endOfDay(now)
        });
      default:
        return true;
    }
  });

  // Calculate metrics
  const totalSales = filteredSales.length;
  const totalRevenue = filteredSales.reduce((acc, sale) => {
    if (sale.currency === 'USD') return acc + sale.amount;
    if (sale.currency === 'ARS') return acc + (sale.amount / 1000);
    return acc + sale.amount;
  }, 0);
  const pendingSales = filteredSales.filter(s => s.status === 'pending').length;
  const verifiedSales = filteredSales.filter(s => s.status === 'verified').length;
  const verificationRate = totalSales > 0 ? Math.round((verifiedSales / totalSales) * 100) : 0;

  const handleVerify = async (saleId: string, verified: boolean) => {
    setVerifyingId(saleId);
    try {
      const res = await fetch(`/api/sales/${saleId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified, verifiedBy: 'admin' })
      });

      if (res.ok) {
        setSales(prev => prev.map(sale =>
          sale.id === saleId
            ? {
                ...sale,
                verified,
                status: verified ? 'verified' : 'rejected',
                verifiedAt: new Date().toISOString(),
                verifiedBy: 'admin'
              }
            : sale
        ));

        if (selectedSale?.id === saleId) {
          setSelectedSale(prev => prev ? {
            ...prev,
            verified,
            status: verified ? 'verified' : 'rejected',
            verifiedAt: new Date().toISOString(),
            verifiedBy: 'admin'
          } : null);
        }
      }
    } catch (error) {
      console.error('Error verifying sale:', error);
    }
    setVerifyingId(null);
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') return `$${amount.toLocaleString()}`;
    if (currency === 'ARS') return `$${amount.toLocaleString()} ARS`;
    return `EUR${amount.toLocaleString()}`;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Decorative background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
            <div className="max-w-[1600px] mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                    <Sparkles className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">Sales Tracker</h1>
                    <p className="text-sm text-muted-foreground">Factor Studios</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                    <TabsList className="bg-secondary/50">
                      <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
                      <TabsTrigger value="today" className="text-xs">Hoy</TabsTrigger>
                      <TabsTrigger value="week" className="text-xs">7 dias</TabsTrigger>
                      <TabsTrigger value="month" className="text-xs">30 dias</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <Separator orientation="vertical" className="h-8" />

                  <Button variant="outline" size="sm" asChild>
                    <Link href="/chat">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Chat
                    </Link>
                  </Button>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchData}
                        disabled={loading}
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Actualizar datos</TooltipContent>
                  </Tooltip>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                        <LogOut className="w-4 h-4 mr-2" />
                        Cerrar sesion
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-[1600px] mx-auto px-6 py-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Revenue Card - Featured */}
              <Card className="lg:col-span-2 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Revenue Total
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-4xl font-bold tracking-tight">
                        ${totalRevenue.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        USD equivalente
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
                      <ArrowUpRight className="w-4 h-4" />
                      {totalSales} ventas
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Card */}
              <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Pendientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-amber-400">{pendingSales}</p>
                  <p className="text-sm text-muted-foreground mt-1">por verificar</p>
                </CardContent>
              </Card>

              {/* Verified Card */}
              <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Verificadas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-emerald-400">{verifiedSales}</p>
                      <p className="text-sm text-muted-foreground mt-1">{verificationRate}% del total</p>
                    </div>
                  </div>
                  <Progress value={verificationRate} className="h-1.5 mt-3" />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Sales Table */}
              <Card className="xl:col-span-2">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Ultimas Ventas</CardTitle>
                      <CardDescription>{filteredSales.length} registros</CardDescription>
                    </div>
                    {dateFilter !== 'all' && (
                      <Badge variant="secondary" className="font-normal">
                        <Calendar className="w-3 h-3 mr-1" />
                        {dateFilter === 'today' ? 'Hoy' :
                         dateFilter === 'week' ? 'Ultimos 7 dias' :
                         'Ultimos 30 dias'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    {loading ? (
                      <div className="p-6 space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2 flex-1">
                              <Skeleton className="h-4 w-1/3" />
                              <Skeleton className="h-3 w-1/4" />
                            </div>
                            <Skeleton className="h-6 w-20" />
                          </div>
                        ))}
                      </div>
                    ) : filteredSales.length === 0 ? (
                      <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                          <TrendingUp className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">
                          No hay ventas {dateFilter !== 'all' ? 'en este periodo' : 'registradas'}
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[200px]">Cliente</TableHead>
                            <TableHead>Closer</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead className="text-center w-[120px]">Estado</TableHead>
                            <TableHead className="text-right">Fecha</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSales.map((sale) => (
                            <TableRow
                              key={sale.id}
                              className="cursor-pointer group"
                              onClick={() => setSelectedSale(sale)}
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  {sale.proofUrl && (
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      {sale.proofType === 'image'
                                        ? <ImageIcon className="w-4 h-4 text-primary" />
                                        : <FileText className="w-4 h-4 text-primary" />
                                      }
                                    </div>
                                  )}
                                  <span className="font-medium group-hover:text-primary transition-colors">
                                    {sale.clientName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {sale.closerName}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-normal">
                                  {sale.product}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-primary">
                                {formatCurrency(sale.amount, sale.currency)}
                              </TableCell>
                              <TableCell onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  {sale.status === 'pending' ? (
                                    <>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                            onClick={() => handleVerify(sale.id, true)}
                                            disabled={verifyingId === sale.id}
                                          >
                                            <Check className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Verificar</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                            onClick={() => handleVerify(sale.id, false)}
                                            disabled={verifyingId === sale.id}
                                          >
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Rechazar</TooltipContent>
                                      </Tooltip>
                                    </>
                                  ) : (
                                    <StatusBadge status={sale.status} />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(sale.createdAt), {
                                  addSuffix: true,
                                  locale: es
                                })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Closers Leaderboard */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
                    <div>
                      <CardTitle className="text-lg">Ranking Closers</CardTitle>
                      <CardDescription>Top performers</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-3 w-1/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : closers.length === 0 ? (
                    <div className="py-8 text-center">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">Sin datos de closers</p>
                    </div>
                  ) : (
                    closers.map((closer, index) => (
                      <div
                        key={closer.id}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-500/15 to-transparent border border-yellow-500/20' :
                          index === 1 ? 'bg-gradient-to-r from-gray-400/10 to-transparent border border-gray-400/20' :
                          index === 2 ? 'bg-gradient-to-r from-orange-600/10 to-transparent border border-orange-600/20' :
                          'bg-secondary/30 border border-transparent'
                        }`}
                      >
                        <Avatar className={`w-10 h-10 ${
                          index === 0 ? 'ring-2 ring-yellow-500/50' :
                          index === 1 ? 'ring-2 ring-gray-400/50' :
                          index === 2 ? 'ring-2 ring-orange-600/50' : ''
                        }`}>
                          <AvatarFallback className={`font-bold text-lg ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                            index === 1 ? 'bg-gray-400/20 text-gray-300' :
                            index === 2 ? 'bg-orange-600/20 text-orange-400' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{closer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {closer.totalSales} venta{closer.totalSales !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-primary">
                            ${closer.totalAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>

        {/* Sale Detail Modal */}
        <SaleDetailDialog
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onVerify={handleVerify}
          verifyingId={verifyingId}
        />
      </div>
    </TooltipProvider>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'verified' | 'rejected' }) {
  const config = {
    verified: {
      label: 'Verificada',
      className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
      icon: CheckCircle2
    },
    pending: {
      label: 'Pendiente',
      className: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
      icon: Clock
    },
    rejected: {
      label: 'Rechazada',
      className: 'bg-red-500/15 text-red-400 border-red-500/25',
      icon: XCircle
    },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <Badge variant="outline" className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

function SaleDetailDialog({ sale, onClose, onVerify, verifyingId }: {
  sale: Sale | null;
  onClose: () => void;
  onVerify: (saleId: string, verified: boolean) => void;
  verifyingId: string | null;
}) {
  if (!sale) return null;

  return (
    <Dialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden p-0">
        <ScrollArea className="max-h-[90vh]">
          {/* Proof Preview */}
          {sale.proofUrl && (
            <div className="relative">
              {sale.proofType === 'image' ? (
                <img
                  src={sale.proofUrl}
                  alt="Comprobante"
                  className="w-full h-52 object-cover"
                />
              ) : (
                <a
                  href={sale.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-6 bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Documento PDF</p>
                    <p className="text-sm text-muted-foreground">Click para abrir</p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-muted-foreground" />
                </a>
              )}
              <div className="absolute top-3 right-3">
                <StatusBadge status={sale.status} />
              </div>
            </div>
          )}

          <div className="p-6 space-y-6">
            <DialogHeader className="p-0">
              <DialogTitle className="text-xl">Detalle de Venta</DialogTitle>
            </DialogHeader>

            {/* Amount Highlight */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div>
                <p className="text-sm text-muted-foreground">Monto</p>
                <p className="text-2xl font-bold font-mono text-primary">
                  {sale.currency === 'USD' ? '$' : sale.currency === 'ARS' ? 'ARS $' : 'EUR'}
                  {sale.amount.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-primary/30" />
            </div>

            {/* Client Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cliente
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="Nombre" value={sale.clientName} />
                <InfoField label="Email" value={sale.clientEmail || '-'} />
                <InfoField label="Telefono" value={sale.clientPhone || '-'} />
              </div>
            </div>

            <Separator />

            {/* Sale Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Detalles de Venta
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="Producto" value={sale.product} />
                <InfoField label="Funnel" value={sale.funnel || '-'} />
                <InfoField label="Medio de pago" value={sale.paymentMethod || '-'} />
                <InfoField label="Tipo" value={sale.paymentType || '-'} />
                {sale.extras && (
                  <div className="col-span-2">
                    <InfoField label="Extras" value={sale.extras} />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Closer */}
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {sale.closerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{sale.closerName}</p>
                <p className="text-sm text-muted-foreground">{sale.closerPhone}</p>
              </div>
            </div>

            {/* Actions */}
            {sale.status === 'pending' && (
              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => onVerify(sale.id, true)}
                  disabled={verifyingId === sale.id}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Verificar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-400 border-red-500/20 hover:bg-red-500/10"
                  onClick={() => onVerify(sale.id, false)}
                  disabled={verifyingId === sale.id}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            )}

            {/* Timestamp */}
            <div className="pt-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {format(new Date(sale.createdAt), "d 'de' MMMM, yyyy - HH:mm", { locale: es })}
              </p>
              {sale.verifiedAt && (
                <p className="mt-1 text-xs">
                  Verificada: {format(new Date(sale.verifiedAt), "d MMM, HH:mm", { locale: es })}
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
