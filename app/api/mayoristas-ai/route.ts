import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifySession } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const userSession = await verifySession(req);
    if (!userSession) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión con un usuario activo.' },
        { status: 401 }
      );
    }

    const { productos } = await req.json();

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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

    const prompt = `
Eres un asesor de marketing y control de costos para minimarkets y negocios de barrio en Chile. Tu especialidad es analizar precios mayoristas de mercados distribuidores (como Lo Valledor o Vega Central) y recomendar estrategias accionables.

Tengo una tabla comparativa con los precios mayoristas del día (referencia) y mis costos y precios de venta actuales locales. Analízala detalladamente y bríndame un informe ejecutivo muy breve, directo y práctico con recomendaciones.

Puntos a considerar en tu respuesta:
1. **Oportunidades de Compra**: Identifica qué productos están significativamente más baratos en el mercado mayorista respecto a nuestro costo actual local, y sugiere si es buen momento para comprar en volumen o renegociar con el proveedor.
2. **Alertas de Margen / Pérdidas**: Identifica si nuestro costo local es superior al precio mayorista (lo que indicaría que estamos pagando de más) o si el margen local es muy estrecho.
3. **Recomendaciones de Venta**: Sugiere ajustes rápidos a los precios de venta locales para maximizar ganancias sin perder competitividad.

Por favor, sé conciso y usa Markdown para dar un formato profesional y legible.

Lista de productos y precios comparativos:
${productos.map((p: any) => {
      const diff = p.costo_local - p.precio_referencia;
      const diffPct = p.precio_referencia > 0 ? ((diff / p.precio_referencia) * 100).toFixed(0) : '0';
      return `- **${p.nombre}**:
    * Tu Costo Local: $${p.costo_local}
    * Tu Precio Venta Local: $${p.precio_venta_local}
    * Precio Referencia Mayorista: $${p.precio_referencia}
    * Diferencia de Costo: $${diff > 0 ? `+${diff}` : diff} (${diffPct}%)
  `;
    }).join('\n')}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ recomendaciones: text });
  } catch (error: any) {
    console.error('Error en mayoristas-ai API:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor al procesar la solicitud de IA.' },
      { status: 500 }
    );
  }
}
