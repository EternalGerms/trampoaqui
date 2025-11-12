export interface BrazilianState {
  value: string;
  label: string;
}

export const BRAZILIAN_STATES: BrazilianState[] = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

/**
 * Validate if a state code is a valid Brazilian state
 * @param state - State code to validate
 * @returns true if the state code is valid, false otherwise
 */
export function isValidBrazilianState(state: string): boolean {
  if (!state) {
    return false;
  }
  const validStates = BRAZILIAN_STATES.map(s => s.value);
  return validStates.includes(state.toUpperCase());
}

/**
 * Get the label for a state code
 * @param state - State code
 * @returns State label or empty string if not found
 */
export function getStateLabel(state: string): string {
  const found = BRAZILIAN_STATES.find(s => s.value === state.toUpperCase());
  return found?.label || "";
}

