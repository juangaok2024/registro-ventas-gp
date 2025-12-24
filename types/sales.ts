// types/sales.ts

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
export const SALE_PATTERNS = {
  nombre: /Nombre:\s*(.+)/i,
  email: /Email:\s*(.+)/i,
  telefono: /Tel[eé]fono:\s*(.+)/i,
  monto: /Monto:\s*(\d+(?:[.,]\d+)?)\s*(usd|ars|euros?|pesos?)?/i,
  producto: /Producto:\s*(.+)/i,
  funnel: /Funnel:\s*(.+)/i,
  medioPago: /Medio de Pago:\s*(.+)/i,
  tipoPago: /tipo de pago:\s*(.+)/i,
  extras: /Extras:\s*(.+)/i,
  status: /Status:\s*(.+)/i,
  checkmark: /✅/,
};
