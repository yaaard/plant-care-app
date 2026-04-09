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
} from '../_shared/plant-ai-analysis-schema.ts';
import { normalizeAiActionArray } from '../_shared/ai-action-schema.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RECENT_ANALYSIS_REUSE_MS = 60_000;
const STORAGE_BUCKET = 'plant-photos';
const SYMPTOM_LIMIT = 3;

type PlantRow = {
  id: string;
  name: string;
  species: string;
  catalog_plant_id: string | null;
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

type CatalogRow = {
  id: string;
  name_ru: string;
  name_latin: string;
  category: string;
  watering_interval_min: number;
  watering_interval_max: number;
  light_level: string;
  humidity_level: string;
  temperature_min: number;
  temperature_max: number;
  care_tips: string;
  risk_notes: string;
};

type CatalogSymptomRow = {
  symptom_name_ru: string;
  possible_cause: string;
  recommended_action: string;
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
  actions: unknown[] | null;
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

function createActionId() {
  return globalThis.crypto.randomUUID();
}

function trimText(value: string | null | undefined, maxLength: number) {
  return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function compactText(label: string, value: string | null | undefined, maxLength = 120) {
  const normalized = trimText(value, maxLength);
  return normalized ? `${label}:${normalized}` : '';
}

function compactPlantContext(plant: PlantRow) {
  return [
    compactText('имя', plant.name, 60),
    compactText('вид', plant.species, 80),
    compactText('полив', `${plant.watering_interval_days}д;посл:${plant.last_watering_date ?? '-'}`, 60),
    compactText('свет', plant.light_condition, 60),
    compactText('влажн', plant.humidity_condition, 60),
    compactText('темп', plant.room_temperature, 40),
    compactText('риск', plant.risk_level, 20),
    compactText('теги', plant.condition_tags, 80),
    compactText('заметка', plant.custom_care_comment || plant.notes, 140),
  ]
    .filter(Boolean)
    .join('; ');
}

function compactCatalogContext(catalogPlant: CatalogRow | null, symptoms: CatalogSymptomRow[]) {
  if (!catalogPlant) {
    return '';
  }

  const symptomSummary = symptoms
    .slice(0, SYMPTOM_LIMIT)
    .map((symptom) => {
      const name = trimText(symptom.symptom_name_ru, 40);
      const cause = trimText(symptom.possible_cause, 60);
      const action = trimText(symptom.recommended_action, 70);
      return [name, cause && `пр:${cause}`, action && `д:${action}`].filter(Boolean).join('|');
    })
    .join('; ');

  return [
    compactText('каталог', `${catalogPlant.name_ru}/${catalogPlant.name_latin}`, 90),
    compactText(
      'уход',
      `${catalogPlant.watering_interval_min}-${catalogPlant.watering_interval_max}д;${catalogPlant.light_level};${catalogPlant.humidity_level};${catalogPlant.temperature_min}-${catalogPlant.temperature_max}C`,
      110
    ),
    compactText('совет', catalogPlant.care_tips, 140),
    compactText('риск', catalogPlant.risk_notes, 120),
    compactText('симптомы', symptomSummary, 220),
  ]
    .filter(Boolean)
    .join('; ');
}

function getSystemInstruction(input: {
  plantId: string;
  catalogPlantId: string | null;
}) {
  return [
    'Ты анализируешь фото комнатного растения.',
    'Отвечай только JSON по схеме.',
    'Пиши по-русски.',
    'Без категоричных диагнозов.',
    'Используй мягкие формулировки и отмечай неопределенность.',
    'actions только из списка: create_task, update_watering_interval, mark_attention, open_catalog_entry, open_plant_details, open_schedule, dismiss.',
    'Не больше 3 actions.',
    `Для plant-зависимых actions используй plantId=${input.plantId}.`,
    input.catalogPlantId
      ? `Для open_catalog_entry используй catalogPlantId=${input.catalogPlantId}.`
      : 'Если нет catalogPlantId, не добавляй open_catalog_entry.',
  ].join(' ');
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
    actions: normalizeAiActionArray(row.actions ?? [], {
      plantId: row.plant_id,
      createdAt: row.created_at,
      createId: createActionId,
    }),
    confidenceNote: row.confidence_note,
    rawJson: JSON.stringify(row.raw_json ?? {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: 'synced',
    remoteUpdatedAt: row.updated_at,
  };
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
          catalog_plant_id,
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
        error: 'Растение не найдено или доступ к нему запрещен.',
      });
    }

    let catalogPlant: CatalogRow | null = null;
    let catalogSymptoms: CatalogSymptomRow[] = [];

    if (plant.catalog_plant_id) {
      const [
        { data: nextCatalogPlant, error: catalogError },
        { data: nextCatalogSymptoms, error: symptomsError },
      ] = await Promise.all([
        supabase
          .from('plant_catalog')
          .select(
            `
              id,
              name_ru,
              name_latin,
              category,
              watering_interval_min,
              watering_interval_max,
              light_level,
              humidity_level,
              temperature_min,
              temperature_max,
              care_tips,
              risk_notes
            `
          )
          .eq('id', plant.catalog_plant_id)
          .maybeSingle<CatalogRow>(),
        supabase
          .from('plant_catalog_symptoms')
          .select('symptom_name_ru, possible_cause, recommended_action')
          .eq('plant_catalog_id', plant.catalog_plant_id)
          .limit(SYMPTOM_LIMIT),
      ]);

      if (!catalogError) {
        catalogPlant = nextCatalogPlant ?? null;
      }

      if (!symptomsError) {
        catalogSymptoms = (nextCatalogSymptoms ?? []) as CatalogSymptomRow[];
      }
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
    const now = new Date().toISOString();
    const promptText = [
      'Анализ фото растения. Верни только JSON.',
      compactText('растение', compactPlantContext(plant), 260),
      compactText('справочник', compactCatalogContext(catalogPlant, catalogSymptoms), 300),
    ]
      .filter(Boolean)
      .join('\n');

    const { modelName, parsed, rawPayload } = await generateGeminiJson<unknown>({
      apiKey: geminiApiKey,
      model: getGeminiModelName(),
      systemInstruction: getSystemInstruction({
        plantId,
        catalogPlantId: plant.catalog_plant_id,
      }),
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: promptText,
            },
            imagePart,
          ],
        },
      ],
      responseJsonSchema: PLANT_AI_ANALYSIS_JSON_SCHEMA as Record<string, unknown>,
      temperature: 0.1,
      maxOutputTokens: 700,
    });

    const normalized = normalizePlantAiStructuredResult(parsed, {
      plantId,
      catalogPlantId: plant.catalog_plant_id,
      createId: createActionId,
      createdAt: now,
    });

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
      actions: normalized.actions,
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
