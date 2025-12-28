// app/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  MoreHorizontal,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Filter
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  // Pagination state for sales
  const [salesPage, setSalesPage] = useState(1);
  const [salesPerPage, setSalesPerPage] = useState(10);

  // Pagination state for closers
  const [closersPage, setClosersPage] = useState(1);
  const closersPerPage = 5;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, closersRes] = await Promise.all([
        fetch('/api/sales?limit=500'),
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
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
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
  }, [sales, dateFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setSalesPage(1);
  }, [dateFilter]);

  // Paginated sales
  const paginatedSales = useMemo(() => {
    const start = (salesPage - 1) * salesPerPage;
    return filteredSales.slice(start, start + salesPerPage);
  }, [filteredSales, salesPage, salesPerPage]);

  const totalSalesPages = Math.ceil(filteredSales.length / salesPerPage);

  // Paginated closers
  const paginatedClosers = useMemo(() => {
    const start = (closersPage - 1) * closersPerPage;
    return closers.slice(start, start + closersPerPage);
  }, [closers, closersPage]);

  const totalClosersPages = Math.ceil(closers.length / closersPerPage);

  // Calculate metrics
  const totalSalesCount = filteredSales.length;
  const totalRevenue = filteredSales.reduce((acc, sale) => {
    if (sale.currency === 'USD') return acc + sale.amount;
    if (sale.currency === 'ARS') return acc + (sale.amount / 1000);
    return acc + sale.amount;
  }, 0);
  const pendingSales = filteredSales.filter(s => s.status === 'pending').length;
  const verifiedSales = filteredSales.filter(s => s.status === 'verified').length;
  const verificationRate = totalSalesCount > 0 ? Math.round((verifiedSales / totalSalesCount) * 100) : 0;

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
      <div className="min-h-screen bg-[#0a0a0b]">
        {/* Subtle gradient background */}
        <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5 pointer-events-none" />

        <div className="relative z-10">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
            <div className="max-w-[1800px] mx-auto px-4 lg:px-8 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-base font-semibold text-white">Sales Tracker</h1>
                    <p className="text-xs text-white/50">Factor Studios</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                    <TabsList className="h-8 bg-white/5 border border-white/10">
                      <TabsTrigger value="all" className="text-xs h-6 px-2.5">Todas</TabsTrigger>
                      <TabsTrigger value="today" className="text-xs h-6 px-2.5">Hoy</TabsTrigger>
                      <TabsTrigger value="week" className="text-xs h-6 px-2.5">7d</TabsTrigger>
                      <TabsTrigger value="month" className="text-xs h-6 px-2.5">30d</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="hidden sm:flex items-center gap-2">
                    <Separator orientation="vertical" className="h-6 bg-white/10" />

                    <Button variant="ghost" size="sm" className="h-8 text-white/70 hover:text-white hover:bg-white/5" asChild>
                      <Link href="/chat">
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        Chat
                      </Link>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/5"
                      onClick={fetchData}
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/5">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#141416] border-white/10">
                        <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-400 focus:bg-red-500/10">
                          <LogOut className="w-4 h-4 mr-2" />
                          Cerrar sesion
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-[1800px] mx-auto px-4 lg:px-8 py-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {/* Revenue Card */}
              <Card className="col-span-2 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 overflow-hidden">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-emerald-400/80 uppercase tracking-wider mb-1">
                        Revenue Total
                      </p>
                      <p className="text-2xl lg:text-4xl font-bold text-white tracking-tight">
                        ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-white/40 mt-1">USD equivalente</p>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                      <ArrowUpRight className="w-3 h-3" />
                      {totalSalesCount} ventas
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Card */}
              <Card className="bg-[#141416] border-white/5 hover:border-amber-500/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Pendientes</span>
                  </div>
                  <p className="text-2xl lg:text-3xl font-bold text-amber-400">{pendingSales}</p>
                  <p className="text-xs text-white/30 mt-1">por verificar</p>
                </CardContent>
              </Card>

              {/* Verified Card */}
              <Card className="bg-[#141416] border-white/5 hover:border-emerald-500/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Verificadas</span>
                  </div>
                  <p className="text-2xl lg:text-3xl font-bold text-emerald-400">{verifiedSales}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Progress value={verificationRate} className="h-1 flex-1 bg-white/5" />
                    <span className="text-xs text-white/40">{verificationRate}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Sales Table */}
              <Card className="xl:col-span-3 bg-[#141416] border-white/5">
                <CardHeader className="p-4 pb-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-semibold text-white">Ventas</CardTitle>
                      <CardDescription className="text-white/40">
                        {filteredSales.length} registros en total
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40">Mostrar:</span>
                      <Select
                        value={salesPerPage.toString()}
                        onValueChange={(v) => {
                          setSalesPerPage(Number(v));
                          setSalesPage(1);
                        }}
                      >
                        <SelectTrigger className="w-[70px] h-8 text-xs bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1c] border-white/10">
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 mt-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/5 hover:bg-transparent">
                          <TableHead className="text-white/50 font-medium text-xs w-[180px]">Cliente</TableHead>
                          <TableHead className="text-white/50 font-medium text-xs w-[140px]">Closer</TableHead>
                          <TableHead className="text-white/50 font-medium text-xs w-[120px]">Producto</TableHead>
                          <TableHead className="text-white/50 font-medium text-xs text-right w-[100px]">Monto</TableHead>
                          <TableHead className="text-white/50 font-medium text-xs text-center w-[100px]">Estado</TableHead>
                          <TableHead className="text-white/50 font-medium text-xs text-right w-[120px]">Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          [...Array(salesPerPage)].map((_, i) => (
                            <TableRow key={i} className="border-white/5">
                              <TableCell><Skeleton className="h-4 w-32 bg-white/5" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-24 bg-white/5" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-16 bg-white/5" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-16 ml-auto bg-white/5" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-20 mx-auto bg-white/5" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-20 ml-auto bg-white/5" /></TableCell>
                            </TableRow>
                          ))
                        ) : paginatedSales.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center">
                              <div className="flex flex-col items-center justify-center text-white/30">
                                <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
                                <p>No hay ventas {dateFilter !== 'all' ? 'en este periodo' : ''}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedSales.map((sale) => (
                            <TableRow
                              key={sale.id}
                              className="border-white/5 cursor-pointer hover:bg-white/[0.02] group"
                              onClick={() => setSelectedSale(sale)}
                            >
                              <TableCell className="py-3">
                                <div className="flex items-center gap-2">
                                  {sale.proofUrl ? (
                                    <div className="w-7 h-7 rounded bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                      {sale.proofType === 'image'
                                        ? <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                                        : <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                      }
                                    </div>
                                  ) : (
                                    <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs text-white/30">-</span>
                                    </div>
                                  )}
                                  <span className="text-sm font-medium text-white/90 truncate max-w-[120px] group-hover:text-emerald-400 transition-colors">
                                    {sale.clientName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-white/50 truncate max-w-[140px]">
                                {sale.closerName}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs font-normal border-white/10 text-white/60 bg-white/5">
                                  {sale.product}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-sm font-semibold text-emerald-400 font-mono">
                                  {formatCurrency(sale.amount, sale.currency)}
                                </span>
                              </TableCell>
                              <TableCell onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-0.5">
                                  {sale.status === 'pending' ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                        onClick={() => handleVerify(sale.id, true)}
                                        disabled={verifyingId === sale.id}
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        onClick={() => handleVerify(sale.id, false)}
                                        disabled={verifyingId === sale.id}
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </Button>
                                    </>
                                  ) : (
                                    <StatusBadge status={sale.status} />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-xs text-white/40">
                                {formatDistanceToNow(new Date(sale.createdAt), {
                                  addSuffix: true,
                                  locale: es
                                })}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {!loading && filteredSales.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                      <p className="text-xs text-white/40">
                        Mostrando {((salesPage - 1) * salesPerPage) + 1} - {Math.min(salesPage * salesPerPage, filteredSales.length)} de {filteredSales.length}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/5"
                          onClick={() => setSalesPage(1)}
                          disabled={salesPage === 1}
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/5"
                          onClick={() => setSalesPage(p => Math.max(1, p - 1))}
                          disabled={salesPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="px-3 text-xs text-white/60">
                          {salesPage} / {totalSalesPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/5"
                          onClick={() => setSalesPage(p => Math.min(totalSalesPages, p + 1))}
                          disabled={salesPage === totalSalesPages}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/5"
                          onClick={() => setSalesPage(totalSalesPages)}
                          disabled={salesPage === totalSalesPages}
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Closers Leaderboard */}
              <Card className="bg-[#141416] border-white/5">
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏆</span>
                    <div>
                      <CardTitle className="text-base font-semibold text-white">Ranking</CardTitle>
                      <CardDescription className="text-white/40 text-xs">{closers.length} closers</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  {loading ? (
                    [...Array(closersPerPage)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2">
                        <Skeleton className="h-9 w-9 rounded-full bg-white/5" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-24 bg-white/5" />
                          <Skeleton className="h-2 w-16 bg-white/5" />
                        </div>
                        <Skeleton className="h-4 w-16 bg-white/5" />
                      </div>
                    ))
                  ) : closers.length === 0 ? (
                    <div className="py-8 text-center">
                      <Users className="w-10 h-10 mx-auto text-white/20 mb-2" />
                      <p className="text-white/30 text-sm">Sin datos</p>
                    </div>
                  ) : (
                    <>
                      {paginatedClosers.map((closer, index) => {
                        const globalIndex = (closersPage - 1) * closersPerPage + index;
                        return (
                          <div
                            key={closer.id}
                            className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                              globalIndex === 0 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20' :
                              globalIndex === 1 ? 'bg-gradient-to-r from-gray-400/10 to-transparent border border-gray-400/20' :
                              globalIndex === 2 ? 'bg-gradient-to-r from-orange-600/10 to-transparent border border-orange-600/20' :
                              'bg-white/[0.02] border border-transparent hover:border-white/5'
                            }`}
                          >
                            <Avatar className={`w-9 h-9 ${
                              globalIndex === 0 ? 'ring-2 ring-yellow-500/50' :
                              globalIndex === 1 ? 'ring-2 ring-gray-400/50' :
                              globalIndex === 2 ? 'ring-2 ring-orange-500/50' : ''
                            }`}>
                              <AvatarFallback className={`text-sm font-bold ${
                                globalIndex === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                globalIndex === 1 ? 'bg-gray-400/20 text-gray-300' :
                                globalIndex === 2 ? 'bg-orange-500/20 text-orange-400' :
                                'bg-white/10 text-white/50'
                              }`}>
                                {globalIndex === 0 ? '🥇' : globalIndex === 1 ? '🥈' : globalIndex === 2 ? '🥉' : globalIndex + 1}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white/90 truncate">{closer.name}</p>
                              <p className="text-xs text-white/40">{closer.totalSales} venta{closer.totalSales !== 1 ? 's' : ''}</p>
                            </div>
                            <p className="text-sm font-bold text-emerald-400 font-mono">
                              ${closer.totalAmount.toLocaleString()}
                            </p>
                          </div>
                        );
                      })}

                      {/* Closers Pagination */}
                      {totalClosersPages > 1 && (
                        <div className="flex items-center justify-center gap-1 pt-2 mt-2 border-t border-white/5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/5"
                            onClick={() => setClosersPage(p => Math.max(1, p - 1))}
                            disabled={closersPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="px-2 text-xs text-white/40">
                            {closersPage} / {totalClosersPages}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/5"
                            onClick={() => setClosersPage(p => Math.min(totalClosersPages, p + 1))}
                            disabled={closersPage === totalClosersPages}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </>
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
      label: 'OK',
      className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2
    },
    pending: {
      label: 'Pend.',
      className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      icon: Clock
    },
    rejected: {
      label: 'Rech.',
      className: 'bg-red-500/15 text-red-400 border-red-500/30',
      icon: XCircle
    },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${className}`}>
      <Icon className="w-3 h-3 mr-0.5" />
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden p-0 bg-[#141416] border-white/10">
        <ScrollArea className="max-h-[90vh]">
          {sale.proofUrl && (
            <div className="relative">
              {sale.proofType === 'image' ? (
                <img
                  src={sale.proofUrl}
                  alt="Comprobante"
                  className="w-full h-48 object-cover"
                />
              ) : (
                <a
                  href={sale.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-5 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Documento PDF</p>
                    <p className="text-xs text-white/50">Click para abrir</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/40" />
                </a>
              )}
              <div className="absolute top-3 right-3">
                <StatusBadge status={sale.status} />
              </div>
            </div>
          )}

          <div className="p-5 space-y-5">
            <DialogHeader className="p-0">
              <DialogTitle className="text-lg text-white">Detalle de Venta</DialogTitle>
            </DialogHeader>

            {/* Amount */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div>
                <p className="text-xs text-white/50">Monto</p>
                <p className="text-xl font-bold font-mono text-emerald-400">
                  {sale.currency === 'USD' ? '$' : sale.currency === 'ARS' ? 'ARS $' : 'EUR'}
                  {sale.amount.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-500/30" />
            </div>

            {/* Client */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Cliente</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoField label="Nombre" value={sale.clientName} />
                <InfoField label="Email" value={sale.clientEmail || '-'} />
                <InfoField label="Telefono" value={sale.clientPhone || '-'} />
              </div>
            </div>

            <Separator className="bg-white/5" />

            {/* Sale Details */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Detalles</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoField label="Producto" value={sale.product} />
                <InfoField label="Funnel" value={sale.funnel || '-'} />
                <InfoField label="Medio" value={sale.paymentMethod || '-'} />
                <InfoField label="Tipo" value={sale.paymentType || '-'} />
              </div>
            </div>

            <Separator className="bg-white/5" />

            {/* Closer */}
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                  {sale.closerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-white">{sale.closerName}</p>
                <p className="text-xs text-white/40">{sale.closerPhone}</p>
              </div>
            </div>

            {/* Actions */}
            {sale.status === 'pending' && (
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onVerify(sale.id, true)}
                  disabled={verifyingId === sale.id}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Verificar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-400 border-red-500/20 hover:bg-red-500/10"
                  onClick={() => onVerify(sale.id, false)}
                  disabled={verifyingId === sale.id}
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Rechazar
                </Button>
              </div>
            )}

            {/* Timestamp */}
            <div className="pt-2 text-xs text-white/40">
              <p className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(sale.createdAt), "d 'de' MMMM, yyyy - HH:mm", { locale: es })}
              </p>
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
      <p className="text-[10px] text-white/40">{label}</p>
      <p className="text-sm text-white/80 truncate">{value}</p>
    </div>
  );
}
