const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = 45_000;

type GeminiTextPart = {
  text: string;
};

type GeminiInlineDataPart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

export type GeminiPart = GeminiTextPart | GeminiInlineDataPart;

export type GeminiContent = {
  role: 'user' | 'model';
  parts: GeminiPart[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function getResponseText(payload: Record<string, unknown>) {
  if (!Array.isArray(payload.candidates)) {
    return null;
  }

  for (const candidate of payload.candidates) {
    if (!isObject(candidate) || !isObject(candidate.content) || !Array.isArray(candidate.content.parts)) {
      continue;
    }

    for (const part of candidate.content.parts) {
      if (isObject(part) && typeof part.text === 'string' && part.text.trim()) {
        return part.text;
      }
    }
  }

  return null;
}

function stripJsonFence(value: string) {
  const trimmed = value.trim();

  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
}

export function getGeminiModelName() {
  return Deno.env.get('GEMINI_MODEL') ?? DEFAULT_GEMINI_MODEL;
}

export async function buildGeminiImagePartFromUrl(imageUrl: string): Promise<GeminiInlineDataPart> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Не удалось получить изображение для Gemini: ${response.status}.`);
  }

  const mimeType =
    response.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
  const buffer = await response.arrayBuffer();

  return {
    inlineData: {
      mimeType,
      data: arrayBufferToBase64(buffer),
    },
  };
}

async function fetchGemini(input: {
  apiKey: string;
  model: string;
  body: Record<string, unknown>;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': input.apiKey,
        },
        body: JSON.stringify(input.body),
        signal: controller.signal,
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `Gemini вернул ошибку ${response.status}: ${responseText || 'пустой ответ'}`
      );
    }

    const parsed = JSON.parse(responseText) as Record<string, unknown>;
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Время ожидания ответа Gemini истекло. Попробуйте ещё раз.');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateGeminiJson<T>(input: {
  apiKey: string;
  model?: string;
  systemInstruction: string;
  contents: GeminiContent[];
  responseJsonSchema: Record<string, unknown>;
  temperature?: number;
}) {
  const model = input.model ?? getGeminiModelName();
  const rawPayload = await fetchGemini({
    apiKey: input.apiKey,
    model,
    body: {
      systemInstruction: {
        parts: [{ text: input.systemInstruction }],
      },
      contents: input.contents,
      generationConfig: {
        temperature: input.temperature ?? 0.2,
        responseMimeType: 'application/json',
        responseJsonSchema: input.responseJsonSchema,
      },
    },
  });

  const responseText = getResponseText(rawPayload);

  if (!responseText) {
    throw new Error('Gemini не вернул структурированный JSON-ответ.');
  }

  try {
    return {
      modelName: model,
      rawPayload,
      parsed: JSON.parse(stripJsonFence(responseText)) as T,
    };
  } catch {
    throw new Error('Не удалось разобрать JSON из ответа Gemini.');
  }
}

export async function generateGeminiText(input: {
  apiKey: string;
  model?: string;
  systemInstruction: string;
  contents: GeminiContent[];
  temperature?: number;
  maxOutputTokens?: number;
}) {
  const model = input.model ?? getGeminiModelName();
  const rawPayload = await fetchGemini({
    apiKey: input.apiKey,
    model,
    body: {
      systemInstruction: {
        parts: [{ text: input.systemInstruction }],
      },
      contents: input.contents,
      generationConfig: {
        temperature: input.temperature ?? 0.4,
        maxOutputTokens: input.maxOutputTokens ?? 900,
      },
    },
  });

  const responseText = getResponseText(rawPayload);

  if (!responseText) {
    throw new Error('Gemini не вернул текстовый ответ.');
  }

  return {
    modelName: model,
    rawPayload,
    text: responseText.trim(),
  };
}
