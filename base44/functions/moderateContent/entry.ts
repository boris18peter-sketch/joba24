import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { text, imageUrl } = body;

    // Text moderation via InvokeLLM (Hebrew-aware)
    if (text && text.trim().length > 1) {
      const prompt = `You are a strict content safety filter for Joba24 - a Hebrew job marketplace in Israel.

Analyze the text below and flag it if it contains ANY of:
1. Sexual or explicit content
2. Violence, threats, or calls to harm
3. Insults, harassment, or degrading language directed at a person (e.g. stupid, idiot, psycho, worthless, disgusting, moron, etc.)
4. Hate speech targeting any group
5. Profanity used as an attack or insult

IMPORTANT:
- Hebrew job descriptions and normal conversation are NOT flagged
- Factual/neutral descriptions are NOT flagged
- Mild frustration without personal attack is NOT flagged
- The word "כלב" (dog) is a common Hebrew word for a pet animal and is NOT an insult — do NOT flag it
- Only flag "כלבה" or "בן כלבה" when used as a direct insult toward a person
- When in doubt about personal insults or harassment - flag it

Text:
"""${text}"""`;

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            flagged: { type: 'boolean' },
            reason: { type: 'string' }
          },
          required: ['flagged']
        }
      });
      if (result?.flagged) {
        return Response.json({ flagged: true, reason: result.reason || 'תוכן לא הולם', type: 'text' });
      }
    }

    // Image moderation via vision LLM
    if (imageUrl) {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are an image content safety filter. Does this image contain: nudity, sexual content, graphic violence, blood, weapons, or drugs? Reply with JSON only. Be strict — only flag obvious violations.`,
        file_urls: [imageUrl],
        response_json_schema: {
          type: 'object',
          properties: {
            flagged: { type: 'boolean' },
            reason: { type: 'string' }
          },
          required: ['flagged']
        }
      });
      if (result?.flagged) {
        return Response.json({ flagged: true, reason: result.reason || 'תוכן חזותי לא הולם', type: 'image' });
      }
    }

    return Response.json({ flagged: false });
  } catch (_) {
    return Response.json({ flagged: false });
  }
});