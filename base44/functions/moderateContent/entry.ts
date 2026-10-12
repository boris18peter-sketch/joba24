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
      const prompt = `You are a content safety reviewer for Joba24, a Hebrew home-services marketplace in Israel where people describe repair, cleaning, moving and maintenance jobs.

Read the text in full and judge its MEANING. This is a work marketplace: an ordinary task description is never a violation, however blunt it is.

FLAG only when the text itself contains:
1. Sexual or explicit content, or a sexual solicitation
2. A threat of violence, or a call to harm a person
3. A direct insult, harassment or degrading language aimed AT A PERSON (e.g. "מניאק", "מטומטם", "שרמוטה", "idiot", "moron")
4. Hate speech targeting a group
5. Profanity used as an attack on a person

NEVER FLAG:
- Ordinary descriptions of damage, dirt, leaks, sewage, pests, mould, smells, broken or blocked fixtures. Words such as "מתחת" (underneath), "זבל"/"אשפה" (rubbish), "לפרוץ" (break into a locked door), "רגיל" (regular), "דפוק" (broken) are NORMAL here and are NOT violations.
- A complaint about a product, a place or a situation (e.g. "המקום מסריח", "העבודה דפוקה")
- A person describing their own problem, anger or frustration without insulting anyone
- A quote or a report of what somebody else said
- Animals mentioned by name (כלב, כלבה, חזיר, בהמה)

A word that CAN be vulgar is not a violation when the sentence uses its ordinary meaning. If the text has no clear target and no explicit content, it is NOT flagged.

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