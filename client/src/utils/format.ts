/**
 * Format a number or string as Brazilian currency (R$)
 * @param value - Number or string to format
 * @returns Formatted currency string (e.g., "R$ 150,00")
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return "R$ 0,00";
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return "R$ 0,00";
  }

  return `R$ ${num.toFixed(2).replace('.', ',')}`;
}

/**
 * Format a date with date and time in Brazilian format
 * @param date - Date string or Date object
 * @returns Formatted date and time string (e.g., "01/01/2024 14:30")
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) {
    return "";
  }

  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format a date without time in Brazilian format
 * @param date - Date string or Date object
 * @returns Formatted date string (e.g., "01/01/2024")
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) {
    return "";
  }

  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format time only in Brazilian format
 * @param date - Date string or Date object
 * @returns Formatted time string (e.g., "14:30")
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) {
    return "";
  }

  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

