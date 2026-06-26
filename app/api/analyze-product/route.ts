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

    const { image, images } = await req.json();

    const base64Images: string[] = images || (image ? [image] : []);

    if (base64Images.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos una imagen en formato base64' },
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
    // Usar el modelo gemini-2.5-flash para análisis multimodal de alta velocidad
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const prompt = `
Analiza la o las imágenes de este producto de abarrotes o documento de cotización/factura de compra. Tu tarea es extraer la información relevante para crear o reponer el producto en un sistema de inventario (POS).
Se te pueden proporcionar fotos del envase del producto (por ejemplo, el frente, el código de barras, etc.) o fotos del documento comercial (factura, cotización o recibo de compra). Integra la información disponible.

CRITICAL PARA PRODUCTOS A GRANEL O VENDIDOS POR PESO (KILOGRAMOS):
Si identificas un producto como papas, cebollas, zanahorias, frutas o verduras que típicamente se compran en formatos grandes (sacos, mallas, cajas de madera) pero se venden al detalle por kilo:
1. El precio/costo del saco entero (ej. $10.000 por un saco de 25kg) debe asignarse a "costo_caja".
2. La cantidad de kilos del saco (ej. 25) debe ir en "cantidad_por_caja".
3. El "costo_unitario" (costo por kilo) debe ser calculado dividiendo el costo del saco por la cantidad de kilos (ej. 10000 / 25 = 400 pesos por kilo). NUNCA dejes el costo del saco entero en "costo_unitario", de lo contrario se asumirá que el kilo cuesta $10.000 pesos.

Debes devolver únicamente un objeto JSON con las siguientes propiedades exactas:

- "nombre": El nombre comercial exacto y completo del producto (por ejemplo, "Leche Entera Soprole 1L" o "Fideos Carozzi Espiral 400g"). Si la imagen es una cotización o factura, extrae el nombre del artículo.
- "sku": Si hay un código de barras visible en las fotos del envase o un código SKU en el documento de compra, detecta el número y devuélvelo como un string de dígitos. Si no, devuelve null.
- "fecha_caducidad": Si en el envase o documento se muestra impresa la fecha de vencimiento, detecta el día, mes y año y devuélvelo formateado estrictamente como "YYYY-MM-DD". Si no, devuelve null.
- "tiene_vencimiento": Un booleano (true o false) que indica si este tipo de producto tiene una fecha de caducidad física normalmente (los lácteos, embutidos y conservas tienen vencimiento; las frutas, verduras o sal no).
- "tipo_empaque": El tipo de empaque o contenedor del producto detectado ("Caja", "Saco", "Malla", "Bandeja", "Paquete" o null si no se puede determinar).
- "cantidad_por_caja": La cantidad de unidades o kilogramos que contiene el empaque completo (por ejemplo, 12 si es una caja de 12 litros de leche, o 25 si es un saco de 25 kg. Si es un documento de compra, lee la cantidad por bulto especificada. Si no, devuelve null).
- "costo_caja": El costo total del empaque o caja completa (número entero, por ejemplo, el costo del saco o de la caja de 12 unidades). Si es visible en la cotización/factura, extráelo. Si no, devuelve null.
- "costo_unitario": El costo unitario neto de cada unidad o kilogramo individual (ej. costo por kg si es fruta/verdura). Si no viene explícito pero tienes el costo de la caja y la cantidad por caja, divídelos y redondéalo a entero. Si no, devuelve null.
- "precio_sugerido_unidad": El precio de venta sugerido al público por unidad o kilogramo individual, si es visible o si es sugerido en el documento. Si no, devuelve null.

Recuerda: Tu respuesta debe ser estrictamente un objeto JSON válido que coincida con este esquema, sin bloques de código de markdown ni explicaciones adicionales.
`;

    // Mapear todas las imágenes base64 a partes multimodales de Gemini
    const imageParts = base64Images.map(imgStr => {
      let mimeType = 'image/jpeg';
      let base64Data = imgStr;

      if (imgStr.startsWith('data:')) {
        const match = imgStr.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }
      }

      return {
        inlineData: {
          data: base64Data,
          mimeType
        }
      };
    });

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();

    try {
      const parsedData = JSON.parse(responseText.trim());
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error('Error al parsear respuesta de Gemini Vision:', responseText, parseError);
      return NextResponse.json(
        {
          error: 'La respuesta de la IA no pudo ser interpretada como JSON.',
          rawResponse: responseText
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error al analizar producto con Gemini Vision:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor al procesar las imágenes' },
      { status: 500 }
    );
  }
}
