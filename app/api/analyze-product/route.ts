import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: 'La imagen en formato base64 es requerida' },
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

    // Parsear el string base64 para extraer datos puros y el mime type
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
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
Analiza la imagen de este producto de abarrotes. Tu tarea es extraer la información relevante para crear el producto en un sistema de inventario (POS).
Debes devolver únicamente un objeto JSON con las siguientes propiedades exactas:

- "nombre": El nombre comercial exacto y completo del producto (por ejemplo, "Leche Entera Soprole 1L" o "Fideos Carozzi Espiral 400g"). Intenta incluir marca, tipo y tamaño/peso si es visible.
- "sku": Si hay un código de barras impreso en el envase visible en la imagen, detecta el número (suele ser un número EAN-13 de 13 dígitos o UPC de 12 dígitos) y devuélvelo como un string de dígitos. Si no está visible o no se puede leer, devuelve null.
- "fecha_caducidad": Si en el envase se muestra impresa la fecha de vencimiento/caducidad (buscando textos como "VENCE:", "VAL:", "EXP:", "F. VENC:", etc.), detecta el día, mes y año y devuélvelo formateado estrictamente como "YYYY-MM-DD". Si no se ve la fecha, o el producto es fresco y no tiene fecha de caducidad estricta impresa en el envase, devuelve null.
- "tiene_vencimiento": Un booleano (true o false) que indica si este tipo de producto tiene una fecha de caducidad física impresa normalmente en el envase (por ejemplo, los abarrotes como leche, yogur o conservas tienen vencimiento, mientras que frutas y verduras frescas o sal de mesa no suelen tener vencimiento estricto).

Recuerda: Tu respuesta debe ser estrictamente un objeto JSON válido que coincida con este esquema, sin bloques de código de markdown ni explicaciones adicionales.
`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
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
      { error: error.message || 'Error interno del servidor al procesar la imagen' },
      { status: 500 }
    );
  }
}
