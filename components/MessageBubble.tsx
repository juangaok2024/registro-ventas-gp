// components/MessageBubble.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Image as ImageIcon,
  FileText,
  Mic,
  Video,
  Sticker,
  MessageSquare,
  Tag,
  Reply,
  ExternalLink,
  X
} from 'lucide-react';
import { SalePreviewCard } from './SalePreviewCard';

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
}

export function MessageBubble({ message, quotedMessage }: MessageBubbleProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<'top' | 'bottom'>('top');
  const bubbleRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Cerrar popup al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showPreview &&
        bubbleRef.current &&
        previewRef.current &&
        !bubbleRef.current.contains(event.target as Node) &&
        !previewRef.current.contains(event.target as Node)
      ) {
        setShowPreview(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPreview]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (message.classification.isSale && message.parsedSale) {
      // Calcular posición del preview
      if (bubbleRef.current) {
        const rect = bubbleRef.current.getBoundingClientRect();
        const spaceAbove = rect.top;
        setPreviewPosition(spaceAbove > 350 ? 'top' : 'bottom');
      }
      setShowPreview(!showPreview);
    }
  };

  const handleClosePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPreview(false);
  };

  const timestamp = typeof message.timestamp === 'string'
    ? new Date(message.timestamp)
    : message.timestamp;

  const typeIcon = {
    text: null,
    image: <ImageIcon className="w-4 h-4" />,
    document: <FileText className="w-4 h-4" />,
    audio: <Mic className="w-4 h-4" />,
    video: <Video className="w-4 h-4" />,
    sticker: <Sticker className="w-4 h-4" />,
    reaction: <MessageSquare className="w-4 h-4" />,
    unknown: null,
  };

  const isSale = message.classification.isSale;
  const isProof = message.classification.isProof;

  // No renderizar reacciones como burbujas completas
  if (message.type === 'reaction') {
    return null;
  }

  return (
    <div
      ref={bubbleRef}
      className={`group relative flex flex-col max-w-[85%] ${
        isSale ? 'cursor-pointer' : ''
      }`}
      onClick={handleClick}
    >
      {/* Mensaje citado */}
      {message.quotedMessageId && (
        <div className="flex items-start gap-2 mb-1 pl-3 border-l-2 border-primary/30">
          <Reply className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground truncate">
            {quotedMessage ? (
              <>
                <span className="font-medium text-foreground/70">{quotedMessage.senderName}</span>
                <span className="mx-1">·</span>
                {quotedMessage.type === 'image' && '📷 Imagen'}
                {quotedMessage.type === 'document' && '📄 Documento'}
                {quotedMessage.type === 'text' && (
                  <span className="italic">"{quotedMessage.content.substring(0, 50)}..."</span>
                )}
              </>
            ) : (
              <span className="italic">Mensaje citado</span>
            )}
          </div>
        </div>
      )}

      {/* Burbuja principal */}
      <div
        className={`relative rounded-2xl px-4 py-2.5 transition-all duration-200 ${
          isSale
            ? 'bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/40 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10'
            : isProof
            ? 'bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/30'
            : 'bg-secondary/60 border border-border/50 hover:bg-secondary/80'
        }`}
      >
        {/* Badge de tipo especial */}
        {(isSale || isProof) && (
          <div className={`absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isSale
              ? 'bg-primary text-primary-foreground'
              : 'bg-emerald-500 text-white'
          }`}>
            <Tag className="w-2.5 h-2.5" />
            {isSale ? 'Venta' : 'Comprobante'}
          </div>
        )}

        {/* Header del mensaje */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground">
            {message.senderName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {format(timestamp, 'HH:mm')}
          </span>
        </div>

        {/* Media preview */}
        {message.mediaUrl && message.type === 'image' && (
          <div className="mb-2 rounded-lg overflow-hidden">
            <img
              src={message.mediaUrl}
              alt="Media"
              className="max-w-full max-h-48 object-cover rounded-lg"
            />
          </div>
        )}

        {message.mediaUrl && message.type === 'document' && (
          <a
            href={message.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 mb-2 bg-background/50 rounded-lg hover:bg-background/80 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <FileText className="w-8 h-8 text-primary" />
            <span className="text-sm font-medium">Ver documento</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
          </a>
        )}

        {/* Contenido del mensaje */}
        {message.content && (
          <p className={`text-sm whitespace-pre-wrap break-words ${
            isSale ? 'font-mono text-xs leading-relaxed' : ''
          }`}>
            {isSale && message.parsedSale ? (
              // Para ventas, mostrar versión resumida
              <span className="text-muted-foreground">
                <span className="text-foreground font-medium">{message.parsedSale.clientName}</span>
                {' · '}
                <span className="text-primary font-bold">
                  ${message.parsedSale.amount.toLocaleString()} {message.parsedSale.currency}
                </span>
                {' · '}
                {message.parsedSale.product}
              </span>
            ) : (
              message.content
            )}
          </p>
        )}

        {/* Tipo de media indicator */}
        {typeIcon[message.type] && !message.mediaUrl && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            {typeIcon[message.type]}
            <span className="capitalize">{message.type}</span>
          </div>
        )}

        {/* Hover hint para ventas */}
        {isSale && !showPreview && (
          <div className="mt-2 pt-2 border-t border-primary/20 text-[10px] text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity">
            Toca para ver detalles
          </div>
        )}
      </div>

      {/* Timestamp completo en hover */}
      <div className="mt-1 text-[10px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">
        {formatDistanceToNow(timestamp, { addSuffix: true, locale: es })}
      </div>

      {/* Sale Preview Card (popup) */}
      {showPreview && message.parsedSale && (
        <div
          ref={previewRef}
          className={`absolute z-50 left-0 ${
            previewPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } animate-fade-in`}
          onClick={e => e.stopPropagation()}
        >
          <div className="relative">
            <button
              onClick={handleClosePreview}
              className="absolute -top-2 -right-2 z-10 p-1 bg-background border border-border rounded-full shadow-md hover:bg-secondary transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
            <SalePreviewCard
              parsedSale={message.parsedSale}
              closerName={message.senderName}
              proofUrl={message.mediaUrl}
            />
          </div>
        </div>
      )}
    </div>
  );
}
