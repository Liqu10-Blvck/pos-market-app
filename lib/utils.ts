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

export function roundToChileanDecena(value: number): number {
  const rounded = Math.round(value);
  const lastDigit = rounded % 10;
  if (lastDigit >= 1 && lastDigit <= 5) {
    return rounded - lastDigit; // Round down to decena
  } else if (lastDigit >= 6 && lastDigit <= 9) {
    return rounded + (10 - lastDigit); // Round up to decena
  }
  return rounded;
}

export function compressImage(dataUrl: string, maxDimension: number = 1024, quality: number = 0.75): Promise<string> {
  if (typeof window === 'undefined') {
    return Promise.resolve(dataUrl);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      try {
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.warn('Fallo al exportar canvas, usando URL original:', err);
        resolve(dataUrl);
      }
    };
    img.onerror = (err) => {
      reject(err);
    };
  });
}

