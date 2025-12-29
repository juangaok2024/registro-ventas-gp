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
  Download,
  Sun,
  Moon,
  AlertTriangle,
  History,
  BarChart3,
  CheckSquare,
  Square,
  Loader2,
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
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { SalesChart } from '@/components/SalesChart';
import { ImageViewer } from '@/components/ImageViewer';
import { useTheme } from '@/contexts/ThemeContext';
import { formatCurrency, formatNumber } from '@/lib/format';
import { exportSalesToCSV } from '@/lib/export';

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

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  previousStatus: string;
  newStatus: string;
  performedBy: string;
  entityData: {
    clientName: string;
    amount: number;
    currency: string;
    closerName: string;
  };
  bulkOperation: boolean;
  createdAt: string;
}

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month';

export default function Dashboard() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [sales, setSales] = useState<Sale[]>([]);
  const [closers, setClosers] = useState<Closer[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [showCharts, setShowCharts] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);

  // Bulk selection state
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
  const [bulkVerifying, setBulkVerifying] = useState(false);

  // Image viewer state
  const [viewerImage, setViewerImage] = useState<string | null>(null);

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

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/audit-logs?limit=50');
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
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

  // Detect potential duplicates (same amount + similar time from same closer)
  const duplicateSuspects = useMemo(() => {
    const suspects = new Set<string>();
    const recentSales = filteredSales.slice(0, 100);

    for (let i = 0; i < recentSales.length; i++) {
      for (let j = i + 1; j < recentSales.length; j++) {
        const saleA = recentSales[i];
        const saleB = recentSales[j];

        // Same closer, same amount, within 10 minutes
        if (
          saleA.closerPhone === saleB.closerPhone &&
          saleA.amount === saleB.amount &&
          saleA.currency === saleB.currency
        ) {
          const timeDiff = Math.abs(
            new Date(saleA.createdAt).getTime() - new Date(saleB.createdAt).getTime()
          );
          if (timeDiff < 10 * 60 * 1000) { // 10 minutes
            suspects.add(saleA.id);
            suspects.add(saleB.id);
          }
        }
      }
    }

    return suspects;
  }, [filteredSales]);

  // Reset page when filter changes
  useEffect(() => {
    setSalesPage(1);
    setSelectedSales(new Set());
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

  // Selection helpers
  const pendingSalesInPage = paginatedSales.filter(s => s.status === 'pending');
  const allPendingSelected = pendingSalesInPage.length > 0 &&
    pendingSalesInPage.every(s => selectedSales.has(s.id));
  const somePendingSelected = pendingSalesInPage.some(s => selectedSales.has(s.id));

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      // Deselect all pending in page
      const newSelected = new Set(selectedSales);
      pendingSalesInPage.forEach(s => newSelected.delete(s.id));
      setSelectedSales(newSelected);
    } else {
      // Select all pending in page
      const newSelected = new Set(selectedSales);
      pendingSalesInPage.forEach(s => newSelected.add(s.id));
      setSelectedSales(newSelected);
    }
  };

  const toggleSelect = (saleId: string) => {
    const newSelected = new Set(selectedSales);
    if (newSelected.has(saleId)) {
      newSelected.delete(saleId);
    } else {
      newSelected.add(saleId);
    }
    setSelectedSales(newSelected);
  };

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

        // Remove from selection
        const newSelected = new Set(selectedSales);
        newSelected.delete(saleId);
        setSelectedSales(newSelected);
      }
    } catch (error) {
      console.error('Error verifying sale:', error);
    }
    setVerifyingId(null);
  };

  const handleBulkVerify = async (verified: boolean) => {
    if (selectedSales.size === 0) return;

    setBulkVerifying(true);
    try {
      const res = await fetch('/api/sales/bulk-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleIds: Array.from(selectedSales),
          verified,
          verifiedBy: 'admin'
        })
      });

      if (res.ok) {
        const result = await res.json();

        // Update local state
        setSales(prev => prev.map(sale => {
          if (result.results.success.includes(sale.id)) {
            return {
              ...sale,
              verified,
              status: verified ? 'verified' : 'rejected',
              verifiedAt: new Date().toISOString(),
              verifiedBy: 'admin'
            };
          }
          return sale;
        }));

        // Clear selection
        setSelectedSales(new Set());
      }
    } catch (error) {
      console.error('Error bulk verifying:', error);
    }
    setBulkVerifying(false);
  };

  const handleExport = () => {
    exportSalesToCSV(filteredSales, 'ventas');
  };

  // Theme-aware colors
  const bgMain = theme === 'dark' ? 'bg-[#0a0a0b]' : 'bg-gray-50';
  const bgCard = theme === 'dark' ? 'bg-[#141416]' : 'bg-white';
  const borderColor = theme === 'dark' ? 'border-white/5' : 'border-gray-200';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-white/50' : 'text-gray-500';
  const textMuted = theme === 'dark' ? 'text-white/40' : 'text-gray-400';

  return (
    <TooltipProvider>
      <div className={`min-h-screen ${bgMain}`}>
        {/* Subtle gradient background */}
        <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5 pointer-events-none" />

        <div className="relative z-10">
          {/* Header */}
          <header className={`sticky top-0 z-40 border-b ${borderColor} ${bgMain}/80 backdrop-blur-xl`}>
            <div className="max-w-[1800px] mx-auto px-4 lg:px-8 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className={`text-base font-semibold ${textPrimary}`}>Sales Tracker</h1>
                    <p className={`text-xs ${textSecondary}`}>Factor Studios</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                    <TabsList className={`h-8 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'} border ${borderColor}`}>
                      <TabsTrigger value="all" className="text-xs h-6 px-2.5">Todas</TabsTrigger>
                      <TabsTrigger value="today" className="text-xs h-6 px-2.5">Hoy</TabsTrigger>
                      <TabsTrigger value="week" className="text-xs h-6 px-2.5">7d</TabsTrigger>
                      <TabsTrigger value="month" className="text-xs h-6 px-2.5">30d</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="hidden sm:flex items-center gap-2">
                    <Separator orientation="vertical" className={`h-6 ${borderColor}`} />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${textSecondary} hover:${textPrimary}`}
                          onClick={() => setShowCharts(!showCharts)}
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Gráficos</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${textSecondary} hover:${textPrimary}`}
                          onClick={handleExport}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Exportar CSV</TooltipContent>
                    </Tooltip>

                    <Button variant="ghost" size="sm" className={`h-8 ${textSecondary} hover:${textPrimary}`} asChild>
                      <Link href="/chat">
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        Chat
                      </Link>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${textSecondary} hover:${textPrimary}`}
                      onClick={fetchData}
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className={`h-8 w-8 ${textSecondary} hover:${textPrimary}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className={`${bgCard} ${borderColor}`}>
                        <DropdownMenuItem onClick={toggleTheme}>
                          {theme === 'dark' ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                          {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setShowAuditLog(true); fetchAuditLogs(); }}>
                          <History className="w-4 h-4 mr-2" />
                          Historial
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-400">
                          <LogOut className="w-4 h-4 mr-2" />
                          Cerrar sesión
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-[1800px] mx-auto px-4 lg:px-8 py-6">
            {/* Duplicate Alert */}
            {duplicateSuspects.size > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-400">
                    Posibles duplicados detectados
                  </p>
                  <p className={`text-xs ${textMuted}`}>
                    {duplicateSuspects.size} ventas con montos y tiempos similares del mismo closer
                  </p>
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {/* Revenue Card */}
              <Card className={`col-span-2 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 overflow-hidden`}>
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-emerald-400/80 uppercase tracking-wider mb-1">
                        Revenue Total
                      </p>
                      <p className={`text-2xl lg:text-4xl font-bold ${textPrimary} tracking-tight`}>
                        {formatCurrency(totalRevenue, 'USD')}
                      </p>
                      <p className={`text-xs ${textMuted} mt-1`}>USD equivalente</p>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                      <ArrowUpRight className="w-3 h-3" />
                      {totalSalesCount} ventas
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Card */}
              <Card className={`${bgCard} ${borderColor} hover:border-amber-500/20 transition-colors`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className={`text-xs font-medium ${textSecondary} uppercase tracking-wider`}>Pendientes</span>
                  </div>
                  <p className="text-2xl lg:text-3xl font-bold text-amber-400">{pendingSales}</p>
                  <p className={`text-xs ${textMuted} mt-1`}>por verificar</p>
                </CardContent>
              </Card>

              {/* Verified Card */}
              <Card className={`${bgCard} ${borderColor} hover:border-emerald-500/20 transition-colors`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className={`text-xs font-medium ${textSecondary} uppercase tracking-wider`}>Verificadas</span>
                  </div>
                  <p className="text-2xl lg:text-3xl font-bold text-emerald-400">{verifiedSales}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Progress value={verificationRate} className={`h-1 flex-1 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} />
                    <span className={`text-xs ${textMuted}`}>{verificationRate}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            {showCharts && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <Card className={`lg:col-span-2 ${bgCard} ${borderColor}`}>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className={`text-sm ${textPrimary}`}>Ventas por día</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <SalesChart sales={filteredSales} type="area" height={180} />
                  </CardContent>
                </Card>

                <Card className={`${bgCard} ${borderColor}`}>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className={`text-sm ${textPrimary}`}>Por closer</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <SalesChart sales={filteredSales} type="pie" height={180} />
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Sales Table */}
              <Card className={`xl:col-span-3 ${bgCard} ${borderColor}`}>
                <CardHeader className="p-4 pb-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className={`text-base font-semibold ${textPrimary}`}>Ventas</CardTitle>
                      <CardDescription className={textMuted}>
                        {filteredSales.length} registros en total
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Bulk Actions */}
                      {selectedSales.size > 0 && (
                        <div className="flex items-center gap-2 mr-2">
                          <span className="text-xs text-emerald-400 font-medium">
                            {selectedSales.size} seleccionadas
                          </span>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleBulkVerify(true)}
                            disabled={bulkVerifying}
                          >
                            {bulkVerifying ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <Check className="w-3 h-3 mr-1" />
                            )}
                            Verificar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-red-400 border-red-500/20 hover:bg-red-500/10"
                            onClick={() => handleBulkVerify(false)}
                            disabled={bulkVerifying}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      )}

                      <span className={`text-xs ${textMuted}`}>Mostrar:</span>
                      <Select
                        value={salesPerPage.toString()}
                        onValueChange={(v) => {
                          setSalesPerPage(Number(v));
                          setSalesPage(1);
                        }}
                      >
                        <SelectTrigger className={`w-[70px] h-8 text-xs ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={`${bgCard} ${borderColor}`}>
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
                        <TableRow className={`${borderColor} hover:bg-transparent`}>
                          <TableHead className={`${textSecondary} font-medium text-xs w-[40px]`}>
                            <Checkbox
                              checked={allPendingSelected}
                              onCheckedChange={toggleSelectAll}
                              className="border-white/30"
                            />
                          </TableHead>
                          <TableHead className={`${textSecondary} font-medium text-xs w-[180px]`}>Cliente</TableHead>
                          <TableHead className={`${textSecondary} font-medium text-xs w-[140px] hidden md:table-cell`}>Closer</TableHead>
                          <TableHead className={`${textSecondary} font-medium text-xs w-[120px] hidden lg:table-cell`}>Producto</TableHead>
                          <TableHead className={`${textSecondary} font-medium text-xs text-right w-[100px]`}>Monto</TableHead>
                          <TableHead className={`${textSecondary} font-medium text-xs text-center w-[100px]`}>Estado</TableHead>
                          <TableHead className={`${textSecondary} font-medium text-xs text-right w-[100px] hidden sm:table-cell`}>Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          [...Array(salesPerPage)].map((_, i) => (
                            <TableRow key={i} className={borderColor}>
                              <TableCell><Skeleton className={`h-4 w-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} /></TableCell>
                              <TableCell><Skeleton className={`h-4 w-32 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} /></TableCell>
                              <TableCell className="hidden md:table-cell"><Skeleton className={`h-4 w-24 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} /></TableCell>
                              <TableCell className="hidden lg:table-cell"><Skeleton className={`h-4 w-16 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} /></TableCell>
                              <TableCell><Skeleton className={`h-4 w-16 ml-auto ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} /></TableCell>
                              <TableCell><Skeleton className={`h-6 w-20 mx-auto ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} /></TableCell>
                              <TableCell className="hidden sm:table-cell"><Skeleton className={`h-4 w-20 ml-auto ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} /></TableCell>
                            </TableRow>
                          ))
                        ) : paginatedSales.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-32 text-center">
                              <div className={`flex flex-col items-center justify-center ${textMuted}`}>
                                <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
                                <p>No hay ventas {dateFilter !== 'all' ? 'en este periodo' : ''}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedSales.map((sale) => {
                            const isDuplicate = duplicateSuspects.has(sale.id);
                            return (
                              <TableRow
                                key={sale.id}
                                className={`${borderColor} cursor-pointer hover:bg-white/[0.02] group ${
                                  isDuplicate ? 'bg-amber-500/5' : ''
                                }`}
                                onClick={() => setSelectedSale(sale)}
                              >
                                <TableCell onClick={e => e.stopPropagation()}>
                                  {sale.status === 'pending' && (
                                    <Checkbox
                                      checked={selectedSales.has(sale.id)}
                                      onCheckedChange={() => toggleSelect(sale.id)}
                                      className="border-white/30"
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="py-3">
                                  <div className="flex items-center gap-2">
                                    {isDuplicate && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                        </TooltipTrigger>
                                        <TooltipContent>Posible duplicado</TooltipContent>
                                      </Tooltip>
                                    )}
                                    {sale.proofUrl ? (
                                      <div className="w-7 h-7 rounded bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                        {sale.proofType === 'image'
                                          ? <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                                          : <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                        }
                                      </div>
                                    ) : (
                                      <div className={`w-7 h-7 rounded ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'} flex items-center justify-center flex-shrink-0`}>
                                        <span className={`text-xs ${textMuted}`}>-</span>
                                      </div>
                                    )}
                                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white/90' : 'text-gray-900'} truncate max-w-[120px] group-hover:text-emerald-400 transition-colors`}>
                                      {sale.clientName}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className={`text-sm ${textSecondary} truncate max-w-[140px] hidden md:table-cell`}>
                                  {sale.closerName}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                  <Badge variant="outline" className={`text-xs font-normal ${borderColor} ${textSecondary} ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
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
                                <TableCell className={`text-right text-xs ${textMuted} hidden sm:table-cell`}>
                                  {formatDistanceToNow(new Date(sale.createdAt), {
                                    addSuffix: true,
                                    locale: es
                                  })}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {!loading && filteredSales.length > 0 && (
                    <div className={`flex items-center justify-between px-4 py-3 border-t ${borderColor}`}>
                      <p className={`text-xs ${textMuted}`}>
                        Mostrando {((salesPage - 1) * salesPerPage) + 1} - {Math.min(salesPage * salesPerPage, filteredSales.length)} de {filteredSales.length}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${textSecondary} hover:${textPrimary}`}
                          onClick={() => setSalesPage(1)}
                          disabled={salesPage === 1}
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${textSecondary} hover:${textPrimary}`}
                          onClick={() => setSalesPage(p => Math.max(1, p - 1))}
                          disabled={salesPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className={`px-3 text-xs ${textSecondary}`}>
                          {salesPage} / {totalSalesPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${textSecondary} hover:${textPrimary}`}
                          onClick={() => setSalesPage(p => Math.min(totalSalesPages, p + 1))}
                          disabled={salesPage === totalSalesPages}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${textSecondary} hover:${textPrimary}`}
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
              <Card className={`${bgCard} ${borderColor}`}>
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏆</span>
                    <div>
                      <CardTitle className={`text-base font-semibold ${textPrimary}`}>Ranking</CardTitle>
                      <CardDescription className={`${textMuted} text-xs`}>{closers.length} closers</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  {loading ? (
                    [...Array(closersPerPage)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2">
                        <Skeleton className={`h-9 w-9 rounded-full ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className={`h-3 w-24 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} />
                          <Skeleton className={`h-2 w-16 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} />
                        </div>
                        <Skeleton className={`h-4 w-16 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} />
                      </div>
                    ))
                  ) : closers.length === 0 ? (
                    <div className="py-8 text-center">
                      <Users className={`w-10 h-10 mx-auto ${textMuted} mb-2`} />
                      <p className={`${textMuted} text-sm`}>Sin datos</p>
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
                              `${theme === 'dark' ? 'bg-white/[0.02]' : 'bg-gray-50'} border border-transparent hover:${borderColor}`
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
                                `${theme === 'dark' ? 'bg-white/10 text-white/50' : 'bg-gray-200 text-gray-500'}`
                              }`}>
                                {globalIndex === 0 ? '🥇' : globalIndex === 1 ? '🥈' : globalIndex === 2 ? '🥉' : globalIndex + 1}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/90' : 'text-gray-900'} truncate`}>{closer.name}</p>
                              <p className={`text-xs ${textMuted}`}>{closer.totalSales} venta{closer.totalSales !== 1 ? 's' : ''}</p>
                            </div>
                            <p className="text-sm font-bold text-emerald-400 font-mono">
                              {formatCurrency(closer.totalAmount, 'USD')}
                            </p>
                          </div>
                        );
                      })}

                      {/* Closers Pagination */}
                      {totalClosersPages > 1 && (
                        <div className={`flex items-center justify-center gap-1 pt-2 mt-2 border-t ${borderColor}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 ${textSecondary} hover:${textPrimary}`}
                            onClick={() => setClosersPage(p => Math.max(1, p - 1))}
                            disabled={closersPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className={`px-2 text-xs ${textMuted}`}>
                            {closersPage} / {totalClosersPages}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 ${textSecondary} hover:${textPrimary}`}
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
          theme={theme}
          onViewImage={setViewerImage}
        />

        {/* Audit Log Sheet */}
        <Sheet open={showAuditLog} onOpenChange={setShowAuditLog}>
          <SheetContent className={`${bgCard} ${borderColor} w-full sm:max-w-lg`}>
            <SheetHeader>
              <SheetTitle className={textPrimary}>Historial de Acciones</SheetTitle>
              <SheetDescription className={textSecondary}>
                Registro de verificaciones y rechazos
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-4">
              <div className="space-y-3">
                {auditLogs.map(log => (
                  <div key={log.id} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} border ${borderColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        variant="outline"
                        className={
                          log.action.includes('verify') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                          'bg-red-500/10 text-red-400 border-red-500/30'
                        }
                      >
                        {log.action.includes('verify') ? 'Verificado' : 'Rechazado'}
                        {log.bulkOperation && ' (bulk)'}
                      </Badge>
                      <span className={`text-xs ${textMuted}`}>
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                    <p className={`text-sm ${textPrimary}`}>{log.entityData.clientName}</p>
                    <p className="text-xs text-emerald-400 font-mono">
                      {formatCurrency(log.entityData.amount, log.entityData.currency)}
                    </p>
                    <p className={`text-xs ${textMuted} mt-1`}>
                      Por: {log.performedBy} • Closer: {log.entityData.closerName}
                    </p>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <div className={`py-8 text-center ${textMuted}`}>
                    <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Sin registros de auditoría</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Image Viewer */}
        <ImageViewer
          src={viewerImage || ''}
          isOpen={!!viewerImage}
          onClose={() => setViewerImage(null)}
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

function SaleDetailDialog({ sale, onClose, onVerify, verifyingId, theme, onViewImage }: {
  sale: Sale | null;
  onClose: () => void;
  onVerify: (saleId: string, verified: boolean) => void;
  verifyingId: string | null;
  theme: 'dark' | 'light';
  onViewImage: (url: string) => void;
}) {
  if (!sale) return null;

  const bgCard = theme === 'dark' ? 'bg-[#141416]' : 'bg-white';
  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-gray-200';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-white/50' : 'text-gray-500';
  const textMuted = theme === 'dark' ? 'text-white/40' : 'text-gray-400';

  return (
    <Dialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`max-w-lg max-h-[90vh] overflow-hidden p-0 ${bgCard} ${borderColor}`}>
        <ScrollArea className="max-h-[90vh]">
          {sale.proofUrl && (
            <div className="relative">
              {sale.proofType === 'image' ? (
                <img
                  src={sale.proofUrl}
                  alt="Comprobante"
                  className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onViewImage(sale.proofUrl)}
                />
              ) : (
                <a
                  href={sale.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 p-5 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${textPrimary}`}>Documento PDF</p>
                    <p className={`text-xs ${textSecondary}`}>Click para abrir</p>
                  </div>
                  <ExternalLink className={`w-4 h-4 ${textMuted}`} />
                </a>
              )}
              <div className="absolute top-3 right-3">
                <StatusBadge status={sale.status} />
              </div>
            </div>
          )}

          <div className="p-5 space-y-5">
            <DialogHeader className="p-0">
              <DialogTitle className={`text-lg ${textPrimary}`}>Detalle de Venta</DialogTitle>
            </DialogHeader>

            {/* Amount */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div>
                <p className={textSecondary}>Monto</p>
                <p className="text-xl font-bold font-mono text-emerald-400">
                  {formatCurrency(sale.amount, sale.currency)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-500/30" />
            </div>

            {/* Client */}
            <div className="space-y-2">
              <h4 className={`text-[10px] font-medium ${textMuted} uppercase tracking-wider`}>Cliente</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoField label="Nombre" value={sale.clientName} theme={theme} />
                <InfoField label="Email" value={sale.clientEmail || '-'} theme={theme} />
                <InfoField label="Telefono" value={sale.clientPhone || '-'} theme={theme} />
              </div>
            </div>

            <Separator className={borderColor} />

            {/* Sale Details */}
            <div className="space-y-2">
              <h4 className={`text-[10px] font-medium ${textMuted} uppercase tracking-wider`}>Detalles</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoField label="Producto" value={sale.product} theme={theme} />
                <InfoField label="Funnel" value={sale.funnel || '-'} theme={theme} />
                <InfoField label="Medio" value={sale.paymentMethod || '-'} theme={theme} />
                <InfoField label="Tipo" value={sale.paymentType || '-'} theme={theme} />
              </div>
            </div>

            <Separator className={borderColor} />

            {/* Closer */}
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                  {sale.closerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className={`text-sm font-medium ${textPrimary}`}>{sale.closerName}</p>
                <p className={`text-xs ${textMuted}`}>{sale.closerPhone}</p>
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
            <div className={`pt-2 text-xs ${textMuted}`}>
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

function InfoField({ label, value, theme }: { label: string; value: string; theme: 'dark' | 'light' }) {
  const textMuted = theme === 'dark' ? 'text-white/40' : 'text-gray-400';
  const textSecondary = theme === 'dark' ? 'text-white/80' : 'text-gray-700';

  return (
    <div>
      <p className={`text-[10px] ${textMuted}`}>{label}</p>
      <p className={`text-sm ${textSecondary} truncate`}>{value}</p>
    </div>
  );
}
