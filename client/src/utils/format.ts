/**
 * Formata número ou string como moeda brasileira (R$).
 * @param value Valor numérico ou string a formatar.
 * @returns Moeda formatada, ex.: "R$ 150,00".
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
 * Formata data e hora no padrão brasileiro.
 * @param date String de data ou objeto Date.
 * @returns Data e hora formatadas, ex.: "01/01/2024 14:30".
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
 * Formata apenas a data no padrão brasileiro.
 * @param date String de data ou objeto Date.
 * @returns Data formatada, ex.: "01/01/2024".
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
 * Formata apenas a hora no padrão brasileiro.
 * @param date String de data ou objeto Date.
 * @returns Hora formatada, ex.: "14:30".
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

