import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { verifySession } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const userSession = await verifySession(req);
    if (!userSession) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión con un usuario activo.' },
        { status: 401 }
      );
    }

    const { success } = checkRateLimit(userSession.uid, 5, 60000);
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Límite de 5 análisis de planillas por minuto alcanzado. Por favor, espera un momento.' },
        { status: 429 }
      );
    }

    const { rawRows, catalogProducts } = await req.json();

    if (!rawRows || !Array.isArray(rawRows)) {
      return NextResponse.json(
        { error: 'La lista de productos crudos del Excel es requerida' },
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
    
    // Define the schema for structured JSON output
    const responseSchema = {
      type: SchemaType.ARRAY,
      description: "Lista de productos mapeados y con costos unitarios calculados",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: {
            type: SchemaType.STRING,
            description: "ID de catálogo del producto si coincide, o un ID temporal inventado tipo 'new_nombre' si es un producto nuevo"
          },
          nombre: {
            type: SchemaType.STRING,
            description: "Nombre del producto del catálogo (o nombre formateado si es nuevo)"
          },
          costo_local: {
            type: SchemaType.NUMBER,
            description: "Costo actual del producto en el catálogo local (0 si es nuevo)"
          },
          precio_venta_local: {
            type: SchemaType.NUMBER,
            description: "Precio de venta actual del producto en el catálogo local (0 si es nuevo)"
          },
          es_interes: {
            type: SchemaType.BOOLEAN,
            description: "Indica si el producto está marcado como es_interes en el catálogo local"
          },
          precio_referencia: {
            type: SchemaType.NUMBER,
            description: "Precio de costo unitario de referencia mayorista (calculado dividiendo precioRefFull por el empaque)"
          },
          precio_referencia_full: {
            type: SchemaType.NUMBER,
            description: "Precio total del bulto del Excel"
          },
          unidad_comercializacion: {
            type: SchemaType.STRING,
            description: "Unidad de comercialización original"
          },
          unidad: {
            type: SchemaType.STRING,
            description: "Unidad de medida para venta al detalle: 'kg' si se vende al peso/kilo (ej. si el formato es en kg/kilos), o 'unid' si se vende por unidades, atados, cabezas, etc."
          },
          tipo_empaque: {
            type: SchemaType.STRING,
            description: "Tipo de contenedor mayorista (ej. 'Caja', 'Saco', 'Malla', 'Atado', 'Bandeja', 'Mazo', 'Cabeza', 'Cajón', 'Unidad')"
          },
          cantidad_por_caja: {
            type: SchemaType.NUMBER,
            description: "Cantidad de unidades o kilogramos contenidos en el contenedor mayorista completo (ej. 12 para una docena de atados, 10 para saco de 10 kg, 1 para unidad)"
          },
          noExisteEnCatalogo: {
            type: SchemaType.BOOLEAN,
            description: "true si el producto no se encuentra en el catálogo local y se propone agregarlo, false si ya existe"
          },
          calidad: {
            type: SchemaType.STRING,
            description: "Calidad o grado del producto extraído del Excel (puede ser vacío si no hay dato de calidad)"
          }
        },
        required: [
          "id",
          "nombre",
          "costo_local",
          "precio_venta_local",
          "es_interes",
          "precio_referencia",
          "precio_referencia_full",
          "unidad_comercializacion",
          "unidad",
          "tipo_empaque",
          "cantidad_por_caja",
          "noExisteEnCatalogo",
          "calidad"
        ]
      }
    };

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema as any
      }
    });

    const prompt = `
Eres un analista de datos de abastecimiento para almacenes y minimarkets en Chile. Tu tarea es analizar una lista de productos mayoristas de mercados distribuidores (como Lo Valledor o Vega Central) extraídos de un archivo Excel, y mapearla con el catálogo de productos local del negocio.

Instrucciones de análisis:
1. **Fuzzy Matching Semántico (Coincidencia de Nombres):**
   - Compara el nombre del producto del Excel (ej: "Ajo Chino", "Ajo Corriente") con los nombres de mi catálogo local.
   - Si coinciden semánticamente, asócialos. Usa el 'id', 'costo_actual' (asígnase a 'costo_local') y 'precio' (asígnase a 'precio_venta_local') de ese producto de catálogo. Establece 'noExisteEnCatalogo' en false.
   - Si NO hay coincidencia en el catálogo local (es un producto nuevo que no vendo), inventa un ID temporal descriptivo único (ej: "new_acelga", "new_limon_sutil"), usa costo_local = 0, precio_venta_local = 0, y establece 'noExisteEnCatalogo' en true.
2. **Cálculo de Precio Unitario de Referencia:**
   - La columna 'unidadCom' (unidad de comercialización original) indica cómo se vende el bulto (ej. "$/docena de atados", "$/caja 10 kilos", "$/paquete 36 unidades", "$/unidad").
   - Calcula el precio unitario ('precio_referencia') dividiendo el precio del bulto ('precioRefFull') por el divisor de unidades de empaque.
   - Si dice "docena", divide por 12.
   - Si contiene un número como "10 kilos", "36 unidades", "25 kilos", divide por ese número (10, 36, 25).
   - Si dice "unidad" o no se especifica divisor, divide por 1.
   - Redondea el precio unitario al entero más cercano.
3. **Detalles de Empaque y Unidades de Venta:**
   - Determina 'unidad' (debe ser exactamente 'kg' o 'unid'). Si la unidad original de comercialización indica peso (ej: kilos, kg, saco 20 kg, caja 18 kg), usa 'kg'. Si indica unidades, atados, cabezas, etc. (ej: docena, atado, unidad, mazo), usa 'unid'.
   - Determina 'tipo_empaque' (ej: 'Caja', 'Saco', 'Malla', 'Atado', 'Mazo', 'Cabeza', 'Cajón', 'Unidad') analizando la unidad original (ej. "docena de atados" -> 'Atado', "caja 10 kilos" -> 'Caja', "saco 15 kg" -> 'Saco').
   - Determina 'cantidad_por_caja' (la cantidad de kilos o unidades por empaque, ej. 12 para docena, 10 para caja de 10 kg).
4. **Cobertura total (OBLIGATORIO):** Debes incluir en el resultado TODOS y cada uno de los ${rawRows.length} productos del array 'Lista de productos crudos'. NO omitas ninguna fila bajo ninguna circunstancia. Si un producto parece no ser agrícola o no tiene contexto claro, igualmente inclúyelo con los datos que tengas y establece noExisteEnCatalogo en true.
5. **Calidad:** Copia el campo 'calidad' de cada rawRow directamente al campo 'calidad' del resultado. Si el campo está vacío, deja calidad como string vacío.

Catálogo local de productos activos del negocio:
${JSON.stringify(catalogProducts.map((p: any) => ({ id: p.id, nombre: p.nombre, costo_actual: p.costo_actual || 0, precio: p.precio || 0, es_interes: !!p.es_interes })), null, 2)}

Lista de productos crudos leídos del Excel mayorista:
${JSON.stringify(rawRows, null, 2)}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    interface ParsedMayoristaItem {
      id: string;
      nombre: string;
      costo_local: number;
      precio_venta_local: number;
      es_interes: boolean;
      precio_referencia: number;
      precio_referencia_full: number;
      unidad_comercializacion: string;
      unidad: string;
      tipo_empaque: string;
      cantidad_por_caja: number;
      noExisteEnCatalogo: boolean;
      calidad: string;
    }

    const parsedResult: ParsedMayoristaItem[] = JSON.parse(text);

    // Asegurar identificadores únicos para evitar duplicados de keys en React
    const seenIds = new Set<string>();
    const cleanedResult = parsedResult.map((item: ParsedMayoristaItem) => {
      let finalId = item.id;
      // Si el id ya fue visto, o si es un producto nuevo / id genérico, le asignamos uno único
      if (item.noExisteEnCatalogo || finalId.startsWith('new_') || seenIds.has(finalId)) {
        finalId = `new_${Math.random().toString(36).substring(2, 11)}`;
      }
      seenIds.add(finalId);
      return {
        ...item,
        id: finalId
      };
    });

    return NextResponse.json(cleanedResult);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor al procesar la solicitud de IA.';
    console.error('Error en mayoristas-parser API:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
