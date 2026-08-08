import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Script detection — used to verify cached location_name is in the target language
const SCRIPT_RANGES: Record<string, [number, number][]> = {
  he: [[0x0590, 0x05FF]],
  ar: [[0x0600, 0x06FF], [0x0750, 0x077F]],
  ru: [[0x0400, 0x04FF]],
  hi: [[0x0900, 0x097F]],
  zh: [[0x4E00, 0x9FFF], [0x3400, 0x4DBF]],
};

function matchesScript(text: string, lang: string): boolean {
  const ranges = SCRIPT_RANGES[lang];
  if (!ranges) return false;
  for (const [start, end] of ranges) {
    for (let i = 0; i < text.length; i++) {
      const code = text.codePointAt(i);
      if (code !== undefined && code >= start && code <= end) return true;
    }
  }
  return false;
}

const LANG_NAMES: Record<string, string> = {
  he: 'Hebrew',
  en: 'English',
  ar: 'Arabic',
  ru: 'Russian',
  es: 'Spanish',
  fr: 'French',
  hi: 'Hindi',
  zh: 'Chinese',
  fil: 'Filipino',
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { task_id, target_lang } = body || {};
    if (!task_id || !target_lang) {
      return Response.json({ error: 'missing task_id or target_lang' }, { status: 400 });
    }

    // Load task — any authenticated user may view any task
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: task_id });
    const task = tasks && tasks[0];
    if (!task) return Response.json({ error: 'task not found' }, { status: 404 });

    const locText = task.location_name || '';

    // Return cached translation if present — BUT only if the cached location_name
    // is already in the target language script. If the location is still in a
    // different script (e.g. Hebrew city name on a Russian task), the previous
    // translation likely skipped the location — re-translate to fix it.
    const cached = task.translations && task.translations[target_lang];
    if (cached && cached.title != null && cached.description != null) {
      const cachedLoc = cached.location_name || '';
      const locInTargetScript = !locText || !SCRIPT_RANGES[target_lang] || matchesScript(cachedLoc, target_lang);
      if (locInTargetScript) {
        return Response.json({
          title: cached.title,
          description: cached.description,
          location_name: cached.location_name || task.location_name || null,
          source_lang: cached.source_lang || null,
          was_translated: cached.was_translated !== false,
          from_cache: true,
        });
      }
      // Location not in target script — fall through to re-translate
    }

    const targetName = LANG_NAMES[target_lang] || target_lang;
    const titleText = task.title || '';
    const descText = task.description || '';

    const prompt = `You are a translation engine for a freelance services marketplace app (Joba24). Translate the following task title, description, and location into ${targetName}.

Rules:
- Translate each field (title, description, location_name) INDEPENDENTLY into ${targetName}.
- If a field is already in ${targetName}, keep it unchanged.
- Set was_translated to true if ANY field was translated (changed). Set to false ONLY if ALL three fields were already in ${targetName}.
- For location_name, ALWAYS translate/transliterate place names and city names into ${targetName}, even if the title and description are already in ${targetName}. Examples: "הרצליה" → "Герцлия" in Russian, "Wingate" → "Вингейт" in Russian, "Herzliya" → "हर्ज़लिया" in Hindi.
- Detect the source language and return its ISO 639-1 code (he, en, ar, ru, es, fr, hi, zh, fil).
- Preserve meaning, tone, formatting (line breaks), phone numbers, addresses, prices, and any structured lines.
- Do not add commentary or notes — only return the JSON.

Return JSON with this exact schema:
{ "title": string, "description": string, "location_name": string, "source_lang": string, "was_translated": boolean }

TITLE:
${titleText}

DESCRIPTION:
${descText}

LOCATION_NAME:
${locText}`;

    const llmResult: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          location_name: { type: 'string' },
          source_lang: { type: 'string' },
          was_translated: { type: 'boolean' },
        },
        required: ['title', 'description', 'source_lang', 'was_translated'],
      },
    });

    const translation = llmResult && llmResult.data ? llmResult.data : llmResult;

    // Cache on the task entity — shared across all users/devices for this language
    const existingTranslations = task.translations || {};
    existingTranslations[target_lang] = {
      title: translation.title,
      description: translation.description,
      location_name: translation.location_name || task.location_name || '',
      source_lang: translation.source_lang,
      was_translated: translation.was_translated,
    };
    await base44.asServiceRole.entities.Task.update(task_id, { translations: existingTranslations });

    return Response.json({
      title: translation.title,
      description: translation.description,
      location_name: translation.location_name || task.location_name || null,
      source_lang: translation.source_lang,
      was_translated: translation.was_translated,
      from_cache: false,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}