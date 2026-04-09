import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  buildGeminiImagePartFromUrl,
  generateGeminiJson,
  getGeminiModelName,
  type GeminiContent,
} from '../_shared/gemini.ts';
import { getBearerToken } from '../_shared/auth.ts';
import {
  ASSISTANT_CHAT_JSON_SCHEMA,
  normalizeAssistantChatStructuredResult,
} from '../_shared/assistant-chat-schema.ts';
import { normalizeAiActionArray } from '../_shared/ai-action-schema.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STORAGE_BUCKET = 'plant-photos';
const HISTORY_LIMIT = 8;
const HISTORY_TEXT_LIMIT = 220;
const CURRENT_TEXT_LIMIT = 500;
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
  actions: unknown[] | null;
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
    compactText('тип', catalogPlant.category, 40),
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

function buildSystemInstruction(plant: PlantRow | null, catalogPlant: CatalogRow | null) {
  const plantRule = plant
    ? `plantId=${plant.id}`
    : 'без plantId-зависимых actions';
  const catalogRule = catalogPlant
    ? `catalogPlantId=${catalogPlant.id}`
    : 'без open_catalog_entry';

  return [
    'Ты помощник по комнатным растениям.',
    'Отвечай по-русски.',
    'Верни только JSON по схеме.',
    'Коротко и по делу.',
    'Без категоричных диагнозов.',
    'Если данных мало, прямо скажи это.',
    'actions только из списка: create_task, update_watering_interval, mark_attention, open_catalog_entry, open_plant_details, open_schedule, dismiss.',
    'Не придумывай другие actions.',
    'Не больше 3 actions.',
    'Добавляй actions только если их реально можно полезно применить прямо сейчас.',
    'Если полезного app-действия нет, верни пустой массив actions.',
    'Для create_task используй только taskType: watering, spraying, fertilizing, repotting, inspection.',
    'Для create_task в description кратко объясняй, зачем нужна эта задача именно сейчас.',
    'Не используй расплывчатые названия вроде "Хорошо", "Сделать", "Совет".',
    'Название и описание action должны быть конкретными и связанными с уходом.',
    `Правила payload: ${plantRule}; ${catalogRule}.`,
  ].join(' ');
}

function buildThreadTitle(input: {
  plant: PlantRow | null;
  text: string;
  hasImage: boolean;
}) {
  if (input.plant) {
    return `Помощник: ${input.plant.name}`;
  }

  const trimmed = trimText(input.text, 60);
  if (trimmed) {
    return trimmed;
  }

  return input.hasImage ? 'Диалог по фото растения' : 'Новый диалог';
}

function buildHistoryContents(messages: ChatMessageRow[]): GeminiContent[] {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => {
      const text = trimText(message.text, HISTORY_TEXT_LIMIT);
      const parts: { text: string }[] = [];

      if (text) {
        parts.push({ text });
      } else if (message.image_path) {
        parts.push({ text: 'Фото растения.' });
      }

      return {
        role: message.role === 'assistant' ? 'model' : 'user',
        parts,
      } satisfies GeminiContent;
    })
    .filter((content) => content.parts.length > 0);
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

function normalizeMessage(row: ChatMessageRow, context: { plantId?: string | null; createdAt?: string }) {
  return {
    id: row.id,
    threadId: row.thread_id,
    userId: row.user_id,
    role: row.role,
    text: row.text,
    imagePath: row.image_path,
    actions: normalizeAiActionArray(row.actions ?? [], {
      plantId: context.plantId,
      createId: createActionId,
      createdAt: context.createdAt ?? row.created_at,
    }),
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
    const userText = trimText(typeof body.text === 'string' ? body.text : '', CURRENT_TEXT_LIMIT);
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
          error: 'Растение для чата не найдено или доступ к нему запрещен.',
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
              description,
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

    const contextLines = [
      compactText('растение', plant ? compactPlantContext(plant) : '', 240),
      compactText('справочник', compactCatalogContext(catalogPlant, catalogSymptoms), 280),
    ].filter(Boolean);

    if (contextLines.length > 0) {
      currentParts.push({
        text: contextLines.join('\n'),
      });
    }

    if (userText) {
      currentParts.push({ text: userText });
    }

    if (imagePath) {
      stage = 'load_image';
      const imageUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(imagePath).data.publicUrl;
      currentParts.push(await buildGeminiImagePartFromUrl(imageUrl));
    }

    if (!currentParts.length) {
      currentParts.push({ text: 'Помоги с этим растением.' });
    }

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    stage = 'gemini';
    const now = new Date().toISOString();
    const { modelName, parsed } = await generateGeminiJson<unknown>({
      apiKey: geminiApiKey,
      model: getGeminiModelName(),
      systemInstruction: buildSystemInstruction(plant, catalogPlant),
      contents,
      responseJsonSchema: ASSISTANT_CHAT_JSON_SCHEMA as Record<string, unknown>,
      temperature: 0.3,
      maxOutputTokens: 650,
    });

    const structuredResult = normalizeAssistantChatStructuredResult(parsed, {
      plantId: effectivePlantId,
      catalogPlantId: plant?.catalog_plant_id ?? catalogPlant?.id ?? null,
      createId: createActionId,
      createdAt: now,
    });

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
      actions: [],
      created_at: now,
      updated_at: now,
    };

    const assistantMessageRow = {
      id: globalThis.crypto.randomUUID(),
      thread_id: threadId,
      user_id: userId,
      role: 'assistant' as const,
      text: structuredResult.reply,
      image_path: null,
      actions: structuredResult.actions,
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
      messages: [
        normalizeMessage(userMessageRow, {
          plantId: effectivePlantId,
          createdAt: userMessageRow.created_at,
        }),
        normalizeMessage(assistantMessageRow, {
          plantId: effectivePlantId,
          createdAt: assistantMessageRow.created_at,
        }),
      ],
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
