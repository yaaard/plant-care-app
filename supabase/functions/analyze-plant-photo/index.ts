import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  buildGeminiImagePartFromUrl,
  generateGeminiJson,
  getGeminiModelName,
} from '../_shared/gemini.ts';
import { getBearerToken } from '../_shared/auth.ts';
import {
  normalizePlantAiStructuredResult,
  PLANT_AI_ANALYSIS_JSON_SCHEMA,
} from '../../../shared/plant-ai-analysis-schema.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RECENT_ANALYSIS_REUSE_MS = 60_000;
const STORAGE_BUCKET = 'plant-photos';

type PlantRow = {
  id: string;
  name: string;
  species: string;
  notes: string;
  light_condition: string;
  humidity_condition: string;
  room_temperature: string;
  condition_tags: string;
  custom_care_comment: string;
  risk_level: string;
  last_watering_date: string | null;
  watering_interval_days: number;
  photo_path: string | null;
  photo_url: string | null;
};

type AnalysisRow = {
  id: string;
  user_id: string;
  plant_id: string;
  photo_path: string | null;
  model_name: string;
  summary: string;
  overall_condition: 'healthy' | 'needs_attention' | 'at_risk';
  urgency: 'low' | 'medium' | 'high';
  observed_signs: string[] | null;
  possible_causes: string[] | null;
  watering_advice: string;
  light_advice: string;
  humidity_advice: string;
  recommended_actions: string[] | null;
  confidence_note: string;
  raw_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getUserIdFromClaims(
  claims:
    | {
        sub?: unknown;
      }
    | null
    | undefined
) {
  return typeof claims?.sub === 'string' && claims.sub.trim() ? claims.sub.trim() : null;
}

function mapAnalysisRow(row: AnalysisRow) {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    photoPath: row.photo_path,
    modelName: row.model_name,
    summary: row.summary,
    overallCondition: row.overall_condition,
    urgency: row.urgency,
    observedSigns: row.observed_signs ?? [],
    possibleCauses: row.possible_causes ?? [],
    wateringAdvice: row.watering_advice,
    lightAdvice: row.light_advice,
    humidityAdvice: row.humidity_advice,
    recommendedActions: row.recommended_actions ?? [],
    confidenceNote: row.confidence_note,
    rawJson: JSON.stringify(row.raw_json ?? {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: 'synced',
    remoteUpdatedAt: row.updated_at,
  };
}

function buildPlantContext(plant: PlantRow) {
  return [
    'Контекст по растению:',
    `Название: ${plant.name}`,
    `Вид: ${plant.species}`,
    `Последний полив: ${plant.last_watering_date ?? 'не указан'}`,
    `Интервал полива: ${plant.watering_interval_days} дней`,
    `Освещение: ${plant.light_condition || 'не указано'}`,
    `Влажность: ${plant.humidity_condition || 'не указана'}`,
    `Температура: ${plant.room_temperature || 'не указана'}`,
    `Теги состояния: ${plant.condition_tags || '[]'}`,
    `Уровень риска: ${plant.risk_level || 'не указан'}`,
    `Заметки: ${plant.custom_care_comment || plant.notes || 'нет'}`,
  ].join('\n');
}

function getSystemInstruction() {
  return [
    'Ты помогаешь анализировать фотографии комнатных растений.',
    'Отвечай только валидным JSON по заданной схеме.',
    'Пиши на русском языке.',
    'Не ставь категоричных диагнозов.',
    'Используй мягкие формулировки: "по фото можно предположить", "возможная причина", "стоит проверить", "рекомендуется обратить внимание".',
    'Если уверенность низкая, отражай это в confidence_note.',
    'Не добавляй поля вне схемы.',
  ].join(' ');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, {
      error: 'Поддерживается только метод POST.',
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey =
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  const authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization');
  const accessToken = getBearerToken(authHeader);

  if (!supabaseUrl || !supabaseAnonKey || !geminiApiKey) {
    return jsonResponse(500, {
      error:
        'Функция анализа не настроена. Проверьте secrets SUPABASE_URL, SUPABASE_ANON_KEY и GEMINI_API_KEY.',
    });
  }

  if (!authHeader || !accessToken) {
    return jsonResponse(401, {
      error: 'Для AI-анализа нужна активная авторизация пользователя.',
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  try {
    const { data, error: claimsError } = await supabase.auth.getClaims(accessToken);
    const userId = getUserIdFromClaims(data?.claims);

    if (claimsError || !userId) {
      return jsonResponse(401, {
        error: 'Не удалось определить пользователя по текущей сессии.',
      });
    }

    const body = await request.json().catch(() => null);

    if (!isObject(body) || typeof body.plantId !== 'string' || !body.plantId.trim()) {
      return jsonResponse(400, {
        error: 'Нужно передать корректный plantId для анализа фото.',
      });
    }

    const plantId = body.plantId.trim();
    const { data: plant, error: plantError } = await supabase
      .from('plants')
      .select(
        `
          id,
          name,
          species,
          notes,
          light_condition,
          humidity_condition,
          room_temperature,
          condition_tags,
          custom_care_comment,
          risk_level,
          last_watering_date,
          watering_interval_days,
          photo_path,
          photo_url
        `
      )
      .eq('id', plantId)
      .eq('user_id', userId)
      .maybeSingle<PlantRow>();

    if (plantError) {
      throw plantError;
    }

    if (!plant) {
      return jsonResponse(404, {
        error: 'Растение не найдено или доступ к нему запрещён.',
      });
    }

    const photoPath = plant.photo_path ?? null;
    const photoUrl =
      plant.photo_url ??
      (photoPath
        ? supabase.storage.from(STORAGE_BUCKET).getPublicUrl(photoPath).data.publicUrl
        : null);

    if (!photoUrl) {
      return jsonResponse(400, {
        error:
          'У растения нет фотографии в облаке. Сначала добавьте фото и синхронизируйте его.',
      });
    }

    const { data: recentAnalysis, error: recentAnalysisError } = await supabase
      .from('plant_ai_analyses')
      .select('*')
      .eq('user_id', userId)
      .eq('plant_id', plantId)
      .eq('photo_path', photoPath)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<AnalysisRow>();

    if (recentAnalysisError) {
      throw recentAnalysisError;
    }

    if (recentAnalysis) {
      const recentTimestamp = Date.parse(recentAnalysis.created_at);

      if (!Number.isNaN(recentTimestamp) && Date.now() - recentTimestamp < RECENT_ANALYSIS_REUSE_MS) {
        return jsonResponse(200, {
          analysis: mapAnalysisRow(recentAnalysis),
          reused: true,
        });
      }
    }

    const imagePart = await buildGeminiImagePartFromUrl(photoUrl);
    const { modelName, parsed, rawPayload } = await generateGeminiJson<unknown>({
      apiKey: geminiApiKey,
      model: getGeminiModelName(),
      systemInstruction: getSystemInstruction(),
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: [
                'Проанализируй фото комнатного растения и верни только JSON по схеме.',
                buildPlantContext(plant),
              ].join('\n\n'),
            },
            imagePart,
          ],
        },
      ],
      responseJsonSchema: PLANT_AI_ANALYSIS_JSON_SCHEMA as Record<string, unknown>,
      temperature: 0.2,
    });

    const normalized = normalizePlantAiStructuredResult(parsed);
    const now = new Date().toISOString();
    const rowToInsert = {
      id: globalThis.crypto.randomUUID(),
      user_id: userId,
      plant_id: plantId,
      photo_path: photoPath,
      model_name: modelName,
      summary: normalized.summary,
      overall_condition: normalized.overall_condition,
      urgency: normalized.urgency,
      observed_signs: normalized.observed_signs,
      possible_causes: normalized.possible_causes,
      watering_advice: normalized.watering_advice,
      light_advice: normalized.light_advice,
      humidity_advice: normalized.humidity_advice,
      recommended_actions: normalized.recommended_actions,
      confidence_note: normalized.confidence_note,
      raw_json: {
        provider: 'gemini',
        gemini_model: modelName,
        structured_result: normalized,
        raw_response: rawPayload,
      },
      created_at: now,
      updated_at: now,
    };

    const { data: insertedAnalysis, error: insertError } = await supabase
      .from('plant_ai_analyses')
      .insert(rowToInsert)
      .select('*')
      .single<AnalysisRow>();

    if (insertError) {
      throw insertError;
    }

    return jsonResponse(200, {
      analysis: mapAnalysisRow(insertedAnalysis),
      reused: false,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Не удалось выполнить AI-анализ растения.';

    return jsonResponse(500, {
      error: errorMessage,
    });
  }
});
