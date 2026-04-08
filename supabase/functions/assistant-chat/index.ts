import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  buildGeminiImagePartFromUrl,
  generateGeminiText,
  getGeminiModelName,
  type GeminiContent,
} from '../_shared/gemini.ts';
import { getBearerToken } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STORAGE_BUCKET = 'plant-photos';
const HISTORY_LIMIT = 12;

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
};

type CatalogRow = {
  id: string;
  name_ru: string;
  name_latin: string;
  category: string;
  description: string;
  watering_interval_min: number;
  watering_interval_max: number;
  light_level: string;
  humidity_level: string;
  temperature_min: number;
  temperature_max: number;
  care_tips: string;
  risk_notes: string;
  soil_type: string;
  fertilizing_info: string;
  spraying_needed: boolean;
  pet_safe: boolean;
  difficulty_level: string;
};

type CatalogSymptomRow = {
  symptom_name_ru: string;
  possible_cause: string;
  recommended_action: string;
};

type ChatThreadRow = {
  id: string;
  user_id: string;
  plant_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
};

type ChatMessageRow = {
  id: string;
  thread_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  image_path: string | null;
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

function normalizeThread(row: ChatThreadRow) {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: 'synced',
    remoteUpdatedAt: row.updated_at,
  };
}

function normalizeMessage(row: ChatMessageRow) {
  return {
    id: row.id,
    threadId: row.thread_id,
    userId: row.user_id,
    role: row.role,
    text: row.text,
    imagePath: row.image_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: 'synced',
    remoteUpdatedAt: row.updated_at,
  };
}

function buildPlantContext(plant: PlantRow) {
  return [
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

function buildCatalogContext(
  catalogPlant: CatalogRow | null,
  symptoms: CatalogSymptomRow[]
) {
  if (!catalogPlant) {
    return 'Справочный контекст по виду растения не найден.';
  }

  const symptomLines =
    symptoms.length > 0
      ? symptoms
          .slice(0, 5)
          .map(
            (symptom) =>
              `- ${symptom.symptom_name_ru}: причина — ${symptom.possible_cause}; действие — ${symptom.recommended_action}`
          )
          .join('\n')
      : 'Нет типовых симптомов.';

  return [
    `Русское название: ${catalogPlant.name_ru}`,
    `Латинское название: ${catalogPlant.name_latin}`,
    `Категория: ${catalogPlant.category}`,
    `Описание: ${catalogPlant.description}`,
    `Типовой полив: примерно раз в ${catalogPlant.watering_interval_min}-${catalogPlant.watering_interval_max} дней`,
    `Типовой свет: ${catalogPlant.light_level}`,
    `Типовая влажность: ${catalogPlant.humidity_level}`,
    `Типовая температура: ${catalogPlant.temperature_min}-${catalogPlant.temperature_max}°C`,
    `Советы по уходу: ${catalogPlant.care_tips}`,
    `Типичные риски: ${catalogPlant.risk_notes}`,
    `Грунт: ${catalogPlant.soil_type}`,
    `Подкормка: ${catalogPlant.fertilizing_info}`,
    `Опрыскивание: ${catalogPlant.spraying_needed ? 'обычно полезно' : 'обычно не требуется'}`,
    `Безопасно для животных: ${catalogPlant.pet_safe ? 'да' : 'нет'}`,
    `Сложность ухода: ${catalogPlant.difficulty_level}`,
    `Типовые симптомы:\n${symptomLines}`,
  ].join('\n');
}

function buildSystemInstruction(
  plant: PlantRow | null,
  catalogPlant: CatalogRow | null,
  catalogSymptoms: CatalogSymptomRow[]
) {
  return [
    'Ты русскоязычный помощник по уходу за комнатными растениями.',
    'Отвечай спокойно, понятно и по делу.',
    'Не ставь категоричных диагнозов и не советуй сомнительные или опасные действия.',
    'Если данных недостаточно, честно скажи об этом и попроси уточнение.',
    'Если пользователь прислал фото, можешь учитывать визуальные признаки, но подчёркивай вероятностный характер вывода.',
    plant ? `Контекст растения:\n${buildPlantContext(plant)}` : 'Контекст растения не задан.',
    plant
      ? `Справочный контекст вида:\n${buildCatalogContext(catalogPlant, catalogSymptoms)}`
      : 'Справочный контекст вида отсутствует.',
  ].join('\n\n');
}

function buildThreadTitle(input: {
  plant: PlantRow | null;
  text: string;
  hasImage: boolean;
}) {
  if (input.plant) {
    return `Помощник: ${input.plant.name}`;
  }

  const trimmed = input.text.trim();

  if (trimmed) {
    return trimmed.slice(0, 60);
  }

  return input.hasImage ? 'Диалог по фото растения' : 'Новый диалог';
}

function buildHistoryContents(messages: ChatMessageRow[]): GeminiContent[] {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => {
      const parts: { text: string }[] = [];

      if (message.text.trim()) {
        parts.push({ text: message.text.trim() });
      } else if (message.image_path) {
        parts.push({ text: 'Пользователь прислал изображение растения без текста.' });
      }

      return {
        role: message.role === 'assistant' ? 'model' : 'user',
        parts,
      } satisfies GeminiContent;
    })
    .filter((content) => content.parts.length > 0);
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
        'Функция помощника не настроена. Проверьте secrets SUPABASE_URL, SUPABASE_ANON_KEY и GEMINI_API_KEY.',
    });
  }

  if (!authHeader || !accessToken) {
    return jsonResponse(401, {
      error: 'Для работы помощника нужна активная авторизация пользователя.',
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  let stage = 'auth';

  try {
    const { data, error: claimsError } = await supabase.auth.getClaims(accessToken);
    const userId = getUserIdFromClaims(data?.claims);

    if (claimsError || !userId) {
      return jsonResponse(401, {
        error: 'Не удалось определить пользователя по текущей сессии.',
      });
    }

    stage = 'parse_body';
    const body = await request.json().catch(() => null);

    if (!isObject(body)) {
      return jsonResponse(400, {
        error: 'Запрос помощника имеет некорректный формат.',
      });
    }

    const threadId =
      typeof body.threadId === 'string' && body.threadId.trim()
        ? body.threadId.trim()
        : globalThis.crypto.randomUUID();
    const plantId =
      typeof body.plantId === 'string' && body.plantId.trim() ? body.plantId.trim() : null;
    const userText = typeof body.text === 'string' ? body.text.trim() : '';
    const imagePath =
      typeof body.imagePath === 'string' && body.imagePath.trim() ? body.imagePath.trim() : null;

    if (!userText && !imagePath) {
      return jsonResponse(400, {
        error: 'Введите сообщение или прикрепите фото перед отправкой.',
      });
    }

    if (imagePath && !imagePath.startsWith(`${userId}/`)) {
      return jsonResponse(403, {
        error: 'Нельзя использовать чужое изображение в сообщении.',
      });
    }

    let plant: PlantRow | null = null;
    let catalogPlant: CatalogRow | null = null;
    let catalogSymptoms: CatalogSymptomRow[] = [];

    if (plantId) {
      stage = 'load_plant';
      const { data: nextPlant, error: plantError } = await supabase
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
            photo_path
          `
        )
        .eq('id', plantId)
        .eq('user_id', userId)
        .maybeSingle<PlantRow>();

      if (plantError) {
        throw plantError;
      }

      if (!nextPlant) {
        return jsonResponse(404, {
          error: 'Растение для чата не найдено или доступ к нему запрещён.',
        });
      }

      plant = nextPlant;
    }

    stage = 'load_thread';
    const { data: existingThread, error: threadError } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('id', threadId)
      .eq('user_id', userId)
      .maybeSingle<ChatThreadRow>();

    if (threadError) {
      throw threadError;
    }

    if (existingThread?.plant_id && plantId && existingThread.plant_id !== plantId) {
      return jsonResponse(400, {
        error: 'Этот диалог уже привязан к другому растению.',
      });
    }

    const effectivePlantId = existingThread?.plant_id ?? plantId;

    if (!plant && effectivePlantId) {
      stage = 'load_effective_plant';
      const { data: nextPlant, error: plantError } = await supabase
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
            photo_path
          `
        )
        .eq('id', effectivePlantId)
        .eq('user_id', userId)
        .maybeSingle<PlantRow>();

      if (plantError) {
        throw plantError;
      }

      plant = nextPlant ?? null;
    }

    if (plant?.catalog_plant_id) {
      stage = 'load_catalog';
      const [{ data: nextCatalogPlant, error: catalogError }, { data: nextCatalogSymptoms, error: symptomsError }] =
        await Promise.all([
          supabase
            .from('plant_catalog')
            .select(
              `
                id,
                name_ru,
                name_latin,
                category,
                description,
                watering_interval_min,
                watering_interval_max,
                light_level,
                humidity_level,
                temperature_min,
                temperature_max,
                care_tips,
                risk_notes,
                soil_type,
                fertilizing_info,
                spraying_needed,
                pet_safe,
                difficulty_level
              `
            )
            .eq('id', plant.catalog_plant_id)
            .maybeSingle<CatalogRow>(),
          supabase
            .from('plant_catalog_symptoms')
            .select('symptom_name_ru, possible_cause, recommended_action')
            .eq('plant_catalog_id', plant.catalog_plant_id)
            .limit(5),
        ]);

      if (!catalogError) {
        catalogPlant = nextCatalogPlant ?? null;
      }

      if (!symptomsError) {
        catalogSymptoms = (nextCatalogSymptoms ?? []) as CatalogSymptomRow[];
      }
    }

    stage = 'load_messages';
    const { data: recentMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT);

    if (messagesError) {
      throw messagesError;
    }

    const orderedMessages = ((recentMessages ?? []) as ChatMessageRow[]).reverse();
    const contents: GeminiContent[] = buildHistoryContents(orderedMessages);
    const currentParts: GeminiContent['parts'] = [];

    if (userText) {
      currentParts.push({ text: userText });
    }

    if (imagePath) {
      stage = 'load_image';
      const imageUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(imagePath).data.publicUrl;
      currentParts.push(await buildGeminiImagePartFromUrl(imageUrl));
    }

    if (!currentParts.length) {
      currentParts.push({ text: 'Пожалуйста, помоги разобраться с этим растением.' });
    }

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    stage = 'gemini';
    const { text: assistantText, modelName } = await generateGeminiText({
      apiKey: geminiApiKey,
      model: getGeminiModelName(),
      systemInstruction: buildSystemInstruction(plant, catalogPlant, catalogSymptoms),
      contents,
      temperature: 0.4,
      maxOutputTokens: 900,
    });

    const now = new Date().toISOString();
    const threadPayload = {
      id: threadId,
      user_id: userId,
      plant_id: effectivePlantId,
      title:
        existingThread?.title ??
        buildThreadTitle({ plant, text: userText, hasImage: Boolean(imagePath) }),
      updated_at: now,
    };

    stage = 'upsert_thread';
    const { data: savedThread, error: savedThreadError } = await supabase
      .from('chat_threads')
      .upsert(
        {
          ...threadPayload,
          created_at: existingThread?.created_at ?? now,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single<ChatThreadRow>();

    if (savedThreadError) {
      throw savedThreadError;
    }

    const userMessageRow = {
      id: globalThis.crypto.randomUUID(),
      thread_id: threadId,
      user_id: userId,
      role: 'user' as const,
      text: userText,
      image_path: imagePath,
      created_at: now,
      updated_at: now,
    };

    const assistantMessageRow = {
      id: globalThis.crypto.randomUUID(),
      thread_id: threadId,
      user_id: userId,
      role: 'assistant' as const,
      text: assistantText,
      image_path: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    stage = 'insert_messages';
    const { error: insertMessagesError } = await supabase
      .from('chat_messages')
      .insert([userMessageRow, assistantMessageRow]);

    if (insertMessagesError) {
      throw insertMessagesError;
    }

    stage = 'touch_thread';
    const { error: touchThreadError } = await supabase
      .from('chat_threads')
      .update({ updated_at: assistantMessageRow.updated_at })
      .eq('id', threadId)
      .eq('user_id', userId);

    if (touchThreadError) {
      throw touchThreadError;
    }

    return jsonResponse(200, {
      modelName,
      thread: normalizeThread({
        ...savedThread,
        updated_at: assistantMessageRow.updated_at,
      }),
      messages: [normalizeMessage(userMessageRow), normalizeMessage(assistantMessageRow)],
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Не удалось получить ответ помощника.';

    console.error('assistant-chat failed', {
      stage,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : null,
    });

    return jsonResponse(500, {
      error: errorMessage,
      stage,
    });
  }
});
