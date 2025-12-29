// types/sales.ts

// Mensaje del chat (registro completo)
export interface ChatMessage {
  id: string;
  messageId: string;          // ID único de WhatsApp
  timestamp: Date;

  // Remitente
  senderPhone: string;
  senderName: string;

  // Contenido
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'reaction' | 'unknown';
  content: string;            // Texto del mensaje o caption
  mediaUrl?: string;
  mimetype?: string;
  fileName?: string;

  // Referencias entre mensajes
  quotedMessageId?: string;   // ID del mensaje que cita
  quotedContent?: string;     // Preview del contenido citado (para mostrar sin query extra)

  // Clasificación automática
  classification: {
    isSale: boolean;
    isProof: boolean;
    saleId?: string;          // Referencia al doc en sales
    proofId?: string;         // Referencia al doc en proofs
  };

  // Datos de venta procesados (solo si isSale = true)
  parsedSale?: {
    clientName: string;
    amount: number;
    currency: string;
    product: string;
    paymentType: string;
    status: 'pending' | 'verified' | 'rejected';
  };

  // Metadata
  groupJid: string;
  processedAt: Date;
}

export interface Sale {
  id: string;
  
  // Datos del closer
  closerPhone: string;
  closerName: string;
  
  // Datos del cliente
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  
  // Datos de la venta
  amount: number;
  currency: 'USD' | 'ARS' | 'EUR' | string;
  product: string;
  funnel: string;
  paymentMethod: string;
  paymentType: string; // "Completo", "Cuota 1/2", etc.
  extras: string;
  
  // Comprobante
  proofUrl: string;
  proofType: 'image' | 'pdf';
  proofMessageId: string;
  
  // Metadata
  rawMessage: string;
  groupJid: string;
  messageId: string;
  status: 'pending' | 'verified' | 'rejected';

  // Verificación manual
  verified: boolean;
  verifiedAt: Date | null;
  verifiedBy: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface Closer {
  id: string;
  phone: string;
  name: string;
  totalSales: number;
  totalAmount: number;
  lastSaleAt: Date;
  createdAt: Date;
}

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
      participant?: string;
    };
    pushName: string;
    participantAlt?: string; // Número de teléfono real del remitente
    // contextInfo viene a nivel de data cuando un mensaje tipo "conversation" cita otro mensaje
    contextInfo?: {
      stanzaId?: string;
      participant?: string;
      quotedMessage?: {
        imageMessage?: {
          url?: string;
          mimetype?: string;
          caption?: string;
        };
        documentMessage?: {
          url?: string;
          mimetype?: string;
          fileName?: string;
        };
      };
    };
    message: {
      conversation?: string;
      mediaUrl?: string; // URL directa del media (imagen o documento)
      extendedTextMessage?: {
        text: string;
        contextInfo?: {
          stanzaId: string;
          participant: string;
          quotedMessage: {
            imageMessage?: {
              url: string;
              mimetype: string;
            };
            documentMessage?: {
              url: string;
              mimetype: string;
              fileName: string;
            };
          };
        };
      };
      imageMessage?: {
        url?: string;
        mediaUrl?: string;
        mimetype: string;
        caption?: string;
      };
      documentMessage?: {
        url?: string;
        mediaUrl?: string;
        mimetype: string;
        fileName?: string;
      };
      audioMessage?: {
        url?: string;
        mimetype?: string;
        seconds?: number;
      };
      videoMessage?: {
        url?: string;
        mimetype?: string;
        caption?: string;
      };
      stickerMessage?: {
        url?: string;
        mimetype?: string;
      };
      reactionMessage?: {
        text?: string;
        key?: {
          id: string;
        };
      };
    };
    messageType: string;
    messageTimestamp: number;
  };
}

export interface ParsedSaleData {
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
  hasCheckmark: boolean;
}

// Regex patterns para parsear el mensaje
// Soporta variaciones de formato, espacios antes/después de ":", campos alternativos
export const SALE_PATTERNS = {
  // "Nombre:", "NOMBRE :", "Nombre :" - permite espacio antes del ":"
  nombre: /Nombre\s*:\s*(.+)/i,
  // "Email:", "Correo:", "CORREO:" - acepta ambos términos
  email: /(?:Email|Correo)\s*:\s*(.+)/i,
  // "Teléfono:", "Telefono:", "TELEFONO:"
  telefono: /Tel[eé]fono\s*:\s*(.+)/i,
  // Monto puede venir como "Monto: 100usd" o "Monto (USD): 100" o "Monto(usd): 100 USD"
  monto: /Monto\s*(?:\(([^)]+)\))?\s*:\s*(\d+(?:[.,]\d+)?)\s*(usd|ars|euros?|pesos?)?/i,
  // "Producto:", "PRODUCTO:" o "PRODUCTO Silver" (sin ":")
  producto: /Producto\s*:?\s*(.+)/i,
  // "Funnel:", "FUNNEL:"
  funnel: /Funnel\s*:\s*(.+)/i,
  // "Medio de Pago:", "MEDIO DE PAGO:"
  medioPago: /Medio de Pago\s*:\s*(.+)/i,
  // "tipo de pago:", "Tipo de Pago:", "Tipo de Unico:", "Tipo:", etc.
  tipoPago: /Tipo(?:\s+de\s+(?:pago|[a-z]+))?\s*:\s*(.+)/i,
  // "Extras:", "EXTRAS:"
  extras: /Extras\s*:\s*(.+)/i,
  // "Status:", "STATUS:"
  status: /Status\s*:\s*(.+)/i,
  checkmark: /✅/,
};
