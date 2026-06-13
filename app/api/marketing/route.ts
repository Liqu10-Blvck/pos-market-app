import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const { productos, contexto } = await req.json();

    if (!productos || !Array.isArray(productos)) {
      return NextResponse.json(
        { error: 'La lista de productos es requerida' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'La clave de API de Gemini (GEMINI_API_KEY) no está configurada en el servidor. Por favor, añádela a tu archivo .env.'
        },
        { status: 500 }
      );
    }

    // Inicializar Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);
    // Usar el modelo gemini-2.5-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

    // Construir un prompt estratégico y estructurado
    const prompt = `
Eres un asesor de marketing experto y especialista en fijación de precios (pricing) para pequeños negocios de barrio y minimarkets (POS).
Tu tarea es analizar el inventario de productos de un negocio con sus respectivos costos diarios y precios de venta actuales, y ofrecer recomendaciones inteligentes.

Información del negocio proporcionada por el usuario:
${contexto ? `Contexto extra del negocio: ${contexto}` : 'No se especificó contexto adicional, asume un minimarket o tienda de abarrotes de barrio general.'}

Lista de productos actuales en stock y su rentabilidad:
${productos.map((p: any) => {
      const costo = p.costo_actual || 0;
      const precio = p.precio || 0;
      const margenDeseado = p.margen_deseado || 30;
      const precioSugerido = costo > 0 ? costo * (1 + margenDeseado / 100) : 0;
      const margenRealPorcentaje = precio > 0 && costo > 0 ? ((precio - costo) / precio) * 100 : 0;
      const stock = p.stock_actual || 0;
      const unidad = p.unidad || 'unid';

      return `- **${p.nombre}**:
    * Unidad: ${unidad}
    * Stock actual: ${stock.toFixed(2)} ${unidad}
    * Costo actual: $${costo.toFixed(2)}
    * Precio de venta actual: $${precio.toFixed(2)}
    * Margen deseado: ${margenDeseado}%
    * Precio de venta sugerido (según margen deseado): $${precioSugerido.toFixed(2)}
    * Margen real actual: ${margenRealPorcentaje.toFixed(2)}%
  `;
    }).join('\n')}

Por favor, estructura tus recomendaciones en los siguientes apartados usando un formato Markdown profesional, limpio y con una estética moderna:

1. 💸 **Análisis de Rentabilidad y Precios**:
   - Identifica productos donde el precio de venta actual esté por debajo del costo o con márgenes reales peligrosamente bajos.
   - Señala qué productos necesitan un ajuste inmediato de precios.
   
2. 📦 **Estrategia de Rotación de Stock**:
   - Analiza los productos con niveles de stock más altos y sugiere formas de acelerar su venta.
   
3. 📣 **Propuestas de Promociones e Ideas de Marketing**:
   - Ofrece ideas de combos, ofertas cruzadas (cross-selling) o promociones específicas combinando productos de alto stock o margen alto con otros.
   - Da sugerencias de mensajes persuasivos (como carteles en la tienda o publicaciones de redes sociales) que el comerciante pueda usar.

Mantén un tono optimista, motivador y sumamente práctico para un comerciante local. Usa pesos chilenos ($) o la moneda local configurada de forma genérica (ej: $3.500) y redondea a números enteros o flotantes de 2 dígitos según corresponda.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ sugerencias: text });
  } catch (error: any) {
    console.error('Error en API de marketing:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor al procesar la solicitud con Gemini' },
      { status: 500 }
    );
  }
}
