// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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

export default function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [closers, setClosers] = useState<Closer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
    // Refresh cada 30 segundos
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calcular métricas
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((acc, sale) => {
    if (sale.currency === 'USD') return acc + sale.amount;
    if (sale.currency === 'ARS') return acc + (sale.amount / 1000);
    return acc + sale.amount;
  }, 0);
  const todaySales = sales.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    const today = new Date();
    return saleDate.toDateString() === today.toDateString();
  }).length;
  const verifiedSales = sales.filter(s => s.status === 'verified').length;

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') return `$${amount.toLocaleString()}`;
    if (currency === 'ARS') return `$${amount.toLocaleString()} ARS`;
    return `€${amount.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Sales Tracker
          </h1>
          <p className="text-muted-foreground mt-1">
            Registro de ventas desde WhatsApp
          </p>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          subtext="USD equivalente"
          color="green"
        />
        <StatCard 
          icon={<TrendingUp className="w-5 h-5" />}
          label="Ventas Totales"
          value={totalSales.toString()}
          subtext={`${todaySales} hoy`}
          color="blue"
        />
        <StatCard 
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Verificadas"
          value={verifiedSales.toString()}
          subtext={`${Math.round((verifiedSales / totalSales) * 100) || 0}% del total`}
          color="emerald"
        />
        <StatCard 
          icon={<Users className="w-5 h-5" />}
          label="Closers Activos"
          value={closers.length.toString()}
          subtext="con ventas"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Table */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Últimas Ventas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Closer</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Producto</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Monto</th>
                  <th className="text-center p-3 text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale, index) => (
                  <tr 
                    key={sale.id} 
                    className={`border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors animate-fade-in stagger-${Math.min(index + 1, 5)}`}
                    onClick={() => setSelectedSale(sale)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {sale.proofUrl && (
                          sale.proofType === 'image' 
                            ? <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            : <FileText className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{sale.clientName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{sale.closerName}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 bg-secondary rounded text-sm">
                        {sale.product}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-medium">
                      {formatCurrency(sale.amount, sale.currency)}
                    </td>
                    <td className="p-3 text-center">
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className="p-3 text-right text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(sale.createdAt), { 
                        addSuffix: true, 
                        locale: es 
                      })}
                    </td>
                  </tr>
                ))}
                {sales.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No hay ventas registradas aún
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Closers Leaderboard */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold">🏆 Ranking Closers</h2>
          </div>
          <div className="p-4 space-y-3">
            {closers.map((closer, index) => (
              <div 
                key={closer.id}
                className={`flex items-center gap-3 p-3 rounded-lg bg-secondary/30 animate-fade-in stagger-${Math.min(index + 1, 5)}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  index === 1 ? 'bg-gray-400/20 text-gray-300' :
                  index === 2 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-secondary text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{closer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {closer.totalSales} ventas
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-medium text-primary">
                    ${closer.totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {closers.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-4">
                Sin datos de closers
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <SaleDetailModal 
          sale={selectedSale} 
          onClose={() => setSelectedSale(null)} 
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, subtext, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: 'green' | 'blue' | 'emerald' | 'purple';
}) {
  const colorClasses = {
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-60 mt-1">{subtext}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'verified' | 'rejected' }) {
  const config = {
    verified: { label: 'Verificada', class: 'badge-verified', icon: CheckCircle2 },
    pending: { label: 'Pendiente', class: 'badge-pending', icon: Clock },
    rejected: { label: 'Rechazada', class: 'badge-rejected', icon: AlertCircle },
  };
  
  const { label, class: className, icon: Icon } = config[status];
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function SaleDetailModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-card rounded-xl border border-border max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold">Detalle de Venta</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Comprobante */}
          {sale.proofUrl && (
            <div className="rounded-lg overflow-hidden border border-border">
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
                  className="flex items-center gap-2 p-4 bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <FileText className="w-8 h-8" />
                  <span>Ver PDF</span>
                  <ExternalLink className="w-4 h-4 ml-auto" />
                </a>
              )}
            </div>
          )}
          
          {/* Cliente */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Cliente</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Nombre:</span>
                <p className="font-medium">{sale.clientName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{sale.clientEmail || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Teléfono:</span>
                <p className="font-medium">{sale.clientPhone || '-'}</p>
              </div>
            </div>
          </div>

          {/* Venta */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Venta</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Producto:</span>
                <p className="font-medium">{sale.product}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Monto:</span>
                <p className="font-medium font-mono text-primary">
                  {sale.currency === 'USD' ? '$' : sale.currency === 'ARS' ? 'ARS $' : '€'}
                  {sale.amount.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Funnel:</span>
                <p className="font-medium">{sale.funnel || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Medio de pago:</span>
                <p className="font-medium">{sale.paymentMethod || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="font-medium">{sale.paymentType || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Extras:</span>
                <p className="font-medium">{sale.extras || '-'}</p>
              </div>
            </div>
          </div>

          {/* Closer */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Closer</h4>
            <p className="font-medium">{sale.closerName}</p>
          </div>

          {/* Fecha y Status */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {new Date(sale.createdAt).toLocaleString('es-AR')}
            </span>
            <StatusBadge status={sale.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
