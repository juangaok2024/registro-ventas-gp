// components/MessageBubble.tsx
'use client';

import { useState, useRef } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Image as ImageIcon,
  FileText,
  Mic,
  Video,
  Sticker,
  ExternalLink,
  X,
  ZoomIn,
  User,
  Clock,
  CreditCard,
  Package,
  Receipt
} from 'lucide-react';
import { SaleDetailModal } from './SaleDetailModal';

interface ChatMessage {
  id: string;
  messageId: string;
  timestamp: Date | string;
  senderPhone: string;
  senderName: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'reaction' | 'unknown';
  content: string;
  mediaUrl?: string;
  mimetype?: string;
  quotedMessageId?: string;
  quotedContent?: string;
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

interface MessageBubbleProps {
  message: ChatMessage;
  quotedMessage?: ChatMessage | null;
  onSaleClick?: (saleId: string) => void;
  closerColor?: string;
}

// Lightbox component for full image view
function ImageLightbox({
  src,
  alt,
  onClose
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function MessageBubble({ message, quotedMessage, closerColor = '#10b981' }: MessageBubbleProps) {
  const [showModal, setShowModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxImage, setLightboxImage] = useState('');
  const bubbleRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (message.classification.isSale && message.parsedSale) {
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const openLightbox = (src: string) => {
    setLightboxImage(src);
    setShowLightbox(true);
  };

  const timestamp = typeof message.timestamp === 'string'
    ? new Date(message.timestamp)
    : message.timestamp;

  const isSale = message.classification.isSale;
  const isProof = message.classification.isProof;

  // Don't render reactions as full bubbles
  if (message.type === 'reaction') {
    return null;
  }

  // Check if sale is quoting a comprobante (image/document)
  const hasQuotedProof = quotedMessage &&
    quotedMessage.classification?.isProof &&
    (quotedMessage.type === 'image' || quotedMessage.type === 'document');

  // ===========================================
  // SALE CARD - Prominent design with thumbnail
  // ===========================================
  if (isSale && message.parsedSale) {
    return (
      <>
        <div
          ref={bubbleRef}
          className="group relative cursor-pointer max-w-[90%] animate-fade-in"
          onClick={handleClick}
        >
          {/* Main Sale Card */}
          <div
            className="relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,95,70,0.04) 100%)',
              borderLeft: `4px solid ${closerColor}`,
            }}
          >
            {/* Glass effect border */}
            <div className="absolute inset-0 rounded-xl border border-emerald-500/20" />

            <div className="relative p-4">
              {/* Header with badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: closerColor }}
                  >
                    {message.senderName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground">
                      {message.senderName}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                      <Clock className="w-3 h-3" />
                      {format(timestamp, 'HH:mm')}
                    </div>
                  </div>
                </div>

                {/* Sale Badge */}
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Venta
                  </span>
                </div>
              </div>

              {/* Content Row: Thumbnail + Details */}
              <div className="flex gap-4">
                {/* Quoted Comprobante Thumbnail */}
                {hasQuotedProof && quotedMessage.mediaUrl && (
                  <div
                    className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer group/thumb border border-emerald-500/30 bg-black/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      openLightbox(quotedMessage.mediaUrl!);
                    }}
                  >
                    {quotedMessage.type === 'image' ? (
                      <>
                        <img
                          src={quotedMessage.mediaUrl}
                          alt="Comprobante"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="w-5 h-5 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-emerald-900/30">
                        <FileText className="w-8 h-8 text-emerald-400" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent py-1 px-2">
                      <span className="text-[8px] font-medium text-white/80">
                        Comprobante
                      </span>
                    </div>
                  </div>
                )}

                {/* Sale Details */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Client Name */}
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {message.parsedSale.clientName}
                    </span>
                  </div>

                  {/* Amount - PROMINENT */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                      ${message.parsedSale.amount.toLocaleString()}
                    </span>
                    <span className="text-sm font-medium text-emerald-400/70">
                      {message.parsedSale.currency}
                    </span>
                  </div>

                  {/* Product & Payment Type */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-muted-foreground">
                      <Package className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">{message.parsedSale.product}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-muted-foreground">
                      <CreditCard className="w-3 h-3" />
                      <span>{message.parsedSale.paymentType}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hover hint */}
              <div className="mt-3 pt-2 border-t border-emerald-500/10 text-[10px] text-emerald-400/50 opacity-0 group-hover:opacity-100 transition-opacity text-center">
                Click para ver detalles completos
              </div>
            </div>
          </div>
        </div>

        {/* Lightbox */}
        {showLightbox && lightboxImage && (
          <ImageLightbox
            src={lightboxImage}
            alt="Comprobante"
            onClose={() => setShowLightbox(false)}
          />
        )}

        {/* Sale Detail Modal */}
        <SaleDetailModal
          isOpen={showModal}
          onClose={handleCloseModal}
          parsedSale={message.parsedSale}
          closerName={message.senderName}
          closerPhone={message.senderPhone}
          messageContent={message.content}
          quotedMessage={quotedMessage ? {
            id: quotedMessage.id,
            messageId: quotedMessage.messageId,
            senderName: quotedMessage.senderName,
            type: quotedMessage.type,
            mediaUrl: quotedMessage.mediaUrl,
            content: quotedMessage.content
          } : null}
          saleId={message.classification.saleId}
          timestamp={timestamp}
        />
      </>
    );
  }

  // ===========================================
  // PROOF CARD - Image/Document with special style
  // ===========================================
  if (isProof) {
    return (
      <>
        <div
          ref={bubbleRef}
          className="group relative max-w-[75%] animate-fade-in"
        >
          <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
            {/* Header */}
            <div className="px-3 py-2 border-b border-amber-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground/80">
                  {message.senderName}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {format(timestamp, 'HH:mm')}
                </span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                <ImageIcon className="w-3 h-3 text-amber-400" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400">
                  Comprobante
                </span>
              </div>
            </div>

            {/* Media */}
            {message.mediaUrl && message.type === 'image' && (
              <div
                className="relative cursor-pointer group/img"
                onClick={() => openLightbox(message.mediaUrl!)}
              >
                <img
                  src={message.mediaUrl}
                  alt="Comprobante"
                  className="w-full max-h-64 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm">
                    <ZoomIn className="w-4 h-4 text-white" />
                    <span className="text-sm text-white">Ver imagen</span>
                  </div>
                </div>
              </div>
            )}

            {message.mediaUrl && message.type === 'document' && (
              <a
                href={message.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">Documento PDF</span>
                  <p className="text-xs text-muted-foreground">Click para abrir</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
            )}

            {message.content && (
              <p className="px-3 py-2 text-xs text-muted-foreground border-t border-amber-500/10">
                {message.content}
              </p>
            )}
          </div>
        </div>

        {/* Lightbox */}
        {showLightbox && lightboxImage && (
          <ImageLightbox
            src={lightboxImage}
            alt="Comprobante"
            onClose={() => setShowLightbox(false)}
          />
        )}
      </>
    );
  }

  // ===========================================
  // MINIMAL CHAT BUBBLE - Low profile for noise
  // ===========================================
  return (
    <>
      <div
        ref={bubbleRef}
        className="group relative max-w-[70%] animate-fade-in"
      >
        <div className="relative rounded-lg px-3 py-2 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors">
          {/* Quoted message - minimal */}
          {message.quotedMessageId && quotedMessage && (
            <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-white/[0.05] text-[10px] text-muted-foreground/60">
              <span className="truncate">↩ {quotedMessage.senderName}: {quotedMessage.content?.substring(0, 30)}...</span>
            </div>
          )}

          {/* Header - very subtle */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-medium text-muted-foreground/70">
              {message.senderName}
            </span>
            <span className="text-[9px] text-muted-foreground/40 font-mono">
              {format(timestamp, 'HH:mm')}
            </span>
          </div>

          {/* Media for non-proof images */}
          {message.mediaUrl && message.type === 'image' && (
            <div
              className="relative mb-1.5 rounded overflow-hidden cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
              onClick={() => openLightbox(message.mediaUrl!)}
            >
              <img
                src={message.mediaUrl}
                alt="Media"
                className="max-w-full max-h-32 object-cover rounded"
              />
            </div>
          )}

          {message.mediaUrl && message.type === 'document' && (
            <a
              href={message.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-1.5 mb-1 bg-white/[0.03] rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Ver documento</span>
              <ExternalLink className="w-3 h-3 ml-auto" />
            </a>
          )}

          {/* Audio/Video indicators */}
          {message.type === 'audio' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <Mic className="w-3 h-3" />
              <span>Audio</span>
            </div>
          )}

          {message.type === 'video' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <Video className="w-3 h-3" />
              <span>Video</span>
            </div>
          )}

          {message.type === 'sticker' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <Sticker className="w-3 h-3" />
              <span>Sticker</span>
            </div>
          )}

          {/* Content - subtle */}
          {message.content && (
            <p className="text-xs text-muted-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </p>
          )}
        </div>

        {/* Timestamp on hover */}
        <div className="mt-0.5 text-[9px] text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
          {formatDistanceToNow(timestamp, { addSuffix: true, locale: es })}
        </div>
      </div>

      {/* Lightbox */}
      {showLightbox && lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          alt="Imagen"
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  );
}
