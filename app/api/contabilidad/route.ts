import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifySession } from '@/lib/api-auth';
import { AsientoContable, MovimientoContable } from '@/lib/types/contabilidad';
import { ConsultaIALog } from '@/lib/types/pos';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const userSession = await verifySession(req, 'admin');
    if (!userSession) {
      return NextResponse.json(
        { error: 'No autorizado. Solo los administradores activos pueden consultar asesoría contable.' },
        { status: 401 }
      );
    }

    const { success } = checkRateLimit(userSession.uid, 5, 60000);
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Límite de 5 consultas contables por minuto alcanzado. Por favor, espera un momento.' },
        { status: 429 }
      );
    }

    const { kpis, asientos, pregunta, historial } = await req.json();

    if (!kpis) {
      return NextResponse.json(
        { error: 'Los datos financieros (KPIs) son requeridos' },
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
    // Usar el modelo gemini-3.1-flash-lite para análisis de datos financieros (ultra económico y con alta cuota)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

    // Formatear pesos chilenos para el prompt
    const fmt = (num: number) => {
      return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(num);
    };

    // Construir la sección de historial de conversación si existe
    const historialStr = historial && Array.isArray(historial) && historial.length > 0
      ? `\n---
HISTORIAL DE CONSULTAS ANTERIORES (Usa este contexto para responder de forma hilvanada, objetiva y no repetir consejos ya dados):
${(historial as ConsultaIALog[]).map((h: ConsultaIALog) => `* Comerciante: "${h.pregunta}"\n* Asistente IA (Tú): "${h.respuesta}"`).join('\n')}\n---`
      : '';

    // Construir la sección de movimientos recientes
    const recentAsientos = asientos && Array.isArray(asientos)
      ? (asientos as AsientoContable[]).slice(0, 15).map((a: AsientoContable) => {
          const dateStr = a.fecha && a.fecha.seconds 
            ? new Date(a.fecha.seconds * 1000).toLocaleDateString('es-CL') 
            : 'N/A';
          const movs = a.movimientos.map((m: MovimientoContable) => 
            `  * [${m.cuenta_codigo}] ${m.cuenta_nombre}: Debe ${fmt(m.debe)} | Haber ${fmt(m.haber)}`
          ).join('\n');
          return `- **Asiento ${a.tipo.toUpperCase()} N° ${a.numero_asiento || ''} (${dateStr})**: "${a.glosa}"\n${movs}`;
        }).join('\n')
      : 'Sin transacciones registradas.';

    const prompt = `
Eres un Asesor Financiero e Ingeniero Comercial experto en contabilidad de partida doble y tributaria para pequeños comercios y minimarkets locales.
Tu objetivo es analizar la situación financiera actual del negocio a partir de sus saldos contables consolidados y transacciones recientes, y ofrecer un diagnóstico claro, consejos prácticos para optimizar el negocio y respuestas a las consultas del comerciante.

---
### ESTADO FINANCIERO CONSOLIDADO (SALDOS):
- **Ventas Totales (Ingreso Neto acumulado):** ${fmt(kpis.ventas)}
- **Costo de Ventas (Costo de Mercaderías vendidas):** ${fmt(kpis.costoVentas)}
- **Utilidad Bruta:** ${fmt(kpis.utilidadBruta)}
- **Gastos Generales (Gastos Fijos/Egresos):** ${fmt(kpis.gastosGenerales)}
- **Utilidad Neta (Ganancia Real final):** ${fmt(kpis.utilidadNeta)}

---
### SITUACIÓN PATRIMONIAL Y LIQUIDEZ:
- **Efectivo en Caja:** ${fmt(kpis.caja)}
- **Saldo en Banco:** ${fmt(kpis.banco)}
- **Valor del Inventario en Bodega (Mercaderías):** ${fmt(kpis.mercaderias)}
- **Cuentas por Cobrar (Deuda al Fiado de Clientes):** ${fmt(kpis.clientes)}
- **Cuentas por Pagar (Deuda a Proveedores):** ${fmt(kpis.proveedores)}

---
### ANÁLISIS DE IVA Y TRIBUTACIÓN:
- **IVA Crédito Fiscal (Acumulado en Compras):** ${fmt(kpis.ivaCredito)}
- **IVA Débito Fiscal (Acumulado en Ventas):** ${fmt(kpis.ivaDebito)}
- **IVA Neto a Pagar/Favor:** ${kpis.ivaNeto > 0 ? `${fmt(kpis.ivaNeto)} por pagar (Débito > Crédito)` : `${fmt(Math.abs(kpis.ivaNeto))} remanente a favor (Crédito > Débito)`}

---
### ÚLTIMAS TRANSACCIONES REGISTRADAS (LIBRO DIARIO RECIENTE):
${recentAsientos}

---
${historialStr}

---
### PREGUNTA O ENFOQUE DEL COMERCIANTE:
"${pregunta || 'Realiza un diagnóstico de salud financiera general del negocio y da 3 consejos inmediatos para aumentar ganancias y reducir costos.'}"

---

Por favor, elabora tu informe estructurado con el siguiente formato Markdown, usando un lenguaje claro, alentador y profesional. Redondea todos los números a valores enteros:

1. 📊 **Diagnóstico de Salud Financiera**:
   - Evalúa si el negocio es rentable (margen neto vs ventas).
   - Analiza la liquidez (caja + banco) en relación a las deudas con proveedores.
   - Evalúa el riesgo de fiados (cuentas por cobrar clientes) y nivel de inventario en bodega.

2. 💰 **Análisis Impositivo (IVA)**:
   - Explica de forma sencilla la situación del IVA este período.
   - Si tiene IVA por pagar, sugiere cómo optimizarlo legalmente en compras futuras (compras con factura). Si tiene remanente, explica qué significa y cómo aprovecharlo.

3. 🎯 **Recomendaciones Personalizadas para el Negocio**:
   - Entrega 3 estrategias específicas en base a la rentabilidad y gastos del negocio.
   - Da ideas para optimizar el inventario o disminuir cuentas por cobrar (fiado).

4. 💬 **Respuesta a la Consulta Directa**:
   - Responde de forma detallada e individualizada a la pregunta o enfoque del comerciante.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ diagnostico: text });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor al procesar la consulta financiera';
    console.error('Error en API de contabilidad:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
