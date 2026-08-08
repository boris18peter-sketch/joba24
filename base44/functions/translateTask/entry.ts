import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

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

    // Return cached translation if present
    const cached = task.translations && task.translations[target_lang];
    if (cached && cached.title != null && cached.description != null) {
      return Response.json({
        title: cached.title,
        description: cached.description,
        location_name: cached.location_name || task.location_name || null,
        source_lang: cached.source_lang || null,
        was_translated: cached.was_translated !== false,
        from_cache: true,
      });
    }

    const targetName = LANG_NAMES[target_lang] || target_lang;
    const titleText = task.title || '';
    const descText = task.description || '';
    const locText = task.location_name || '';

    const prompt = `You are a translation engine for a freelance services marketplace app (Joba24). Translate the following task title, description, and location into ${targetName}.

Rules:
- If the content is already in ${targetName}, return it unchanged and set was_translated to false.
- Otherwise translate to ${targetName} and set was_translated to true.
- Detect the source language and return its ISO 639-1 code (he, en, ar, ru, es, fr, hi, zh, fil).
- Preserve meaning, tone, formatting (line breaks), phone numbers, addresses, prices, and any structured lines.
- For location_name, translate/transliterate place names and city names naturally for the target language (e.g. "Herzliya" → "हर्ज़लिया" in Hindi).
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