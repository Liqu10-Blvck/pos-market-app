export const PRODUCT_ASSETS: Record<string, string> = {
  'tomate': '/assets/products/tomate.png',
  'palta': '/assets/products/palta.png',
  'manzana': '/assets/products/manzana.png',
  'plátano': '/assets/products/platano.png',
  'platano': '/assets/products/platano.png',
  'naranja': '/assets/products/naranja.png',
  'lechuga': '/assets/products/lechuga.png',
  'papa': '/assets/products/papa.png',
  'zanahoria': '/assets/products/zanahoria.png',
  'cebolla': '/assets/products/cebolla.png',
  'limón': '/assets/products/limon.png',
  'limon': '/assets/products/limon.png',
  'pan': '/assets/products/pan.png',
  'piña': '/assets/products/pina.png',
  'pina': '/assets/products/pina.png',
  'lechuga iceberg': '/assets/products/lechuga_iceberg.png',
  'iceberg': '/assets/products/lechuga_iceberg.png',
  'lechuga romana': '/assets/products/lechuga_romana.png',
  'romana': '/assets/products/lechuga_romana.png',
  'repollo morado': '/assets/products/repollo_morado.png',
  'repollo': '/assets/products/repollo.png',
  'jengibre': '/assets/products/jengibre.png',
  'gengibre': '/assets/products/jengibre.png',
  'leche': '🥛',
  'huevos': '🥚',
  'arroz': '🍚',
  'azúcar': '🧂',
  'azucar': '🧂',
};

export function getProductAsset(nombre: string): { type: 'image' | 'emoji' | 'none', value: string } {
  const normalized = nombre.toLowerCase().trim();
  
  // Try exact match first
  if (PRODUCT_ASSETS[normalized]) {
    const val = PRODUCT_ASSETS[normalized];
    return { 
      type: val.startsWith('/') ? 'image' : 'emoji', 
      value: val 
    };
  }

  // Try partial match
  for (const [key, val] of Object.entries(PRODUCT_ASSETS)) {
    if (normalized.includes(key)) {
      return { 
        type: val.startsWith('/') ? 'image' : 'emoji', 
        value: val 
      };
    }
  }

  return { type: 'none', value: '' };
}
