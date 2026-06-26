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

    const { cliente, compras } = await req.json();

    if (!cliente) {
      return NextResponse.json(
        { error: 'Los datos del cliente son requeridos' },
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
Eres un asesor comercial inteligente y consultor de fidelización de clientes para minimarkets y distribuidoras en Chile. Tu objetivo es proponer ofertas comerciales exclusivas y personalizadas para un cliente en particular, basándote en su perfil de negocio, su historial de compras con nosotros y su comportamiento de pago.

Datos del Cliente:
- Nombre: ${cliente.nombre}
- Nombre del Negocio: ${cliente.nombre_negocio || 'No especificado'}
- Rubro/Giro del Negocio: ${cliente.rubro_negocio || 'No especificado'}
- Dirección: ${cliente.direccion || 'No especificada'}
- Saldo Deudor Actual (Fiado): $${cliente.saldo_deuda}
- Límite de Crédito: $${cliente.limite_credito || 'Sin límite definido'}

Historial de Compras Recientes (Últimas transacciones):
${JSON.stringify(compras.map((c: any) => ({
  fecha: c.fecha && c.fecha.seconds ? new Date(c.fecha.seconds * 1000).toLocaleDateString('es-CL') : 'N/A',
  total: c.total,
  metodo_pago: c.metodo_pago,
  productos: c.items.map((i: any) => `${i.nombre} (${i.cantidad || i.peso_bruto || 1} ${i.unidad})`)
})), null, 2)}

Por favor, genera un informe ejecutivo directo y personalizado en formato Markdown que contenga:
1. **Análisis de Perfil**: Diagnóstico del cliente (frecuencia, volumen de compra, rubro y riesgo crediticio si tiene saldo).
2. **Productos Clave**: Identifica qué productos o categorías compra más o suele llevar con nosotros.
3. **Estrategia & Oferta Personalizada**: Propón una o dos promociones o incentivos específicos diseñados para este cliente (por ejemplo, "Descuento del 10% en sacos de papas si paga su deuda antes del viernes" o "Descuento en volumen para su negocio").
4. **Mensaje de Fidelización**: Redacta una propuesta de mensaje directo para enviarle por WhatsApp o decirle en persona que suene natural, amable y atractivo.

Sé profesional, conciso y utiliza expresiones típicas de los negocios locales en Chile (ej. fiado, mercadería, bultos, etc.).
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ recommendation: text });
  } catch (error: any) {
    console.error('Error en clientes-ai API:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor al procesar la solicitud de IA.' },
      { status: 500 }
    );
  }
}
