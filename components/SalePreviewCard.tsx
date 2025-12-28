// components/SalePreviewCard.tsx
'use client';

import { DollarSign, User, Package, CreditCard, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface ParsedSale {
  clientName: string;
  amount: number;
  currency: string;
  product: string;
  paymentType: string;
  status: 'pending' | 'verified' | 'rejected';
}

interface SalePreviewCardProps {
  parsedSale: ParsedSale;
  closerName: string;
  proofUrl?: string;
}

export function SalePreviewCard({ parsedSale, closerName, proofUrl }: SalePreviewCardProps) {
  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') return `$${amount.toLocaleString()}`;
    if (currency === 'ARS') return `$${amount.toLocaleString()} ARS`;
    return `€${amount.toLocaleString()}`;
  };

  const statusConfig = {
    verified: {
      label: 'Verificada',
      class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2
    },
    pending: {
      label: 'Pendiente',
      class: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      icon: Clock
    },
    rejected: {
      label: 'Rechazada',
      class: 'bg-red-500/20 text-red-400 border-red-500/30',
      icon: XCircle
    },
  };

  const status = statusConfig[parsedSale.status];
  const StatusIcon = status.icon;

  return (
    <div className="w-72 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden">
      {/* Header con monto destacado */}
      <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Venta Detectada
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${status.class}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <span className="text-2xl font-bold text-primary font-mono">
            {formatCurrency(parsedSale.amount, parsedSale.currency)}
          </span>
        </div>
      </div>

      {/* Preview de comprobante si existe */}
      {proofUrl && (
        <div className="h-24 overflow-hidden border-b border-border/50">
          <img
            src={proofUrl}
            alt="Comprobante"
            className="w-full h-full object-cover opacity-80"
          />
        </div>
      )}

      {/* Detalles */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Cliente:</span>
          <span className="font-medium truncate">{parsedSale.clientName}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Producto:</span>
          <span className="font-medium truncate">{parsedSale.product}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Pago:</span>
          <span className="font-medium">{parsedSale.paymentType}</span>
        </div>

        <div className="pt-2 mt-2 border-t border-border/50 text-xs text-muted-foreground">
          Registrada por <span className="text-foreground font-medium">{closerName}</span>
        </div>
      </div>
    </div>
  );
}
