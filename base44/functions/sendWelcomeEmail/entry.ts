import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = user.email;
    const name = user.full_name || 'חבר';
    if (!email) return Response.json({ sent: false, reason: 'No email' });

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,Arial,sans-serif;background:#f2f5fb;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:0 0 20px 20px;overflow:hidden;box-shadow:0 4px 24px rgba(15,40,107,0.08);">
    <div style="background:linear-gradient(135deg,#1a6fd4,#0a52b0);padding:36px 24px 28px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">🎉</div>
      <h1 style="color:#ffffff;font-size:22px;font-weight:900;margin:0;line-height:1.3;">ברוכים הבאים ל-Joba24!</h1>
    </div>
    <div style="padding:28px 24px;">
      <p style="font-size:17px;color:#0d1e40;font-weight:800;margin:0 0 16px;">${name} שלום 👋</p>
      <p style="font-size:14px;color:#4b6083;line-height:1.7;margin:0 0 16px;">
        נרשמת בהצלחה ל-Joba24 — הפלטפורמה שמחברת בין אנשים שצריכים עזרה לבין עובדים מהימנים באזורך.
      </p>
      <p style="font-size:14px;color:#4b6083;line-height:1.7;margin:0 0 24px;">
        כעת אתה חלק מהקהילה שלנו. בקרוב תוכל לפרסם משימות ולבצע עבודות בקלות, להרוויח כסף ולבנות מוניטין.
      </p>
      <div style="background:#eff6ff;border-radius:14px;padding:18px;margin-bottom:24px;border:1px solid #dbeafe;">
        <p style="font-size:13px;font-weight:800;color:#1a6fd4;margin:0 0 12px;">הצעדים הבאים:</p>
        <div style="font-size:13.5px;color:#4b6083;line-height:2;">
          ✅ השלם את הפרופיל שלך<br>
          ✅ התקן את האפליקציה למסך הבית<br>
          ✅ אפשר התראות לקבלת עדכונים
        </div>
      </div>
      <a href="https://joba24.com" style="display:block;text-align:center;background:linear-gradient(135deg,#1a6fd4,#0a52b0);color:#ffffff;font-size:15px;font-weight:800;padding:15px;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(26,111,212,0.3);">המשך לאפליקציה</a>
    </div>
    <div style="background:#f2f5fb;padding:16px 24px;text-align:center;">
      <p style="font-size:11px;color:#94a3b8;margin:0;">Joba24 — כל הזכויות שמורות</p>
      <p style="font-size:10px;color:#cbd5e1;margin:4px 0 0;">קיבלת הודעה זו כי נרשמת ל-Joba24</p>
    </div>
  </div>
</body>
</html>`;

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: 'ברוכים הבאים ל-Joba24! 🎉',
      body: html,
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});