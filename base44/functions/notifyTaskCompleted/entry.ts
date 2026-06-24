import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    if (!data?.worker_id) {
      return Response.json({ sent: 0, reason: 'No worker' });
    }

    const justCompleted = old_data?.status !== 'COMPLETED' && data?.status === 'COMPLETED';
    if (!justCompleted) {
      return Response.json({ sent: 0, reason: 'Not a new completion transition' });
    }

    const taskId = data.id || event?.entity_id;
    const taskTitle = data.title || 'המשימה';
    const price = data.price || 0;

    // Fetch worker + client
    const workerUsers = await base44.asServiceRole.entities.User.filter({ id: data.worker_id });
    const worker = workerUsers[0];

    let client = null;
    if (data.client_id) {
      const clientUsers = await base44.asServiceRole.entities.User.filter({ id: data.client_id });
      client = clientUsers[0];
    }

    // ── Push notification to worker ──
    if (worker?.fcm_tokens?.length) {
      await base44.asServiceRole.functions.invoke('sendPushNotification', {
        user_ids: [data.worker_id],
        title: `המפרסם אישר את סיום המשימה ✅`,
        body: `המפרסם אישר שהשלמת את "${taskTitle}" — בדוק את הדירוג שקיבלת`,
        url: `/task/${taskId}`,
        tag: `task_completed_${data.id}`,
      });
    }

    // ── Email to worker ──
    if (worker?.email) {
      const workerName = worker.full_name || 'עובד';
      const workerHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,Arial,sans-serif;background:#f2f5fb;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:0 0 20px 20px;overflow:hidden;box-shadow:0 4px 24px rgba(15,40,107,0.08);">
    <div style="background:linear-gradient(135deg,#059669,#047857);padding:36px 24px 28px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">✅</div>
      <h1 style="color:#ffffff;font-size:20px;font-weight:900;margin:0;line-height:1.3;">המשימה הושלמה בהצלחה!</h1>
    </div>
    <div style="padding:28px 24px;">
      <p style="font-size:17px;color:#0d1e40;font-weight:800;margin:0 0 16px;">${workerName}, כל הכבוד! 🎉</p>
      <p style="font-size:14px;color:#4b6083;line-height:1.7;margin:0 0 20px;">
        המפרסם אישר שהשלמת את המשימה. תודה על העבודה המקצועית!
      </p>
      <div style="background:#f0fdf4;border-radius:14px;padding:16px;margin-bottom:20px;border:1px solid #bbf7d0;">
        <div style="font-size:11px;font-weight:800;color:#059669;margin-bottom:4px;">פרטי המשימה</div>
        <div style="font-size:15px;font-weight:800;color:#0d1e40;margin-bottom:8px;">${taskTitle}</div>
        <div style="font-size:14px;color:#4b6083;">סכום: ₪${price}</div>
      </div>
      <p style="font-size:13px;color:#4b6083;line-height:1.6;margin:0 0 20px;">
        💡 כדאי לבקש מהמפרסם דירוג וביקורת — דירוגים גבוהים יעזרו לך לקבל יותר עבודות בעתיד.
      </p>
      <a href="https://joba24.com/task/${taskId}" style="display:block;text-align:center;background:linear-gradient(135deg,#1a6fd4,#0a52b0);color:#ffffff;font-size:15px;font-weight:800;padding:15px;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(26,111,212,0.3);">צפה במשימה</a>
    </div>
    <div style="background:#f2f5fb;padding:16px 24px;text-align:center;">
      <p style="font-size:11px;color:#94a3b8;margin:0;">Joba24 — כל הזכויות שמורות</p>
    </div>
  </div>
</body>
</html>`;
      await base44.integrations.Core.SendEmail({
        to: worker.email,
        subject: `המשימה "${taskTitle}" הושלמה! כל הכבוד 🎉`,
        body: workerHtml,
      });
    }

    // ── Email to client ──
    if (client?.email) {
      const clientName = client.full_name || 'לקוח';
      const workerName = worker?.full_name || 'העובד';
      const clientHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,Arial,sans-serif;background:#f2f5fb;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:0 0 20px 20px;overflow:hidden;box-shadow:0 4px 24px rgba(15,40,107,0.08);">
    <div style="background:linear-gradient(135deg,#1a6fd4,#0a52b0);padding:36px 24px 28px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">✅</div>
      <h1 style="color:#ffffff;font-size:20px;font-weight:900;margin:0;line-height:1.3;">המשימה שלך הושלמה!</h1>
    </div>
    <div style="padding:28px 24px;">
      <p style="font-size:17px;color:#0d1e40;font-weight:800;margin:0 0 16px;">${clientName}, המשימה שלך הושלמה 🎉</p>
      <p style="font-size:14px;color:#4b6083;line-height:1.7;margin:0 0 20px;">
        ${workerName} סיים את המשימה שפרסמת. אנחנו מקווים שאתה מרוצה מהתוצאה!
      </p>
      <div style="background:#eff6ff;border-radius:14px;padding:16px;margin-bottom:20px;border:1px solid #dbeafe;">
        <div style="font-size:11px;font-weight:800;color:#1a6fd4;margin-bottom:4px;">פרטי המשימה</div>
        <div style="font-size:15px;font-weight:800;color:#0d1e40;margin-bottom:8px;">${taskTitle}</div>
        <div style="font-size:14px;color:#4b6083;">סכום: ₪${price}</div>
      </div>
      <p style="font-size:13px;color:#4b6083;line-height:1.6;margin:0 0 20px;">
        💡 כדאי לדרג את ${workerName} — דירוגים עוזרים לנו לשמור על איכות גבוהה בקהילה.
      </p>
      <a href="https://joba24.com/task/${taskId}" style="display:block;text-align:center;background:linear-gradient(135deg,#1a6fd4,#0a52b0);color:#ffffff;font-size:15px;font-weight:800;padding:15px;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(26,111,212,0.3);">צפה במשימה ודרג</a>
    </div>
    <div style="background:#f2f5fb;padding:16px 24px;text-align:center;">
      <p style="font-size:11px;color:#94a3b8;margin:0;">Joba24 — כל הזכויות שמורות</p>
    </div>
  </div>
</body>
</html>`;
      await base44.integrations.Core.SendEmail({
        to: client.email,
        subject: `המשימה "${taskTitle}" הושלמה! ✅`,
        body: clientHtml,
      });
    }

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});