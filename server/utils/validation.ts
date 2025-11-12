/**
 * Valida se uma data/hora é válida e está no futuro
 * @param date - Data a ser validada (Date ou string)
 * @returns Objeto com isValid (boolean) e errorMessage (string | null)
 */
export function validateFutureDateTime(date: Date | string): { isValid: boolean; errorMessage: string | null } {
  let dateObj: Date;
  
  // Converter string para Date se necessário
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  // Verificar se a data é válida
  if (isNaN(dateObj.getTime())) {
    return {
      isValid: false,
      errorMessage: 'Data e horário inválidos'
    };
  }

  // Verificar se a data está no futuro
  const now = new Date();
  if (dateObj <= now) {
    return {
      isValid: false,
      errorMessage: 'A data e horário devem ser no futuro'
    };
  }

  return {
    isValid: true,
    errorMessage: null
  };
}

/**
 * Valida se uma data (sem hora) é válida e está no futuro
 * @param date - Data a ser validada (Date ou string)
 * @returns Objeto com isValid (boolean) e errorMessage (string | null)
 */
export function validateFutureDate(date: Date | string): { isValid: boolean; errorMessage: string | null } {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  if (isNaN(dateObj.getTime())) {
    return {
      isValid: false,
      errorMessage: 'Data inválida'
    };
  }

  // Comparar apenas a data (sem hora)
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  dateObj.setHours(0, 0, 0, 0);

  if (dateObj <= now) {
    return {
      isValid: false,
      errorMessage: 'A data deve ser no futuro'
    };
  }

  return {
    isValid: true,
    errorMessage: null
  };
}

