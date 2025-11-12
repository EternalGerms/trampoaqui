/**
 * Valida se uma data/hora é válida e está no futuro
 * @param date - Data a ser validada (Date ou string)
 * @returns Mensagem de erro ou null se válido
 */
export function validateFutureDateTime(date: Date | string): string | null {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  if (isNaN(dateObj.getTime())) {
    return 'Data e horário inválidos';
  }

  const now = new Date();
  if (dateObj <= now) {
    return 'A data e horário devem ser no futuro';
  }

  return null;
}

