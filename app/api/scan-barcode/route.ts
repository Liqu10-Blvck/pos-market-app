import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: 'Se requiere una imagen en formato base64' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'La clave de API de Gemini (GEMINI_API_KEY) no está configurada.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const prompt = `
    Extract the EAN or UPC barcode number from this cropped image. 
    Look for EAN-13, EAN-8, UPC, or Code-128 barcode digits.
    Return strictly a JSON object with a single key "sku":
    {
      "sku": "digits only as a string" // e.g. "7803403003868" or null if no barcode is visible or readable
    }
    Do not add markdown formatting, comments, or extra keys.
    `;

    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType
        }
      }
    ]);

    const responseText = result.response.text().trim();

    try {
      const parsedData = JSON.parse(responseText);
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error('Error al parsear respuesta de Gemini Barcode:', responseText, parseError);
      return NextResponse.json(
        { error: 'Error al interpretar respuesta de la IA', raw: responseText },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error en api/scan-barcode:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
