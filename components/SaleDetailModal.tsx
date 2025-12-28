// components/SaleDetailModal.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DollarSign,
  User,
  Package,
  CreditCard,
  Mail,
  Phone,
  Filter,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  ImageIcon,
  ExternalLink,
  Loader2,
  Link2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ParsedSale {
  clientName: string;
  amount: number;
  currency: string;
  product: string;
  paymentType: string;
  status: 'pending' | 'verified' | 'rejected';
}

interface SaleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  parsedSale: ParsedSale;
  closerName: string;
  closerPhone?: string;
  messageContent?: string;
  quotedMessage?: {
    id: string;
    messageId: string;
    senderName: string;
    type: string;
    mediaUrl?: string;
    content?: string;
  } | null;
  saleId?: string;
  timestamp?: Date | string;
}

interface FullSaleData {
  clientEmail?: string;
  clientPhone?: string;
  funnel?: string;
  paymentMethod?: string;
  extras?: string;
  proofUrl?: string;
  proofType?: string;
  createdAt?: string;
}

export function SaleDetailModal({
  isOpen,
  onClose,
  parsedSale,
  closerName,
  closerPhone,
  messageContent,
  quotedMessage,
  saleId,
  timestamp
}: SaleDetailModalProps) {
  const [fullSaleData, setFullSaleData] = useState<FullSaleData | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch full sale data when modal opens
  useEffect(() => {
    if (isOpen && saleId) {
      setLoading(true);
      fetch(`/api/sales/${saleId}`)
        .then(res => res.json())
        .then(data => {
          if (data.sale) {
            setFullSaleData(data.sale);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, saleId]);

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency === 'ARS' ? 'ARS' : currency === 'EUR' ? 'EUR' : 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  const statusConfig = {
    verified: {
      label: 'Verificada',
      variant: 'default' as const,
      className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
      icon: CheckCircle2
    },
    pending: {
      label: 'Pendiente',
      variant: 'secondary' as const,
      className: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
      icon: Clock
    },
    rejected: {
      label: 'Rechazada',
      variant: 'destructive' as const,
      className: 'bg-red-500/20 text-red-400 border-red-500/50',
      icon: XCircle
    },
  };

  const status = statusConfig[parsedSale.status];
  const StatusIcon = status.icon;

  // Proof URL can come from quotedMessage or fullSaleData
  const proofUrl = quotedMessage?.mediaUrl || fullSaleData?.proofUrl;
  const proofType = fullSaleData?.proofType || (quotedMessage?.type === 'document' ? 'pdf' : 'image');

  const saleTimestamp = timestamp
    ? (typeof timestamp === 'string' ? new Date(timestamp) : timestamp)
    : fullSaleData?.createdAt
    ? new Date(fullSaleData.createdAt)
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50">
        <ScrollArea className="max-h-[90vh]">
          {/* Header con monto destacado */}
          <div className="relative bg-gradient-to-br from-primary/30 via-primary/10 to-transparent p-6 pb-8">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

            <DialogHeader className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Detalle de Venta
                  </p>
                  <DialogTitle className="text-3xl font-bold flex items-center gap-3">
                    <DollarSign className="w-8 h-8 text-primary" />
                    <span className="font-mono text-primary">
                      {formatCurrency(parsedSale.amount, parsedSale.currency)}
                    </span>
                  </DialogTitle>
                </div>
                <Badge variant="outline" className={`${status.className} text-sm px-3 py-1`}>
                  <StatusIcon className="w-4 h-4 mr-1.5" />
                  {status.label}
                </Badge>
              </div>

              {saleTimestamp && (
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(saleTimestamp, "EEEE, d 'de' MMMM 'a las' HH:mm", { locale: es })}
                </p>
              )}
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6">
            {/* Comprobante - Sección destacada */}
            {(proofUrl || quotedMessage) && (
              <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-0">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-primary/5">
                    <Link2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Comprobante Vinculado</span>
                    {quotedMessage?.senderName && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        de {quotedMessage.senderName}
                      </span>
                    )}
                  </div>

                  {proofUrl ? (
                    proofType === 'pdf' ? (
                      <a
                        href={proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-8 h-8 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Documento PDF</p>
                          <p className="text-sm text-muted-foreground">Click para abrir en nueva pestaña</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-muted-foreground" />
                      </a>
                    ) : (
                      <div className="relative group">
                        <img
                          src={proofUrl}
                          alt="Comprobante de pago"
                          className="w-full max-h-80 object-contain bg-black/5"
                        />
                        <a
                          href={proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="flex items-center gap-2 px-4 py-2 bg-white/90 text-black rounded-lg font-medium">
                            <ExternalLink className="w-4 h-4" />
                            Ver imagen completa
                          </span>
                        </a>
                      </div>
                    )
                  ) : quotedMessage?.type === 'image' ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Imagen vinculada (URL no disponible)</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {/* Información del Cliente */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Datos del Cliente
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField
                    icon={User}
                    label="Nombre"
                    value={parsedSale.clientName}
                    highlight
                  />
                  {(fullSaleData?.clientEmail) && (
                    <InfoField
                      icon={Mail}
                      label="Email"
                      value={fullSaleData.clientEmail}
                      copyable
                    />
                  )}
                  {(fullSaleData?.clientPhone) && (
                    <InfoField
                      icon={Phone}
                      label="Teléfono"
                      value={fullSaleData.clientPhone}
                      copyable
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Detalles de la Venta */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Detalles de la Venta
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField
                    icon={Package}
                    label="Producto"
                    value={parsedSale.product}
                  />
                  <InfoField
                    icon={CreditCard}
                    label="Tipo de Pago"
                    value={parsedSale.paymentType}
                  />
                  {(fullSaleData?.paymentMethod) && (
                    <InfoField
                      icon={CreditCard}
                      label="Medio de Pago"
                      value={fullSaleData.paymentMethod}
                    />
                  )}
                  {(fullSaleData?.funnel) && (
                    <InfoField
                      icon={Filter}
                      label="Funnel"
                      value={fullSaleData.funnel}
                    />
                  )}
                  {(fullSaleData?.extras) && (
                    <InfoField
                      icon={FileText}
                      label="Extras"
                      value={fullSaleData.extras}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Closer Info */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Registrada por
                </h3>

                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {closerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{closerName}</p>
                    {closerPhone && (
                      <p className="text-sm text-muted-foreground">+{closerPhone}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mensaje Original */}
            {messageContent && (
              <Card className="bg-secondary/30">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Mensaje Original
                  </h3>
                  <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground bg-background/50 p-3 rounded-lg border border-border/50 max-h-40 overflow-y-auto">
                    {messageContent}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>

          {loading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Component helper for info fields
function InfoField({
  icon: Icon,
  label,
  value,
  highlight = false,
  copyable = false
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
  copyable?: boolean;
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-medium truncate ${highlight ? 'text-primary' : ''}`}>
          {value || '-'}
        </p>
      </div>
      {copyable && value && (
        <button
          onClick={handleCopy}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Copiar"
        >
          Copiar
        </button>
      )}
    </div>
  );
}
