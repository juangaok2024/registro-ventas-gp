// lib/ai-detector.ts
import Groq from 'groq-sdk';
import { ParsedSaleData } from '@/types/sales';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MIN_WORDS_FOR_ANALYSIS = 5;

const SYSTEM_PROMPT = `Eres un analizador de mensajes de ventas para un grupo de WhatsApp.
Tu tarea es determinar si un mensaje es un reporte de venta y extraer los datos estructurados.

Un mensaje de venta típicamente contiene información como:
- Nombre del cliente
- Email o correo
- Teléfono
- Monto/precio (con moneda USD, ARS, EUR)
- Producto
- Funnel/origen
- Medio de pago
- Tipo de pago (completo, cuotas)
- Extras
- Status

IMPORTANTE: Solo considera un mensaje como venta si contiene AL MENOS:
1. Un nombre de cliente
2. Un monto/precio

Responde SOLO con JSON válido, sin markdown ni texto adicional.`;

const USER_PROMPT = `Analiza este mensaje y determina si es un reporte de venta.

Mensaje:
"""
{MESSAGE}
"""

Responde con este JSON exacto:
{
  "isSale": boolean,
  "confidence": number (0-1),
  "data": {
    "clientName": string o null,
    "clientEmail": string o null,
    "clientPhone": string o null,
    "amount": number o null,
    "currency": "USD" | "ARS" | "EUR" o null,
    "product": string o null,
    "funnel": string o null,
    "paymentMethod": string o null,
    "paymentType": string o null,
    "extras": string o null
  },
  "reason": string (breve explicación)
}`;

export interface AIDetectionResult {
  isSale: boolean;
  confidence: number;
  data: ParsedSaleData | null;
  reason: string;
  tokensUsed?: number;
}

/**
 * Analiza un mensaje con IA para detectar si es una venta
 */
export async function detectSaleWithAI(message: string): Promise<AIDetectionResult> {
  // Si el mensaje es muy corto, no vale la pena analizarlo
  const wordCount = message.trim().split(/\s+/).length;
  if (wordCount < MIN_WORDS_FOR_ANALYSIS) {
    return {
      isSale: false,
      confidence: 1,
      data: null,
      reason: `Mensaje muy corto (${wordCount} palabras)`,
    };
  }

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant', // Rápido y gratis
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: USER_PROMPT.replace('{MESSAGE}', message) },
      ],
      temperature: 0.1, // Baja temperatura para respuestas consistentes
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const result = JSON.parse(content);

    // Convertir el resultado al formato esperado
    const parsedData: ParsedSaleData | null = result.isSale && result.data ? {
      clientName: result.data.clientName || '',
      clientEmail: result.data.clientEmail || '',
      clientPhone: result.data.clientPhone || '',
      amount: result.data.amount || 0,
      currency: result.data.currency || 'USD',
      product: result.data.product || '',
      funnel: result.data.funnel || '',
      paymentMethod: result.data.paymentMethod || '',
      paymentType: result.data.paymentType || '',
      extras: result.data.extras || '',
      hasCheckmark: message.includes('✅'),
    } : null;

    return {
      isSale: result.isSale,
      confidence: result.confidence,
      data: parsedData,
      reason: result.reason,
      tokensUsed: response.usage?.total_tokens,
    };
  } catch (error) {
    console.error('AI detection error:', error);
    return {
      isSale: false,
      confidence: 0,
      data: null,
      reason: `Error en análisis IA: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Verifica si el servicio de IA está disponible
 */
export function isAIEnabled(): boolean {
  return !!process.env.GROQ_API_KEY;
}
