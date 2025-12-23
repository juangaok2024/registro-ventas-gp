// lib/parser.ts
import { ParsedSaleData, SALE_PATTERNS } from '@/types/sales';

/**
 * Parsea el mensaje del closer y extrae los datos de la venta
 */
export function parseSaleMessage(message: string): ParsedSaleData | null {
  // Verificar que tenga el checkmark de confirmación
  const hasCheckmark = SALE_PATTERNS.checkmark.test(message);
  
  // Extraer cada campo
  const nombreMatch = message.match(SALE_PATTERNS.nombre);
  const emailMatch = message.match(SALE_PATTERNS.email);
  const telefonoMatch = message.match(SALE_PATTERNS.telefono);
  const montoMatch = message.match(SALE_PATTERNS.monto);
  const productoMatch = message.match(SALE_PATTERNS.producto);
  const funnelMatch = message.match(SALE_PATTERNS.funnel);
  const medioPagoMatch = message.match(SALE_PATTERNS.medioPago);
  const tipoPagoMatch = message.match(SALE_PATTERNS.tipoPago);
  const extrasMatch = message.match(SALE_PATTERNS.extras);
  
  // Si no tiene al menos nombre y monto, no es un mensaje de venta válido
  if (!nombreMatch || !montoMatch) {
    return null;
  }
  
  // Parsear monto y moneda
  const amountStr = montoMatch[1].replace(',', '.');
  const amount = parseFloat(amountStr);
  let currency = (montoMatch[2] || 'USD').toUpperCase();
  
  // Normalizar moneda
  if (currency.includes('PESO') || currency === 'ARS') {
    currency = 'ARS';
  } else if (currency.includes('EURO')) {
    currency = 'EUR';
  } else {
    currency = 'USD';
  }
  
  return {
    clientName: nombreMatch[1].trim(),
    clientEmail: emailMatch ? emailMatch[1].trim() : '',
    clientPhone: telefonoMatch ? telefonoMatch[1].trim() : '',
    amount,
    currency,
    product: productoMatch ? productoMatch[1].trim() : '',
    funnel: funnelMatch ? funnelMatch[1].trim() : '',
    paymentMethod: medioPagoMatch ? medioPagoMatch[1].trim() : '',
    paymentType: tipoPagoMatch ? tipoPagoMatch[1].trim() : '',
    extras: extrasMatch ? extrasMatch[1].trim() : '',
    hasCheckmark,
  };
}

/**
 * Verifica si un mensaje parece ser un reporte de venta
 */
export function isSaleReport(message: string): boolean {
  // Debe contener al menos "Nombre:" y "Monto:"
  return SALE_PATTERNS.nombre.test(message) && SALE_PATTERNS.monto.test(message);
}

/**
 * Extrae el número de teléfono del JID de WhatsApp
 */
export function extractPhoneFromJid(jid: string): string {
  // El JID viene como "5493515551234@s.whatsapp.net" o "5493515551234:5@s.whatsapp.net"
  const match = jid.match(/^(\d+)/);
  return match ? match[1] : jid;
}

/**
 * Formatea un número para mostrar
 */
export function formatPhone(phone: string): string {
  // Si es argentino, formatear como +54 9 XXX XXX-XXXX
  if (phone.startsWith('549')) {
    const cleaned = phone.slice(3);
    if (cleaned.length === 10) {
      return `+54 9 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
  }
  return `+${phone}`;
}

/**
 * Formatea moneda para mostrar
 */
export function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency === 'ARS' ? 'ARS' : currency === 'EUR' ? 'EUR' : 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
}
