// app/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  RefreshCw,
  Calendar,
  Filter,
  X,
  Check,
  XCircle
} from 'lucide-react';
import { formatDistanceToNow, format, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

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

  // Calculate metrics based on filtered sales
  const totalSales = filteredSales.length;
  const totalRevenue = filteredSales.reduce((acc, sale) => {
    if (sale.currency === 'USD') return acc + sale.amount;
    if (sale.currency === 'ARS') return acc + (sale.amount / 1000);
    return acc + sale.amount;
  }, 0);
  const pendingSales = filteredSales.filter(s => s.status === 'pending').length;
  const verifiedSales = filteredSales.filter(s => s.status === 'verified').length;

  const handleVerify = async (saleId: string, verified: boolean) => {
    setVerifyingId(saleId);
    try {
      const res = await fetch(`/api/sales/${saleId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified, verifiedBy: 'admin' })
      });

      if (res.ok) {
        // Update local state
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
    return `€${amount.toLocaleString()}`;
  };

  const dateFilterLabels: Record<DateFilter, string> = {
    all: 'Todas',
    today: 'Hoy',
    yesterday: 'Ayer',
    week: 'Últimos 7 días',
    month: 'Últimos 30 días'
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Sales Tracker
            </h1>
            <p className="text-muted-foreground mt-1">
              Registro de ventas desde WhatsApp
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date Filter */}
            <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1">
              {(Object.keys(dateFilterLabels) as DateFilter[]).map(filter => (
                <button
                  key={filter}
                  onClick={() => setDateFilter(filter)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    dateFilter === filter
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {dateFilterLabels[filter]}
                </button>
              ))}
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Revenue Total"
            value={`$${totalRevenue.toLocaleString()}`}
            subtext="USD equivalente"
            variant="primary"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Ventas"
            value={totalSales.toString()}
            subtext={dateFilter === 'all' ? 'totales' : dateFilterLabels[dateFilter].toLowerCase()}
            variant="default"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Pendientes"
            value={pendingSales.toString()}
            subtext="por verificar"
            variant="warning"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Verificadas"
            value={verifiedSales.toString()}
            subtext={`${Math.round((verifiedSales / totalSales) * 100) || 0}% del total`}
            variant="success"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Sales Table */}
          <div className="xl:col-span-2 glass gradient-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Últimas Ventas</h2>
                {dateFilter !== 'all' && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    {dateFilterLabels[dateFilter]}
                  </span>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {filteredSales.length} registros
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/30">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Closer</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Producto</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Monto</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Verificar</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredSales.map((sale, index) => (
                    <tr
                      key={sale.id}
                      className={`table-row-hover cursor-pointer animate-fade-in stagger-${Math.min(index + 1, 5)}`}
                      onClick={() => setSelectedSale(sale)}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {sale.proofUrl && (
                            <span className="text-primary">
                              {sale.proofType === 'image'
                                ? <ImageIcon className="w-4 h-4" />
                                : <FileText className="w-4 h-4" />
                              }
                            </span>
                          )}
                          <span className="font-medium">{sale.clientName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{sale.closerName}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-secondary/50 rounded text-sm">
                          {sale.product}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-medium text-primary">
                        {formatCurrency(sale.amount, sale.currency)}
                      </td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {sale.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleVerify(sale.id, true)}
                                disabled={verifyingId === sale.id}
                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                title="Verificar"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleVerify(sale.id, false)}
                                disabled={verifyingId === sale.id}
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                title="Rechazar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <StatusBadge status={sale.status} />
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(sale.createdAt), {
                          addSuffix: true,
                          locale: es
                        })}
                      </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No hay ventas {dateFilter !== 'all' ? 'en este período' : 'registradas aún'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Closers Leaderboard */}
          <div className="glass gradient-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border/50">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                Ranking Closers
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {closers.length > 0 ? (
                closers.map((closer, index) => (
                  <div
                    key={closer.id}
                    className={`flex items-center gap-3 p-3 rounded-xl hover-lift animate-fade-in stagger-${Math.min(index + 1, 5)} ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20' :
                      index === 1 ? 'bg-gradient-to-r from-gray-400/10 to-transparent border border-gray-400/20' :
                      index === 2 ? 'bg-gradient-to-r from-orange-600/10 to-transparent border border-orange-600/20' :
                      'bg-secondary/30'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      index === 1 ? 'bg-gray-400/20 text-gray-300' :
                      index === 2 ? 'bg-orange-600/20 text-orange-400' :
                      'bg-secondary text-muted-foreground'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{closer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {closer.totalSales} venta{closer.totalSales !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-primary text-lg">
                        ${closer.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">
                    {loading ? 'Cargando...' : 'Sin datos de closers'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sale Detail Modal */}
        {selectedSale && (
          <SaleDetailModal
            sale={selectedSale}
            onClose={() => setSelectedSale(null)}
            onVerify={handleVerify}
            verifyingId={verifyingId}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtext, variant }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  variant: 'primary' | 'default' | 'success' | 'warning';
}) {
  const variantClasses = {
    primary: 'border-primary/30 bg-gradient-to-br from-primary/10 to-transparent',
    default: 'border-border bg-card',
    success: 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent',
    warning: 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent',
  };

  const iconColors = {
    primary: 'text-primary',
    default: 'text-muted-foreground',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
  };

  return (
    <div className={`p-4 rounded-xl border hover-lift ${variantClasses[variant]}`}>
      <div className={`flex items-center gap-2 mb-2 ${iconColors[variant]}`}>
        {icon}
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{subtext}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'verified' | 'rejected' }) {
  const config = {
    verified: { label: 'Verificada', class: 'badge-verified', icon: CheckCircle2 },
    pending: { label: 'Pendiente', class: 'badge-pending', icon: Clock },
    rejected: { label: 'Rechazada', class: 'badge-rejected', icon: XCircle },
  };

  const { label, class: className, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function SaleDetailModal({ sale, onClose, onVerify, verifyingId }: {
  sale: Sale;
  onClose: () => void;
  onVerify: (saleId: string, verified: boolean) => void;
  verifyingId: string | null;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl border border-border max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Detalle de Venta</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Comprobante */}
          {sale.proofUrl && (
            <div className="rounded-xl overflow-hidden border border-border">
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
                  className="flex items-center gap-3 p-4 bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <FileText className="w-10 h-10 text-primary" />
                  <span className="font-medium">Ver PDF del comprobante</span>
                  <ExternalLink className="w-4 h-4 ml-auto text-muted-foreground" />
                </a>
              )}
            </div>
          )}

          {/* Cliente */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoField label="Nombre" value={sale.clientName} />
              <InfoField label="Email" value={sale.clientEmail || '-'} />
              <InfoField label="Teléfono" value={sale.clientPhone || '-'} />
            </div>
          </div>

          {/* Venta */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Venta</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoField label="Producto" value={sale.product} />
              <InfoField
                label="Monto"
                value={`${sale.currency === 'USD' ? '$' : sale.currency === 'ARS' ? 'ARS $' : '€'}${sale.amount.toLocaleString()}`}
                highlight
              />
              <InfoField label="Funnel" value={sale.funnel || '-'} />
              <InfoField label="Medio de pago" value={sale.paymentMethod || '-'} />
              <InfoField label="Tipo" value={sale.paymentType || '-'} />
              <InfoField label="Extras" value={sale.extras || '-'} />
            </div>
          </div>

          {/* Closer */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Closer</h4>
            <p className="font-medium">{sale.closerName}</p>
            <p className="text-sm text-muted-foreground">{sale.closerPhone}</p>
          </div>

          {/* Verification Actions */}
          {sale.status === 'pending' && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => onVerify(sale.id, true)}
                disabled={verifyingId === sale.id}
                className="flex-1 btn-primary flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4" />
                Verificar Venta
              </button>
              <button
                onClick={() => onVerify(sale.id, false)}
                disabled={verifyingId === sale.id}
                className="flex-1 btn-secondary flex items-center justify-center gap-2 bg-red-600/20 text-red-400 hover:bg-red-600/30"
              >
                <XCircle className="w-4 h-4" />
                Rechazar
              </button>
            </div>
          )}

          {/* Fecha y Status */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div className="text-sm">
              <p className="text-muted-foreground">
                {format(new Date(sale.createdAt), "d 'de' MMMM, yyyy - HH:mm", { locale: es })}
              </p>
              {sale.verifiedAt && (
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Verificada: {format(new Date(sale.verifiedAt), "d MMM, HH:mm", { locale: es })}
                </p>
              )}
            </div>
            <StatusBadge status={sale.status} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className={`font-medium ${highlight ? 'text-primary font-mono' : ''}`}>{value}</p>
    </div>
  );
}
