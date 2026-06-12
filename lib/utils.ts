import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCLPCurrency(value: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function parseChileanMoneyInput(value: string) {
  // Eliminar espacios y símbolos de moneda
  const sanitized = value.replace(/\s/g, '').replace(/[^\d,.-]/g, '')

  if (!sanitized) return 0

  // En Chile (es-CL), el punto (.) es separador de miles y la coma (,) es decimal.
  // Sin embargo, en POS es muy raro usar decimales para CLP.
  
  // Si hay puntos Y comas, la coma es claramente el decimal.
  const hasComma = sanitized.indexOf(',') !== -1
  const hasMultipleDots = (sanitized.match(/\./g) || []).length > 1

  if (hasComma) {
    // Si hay coma, eliminamos todos los puntos (miles) y convertimos la coma en punto decimal
    const [integerPart, decimalPart] = sanitized.split(',')
    const cleanInteger = integerPart.replace(/\./g, '')
    return parseFloat(`${cleanInteger}.${decimalPart}`) || 0
  }

  // Si no hay coma, pero hay más de un punto, todos los puntos son miles.
  if (hasMultipleDots) {
    return parseFloat(sanitized.replace(/\./g, '')) || 0
  }

  // Si solo hay un punto (ej: 23.000), en el contexto chileno de POS,
  // casi con seguridad es un separador de miles, NO decimal.
  // Evaluamos: si después del punto hay exactamente 3 dígitos, asumimos miles.
  const parts = sanitized.split('.')
  if (parts.length === 2 && parts[1].length === 3) {
    return parseFloat(sanitized.replace(/\./g, '')) || 0
  }

  // En cualquier otro caso, delegar al parseFloat estándar quitando puntos
  return parseFloat(sanitized.replace(/\./g, '')) || 0
}

export function normalizeMoneyInput(value: string) {
  return value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
}

/**
 * Limpia un objeto de valores 'undefined' para que sea compatible con Firestore set()/add()
 */
export function sanitizeFirestoreData(data: any): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  
  // Preservar Timestamps de Firebase y objetos Date (no deben ser sanitizados como objetos planos)
  if (data instanceof Date || typeof data.toMillis === 'function') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(v => sanitizeFirestoreData(v));
  }

  // Solo sanitizar objetos planos {}
  if (Object.prototype.toString.call(data) !== '[object Object]') {
    return data;
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    sanitized[key] = sanitizeFirestoreData(value);
  }
  return sanitized;
}
