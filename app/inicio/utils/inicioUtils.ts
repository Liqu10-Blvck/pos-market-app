/**
 * Calcula el porcentaje de avance respecto a un objetivo/meta, con un tope de 100%.
 */
export const calcPct = (actual: number, objetivo: number): number => {
  if (!objetivo) return 0;
  return Math.min(100, Math.round((actual / objetivo) * 100));
};
