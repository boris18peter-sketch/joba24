import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { text, imageUrl } = body;

    // Text moderation via InvokeLLM (Hebrew-aware)
    if (text && text.trim().length > 2) {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a strict content safety filter for Joba24 - a Hebrew job marketplace in Israel.

Analyze the text below and flag it ONLY if it CLEARLY contains:
1. Explicit violence, serious threats, or direct calls to harm people
2. Sexual/explicit/pornographic content
3. Severe hate speech or harassment targeting a person/group
4. Complete random gibberish (keyboard mashing, random chars with no meaning whatsoever) — BUT Hebrew is valid, typos are OK, short texts are OK

IMPORTANT RULES:
- Hebrew job descriptions are NEVER flagged
- Short texts (under 10 chars) are NEVER flagged
- Typos and spelling mistakes are NOT a reason to flag
- Mild profanity alone is NOT a reason to flag
- Be VERY lenient — only flag obvious clear violations

Text:
"""${text}"""`,
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
    // Fail open — don't block users on API errors
    return Response.json({ flagged: false });
  }
});