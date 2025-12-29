// lib/format.ts
// Formatting utilities for Argentine locale with USD currency

/**
 * Format currency using Argentine locale (1.234,56) but with USD symbol
 * @param amount - The numeric amount
 * @param currency - Currency code (USD, ARS, EUR)
 * @param showCurrency - Whether to show the currency indicator
 */
export function formatCurrency(amount: number, currency: string = 'USD', showCurrency: boolean = true): string {
  // Use Argentine locale for number formatting (dot for thousands, comma for decimals)
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  if (!showCurrency) return formatted;

  // USD is the default, just use $
  if (currency === 'USD' || !currency) {
    return `$${formatted}`;
  }

  // For ARS, show the currency indicator
  if (currency === 'ARS') {
    return `$${formatted} ARS`;
  }

  // For EUR
  if (currency === 'EUR' || currency === 'EUROS') {
    return `€${formatted}`;
  }

  return `$${formatted}`;
}

/**
 * Format a number with Argentine locale (1.234,56)
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format a percentage
 */
export function formatPercent(value: number): string {
  return `${formatNumber(value, 0)}%`;
}

/**
 * Parse a formatted currency string back to number
 */
export function parseCurrency(formatted: string): number {
  // Remove currency symbols and spaces
  const cleaned = formatted.replace(/[$€\s]/g, '').replace(/ARS|EUR|USD/gi, '');
  // Replace Argentine format (1.234,56) to standard (1234.56)
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, includeTime: boolean = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return d.toLocaleDateString('es-AR', options);
}

/**
 * Format date for export (ISO-like but readable)
 */
export function formatDateForExport(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
