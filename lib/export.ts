// lib/export.ts
// Export utilities for sales data

import { formatCurrency, formatDateForExport } from './format';

interface ExportSale {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  closerName: string;
  closerPhone: string;
  amount: number;
  currency: string;
  product: string;
  funnel: string;
  paymentMethod: string;
  paymentType: string;
  extras: string;
  status: string;
  createdAt: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
}

/**
 * Convert sales data to CSV format
 */
export function salesToCSV(sales: ExportSale[]): string {
  const headers = [
    'Fecha',
    'Cliente',
    'Email Cliente',
    'Teléfono Cliente',
    'Closer',
    'Teléfono Closer',
    'Monto',
    'Moneda',
    'Producto',
    'Funnel',
    'Medio de Pago',
    'Tipo de Pago',
    'Extras',
    'Estado',
    'Verificado Por',
    'Fecha Verificación',
  ];

  const rows = sales.map(sale => [
    formatDateForExport(sale.createdAt),
    escapeCSV(sale.clientName),
    escapeCSV(sale.clientEmail || ''),
    escapeCSV(sale.clientPhone || ''),
    escapeCSV(sale.closerName),
    escapeCSV(sale.closerPhone),
    sale.amount.toString().replace('.', ','), // Argentine format for Excel
    sale.currency,
    escapeCSV(sale.product),
    escapeCSV(sale.funnel || ''),
    escapeCSV(sale.paymentMethod || ''),
    escapeCSV(sale.paymentType || ''),
    escapeCSV(sale.extras || ''),
    translateStatus(sale.status),
    escapeCSV(sale.verifiedBy || ''),
    sale.verifiedAt ? formatDateForExport(sale.verifiedAt) : '',
  ]);

  // Add BOM for Excel to recognize UTF-8
  const BOM = '\uFEFF';
  const csvContent = [
    headers.join(';'), // Use semicolon for Excel compatibility in Argentina
    ...rows.map(row => row.join(';'))
  ].join('\n');

  return BOM + csvContent;
}

/**
 * Escape a value for CSV
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  // If contains semicolon, quote, or newline, wrap in quotes
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Translate status to Spanish
 */
function translateStatus(status: string): string {
  switch (status) {
    case 'verified': return 'Verificada';
    case 'pending': return 'Pendiente';
    case 'rejected': return 'Rechazada';
    default: return status;
  }
}

/**
 * Trigger download of a file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export sales to CSV and download
 */
export function exportSalesToCSV(sales: ExportSale[], filenamePrefix: string = 'ventas') {
  const csv = salesToCSV(sales);
  const date = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}_${date}.csv`;
  downloadFile(csv, filename);
}
