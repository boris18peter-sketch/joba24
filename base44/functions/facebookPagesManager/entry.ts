import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getJobaSettings } from '../../shared/jobaSettings.ts';

const GRAPH_API = 'https://graph.facebook.com/v25.0';

const CATEGORY_LABELS: Record<string, string> = {
  plumbing: 'אינסטלציה',
  electricity: 'חשמל',
  handyman: 'יד אמן',
  cleaning: 'ניקיון',
  moving: 'הובלות',
  heavy_lifting: 'הרמה כבדה',
  painting: 'צבעות',
  carpentry: 'נגרות',
  ac: 'מזגנים',
  locksmith: 'מנעולים',
  gardening: 'גינון',
  home_maintenance: 'תחזוקת בית',
  car: 'רכב',
  transportation: 'הסעות',
  delivery: 'משלוחים',
  shopping: 'קניות',
  pets: 'חיות מחמד',
  babysitting: 'שמרטפות',
  elderly_care: 'סיעוד',
  tutoring: 'שיעורים',
  fitness: 'כושר',
  photography: 'צילום',
  events: 'אירועים',
  personal_help: 'עזרה אישית',
  it_support: 'תמיכת IT',
  other: 'אחר',
};

const APP_URL = 'https://joba24.com';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action } = body || {};

    // ── Auth: admin-only for all actions ──
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    // ── Get Facebook OAuth connection ──
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('facebook_pages');
    if (!accessToken) return Response.json({ error: 'Facebook not connected — authorize the connector first' }, { status: 400 });

    // ── LIST PAGES ──
    if (action === 'list') {
      const pages = await listPages(accessToken);
      if (pages instanceof Response) return pages;
      return Response.json({ pages });
    }

    // ── SELECT PAGE ──
    if (action === 'select') {
      const { page_id, page_name } = body;
      if (!page_id) return Response.json({ error: 'page_id required' }, { status: 400 });

      // Verify the page is accessible
      const pages = await listPages(accessToken);
      if (pages instanceof Response) return pages;
      const found = pages.find((p: any) => p.id === page_id);
      if (!found) return Response.json({ error: 'Page not found in your managed pages' }, { status: 400 });

      const records = await base44.asServiceRole.entities.JobaSettings.list('-updated_date', 1);
      const rec = records[0];
      const payload = { facebook_page_id: page_id, facebook_page_name: page_name || found.name };
      if (rec) {
        await base44.asServiceRole.entities.JobaSettings.update(rec.id, payload);
      } else {
        await base44.asServiceRole.entities.JobaSettings.create(payload);
      }
      return Response.json({ ok: true, page_id, page_name: page_name || found.name });
    }

    // ── POST TASK TO FACEBOOK ──
    if (action === 'post') {
      const { task_id } = body;
      if (!task_id) return Response.json({ error: 'task_id required' }, { status: 400 });

      // Check settings
      const settings = await getJobaSettings(base44);
      if (!settings.facebook_page_id) return Response.json({ error: 'No Facebook page selected' }, { status: 400 });
      if (!settings.facebook_auto_post_enabled) return Response.json({ skipped: true, reason: 'auto-post disabled' });

      // Load task
      const task = await base44.asServiceRole.entities.Task.get(task_id);
      if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

      // Skip demo/test tasks — don't pollute the Facebook page
      if (task.client_id?.startsWith('demo_') || task.title?.startsWith('🧪') || task.title?.includes('🧪')) {
        return Response.json({ skipped: true, reason: 'demo/test task' });
      }

      // Get page access token (fresh each time — user tokens expire)
      const pageToken = await getPageAccessToken(accessToken, settings.facebook_page_id);
      if (!pageToken) return Response.json({ error: 'Selected page no longer accessible — reconnect Facebook' }, { status: 400 });

      // Format and post
      const message = formatPost(task);

      const postResp = await fetch(`${GRAPH_API}/${settings.facebook_page_id}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, access_token: pageToken }),
      });
      const postData = await postResp.json();
      if (postData.error) return Response.json({ error: postData.error.message }, { status: 500 });

      return Response.json({ ok: true, post_id: postData.id, post_url: `https://facebook.com/${postData.id.split('_')[0]}/posts/${postData.id.split('_')[1]}` });
    }

    // ── TEST POST ──
    if (action === 'test') {
      const settings = await getJobaSettings(base44);
      if (!settings.facebook_page_id) return Response.json({ error: 'No page selected — select a page first' }, { status: 400 });

      const pageToken = await getPageAccessToken(accessToken, settings.facebook_page_id);
      if (!pageToken) return Response.json({ error: 'Page not accessible — reconnect Facebook' }, { status: 400 });

      const postResp = await fetch(`${GRAPH_API}/${settings.facebook_page_id}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `🧪 פוסט בדיקה מ-Joba24\n\nהחיבור לפייסבוק עובד! כל משימה חדשה תפורסם אוטומטית בעמוד זה.\n\n🔗 ${APP_URL}`,
          access_token: pageToken,
        }),
      });
      const postData = await postResp.json();
      if (postData.error) return Response.json({ error: postData.error.message }, { status: 500 });

      return Response.json({ ok: true, post_id: postData.id });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

// ── Helpers ──

async function listPages(userToken: string): Promise<any[] | Response> {
  const resp = await fetch(`${GRAPH_API}/me/accounts?fields=id,name,access_token&limit=100`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const data = await resp.json();
  if (data.error) return Response.json({ error: data.error.message }, { status: 500 });
  return (data.data || []).map((p: any) => ({ id: p.id, name: p.name }));
}

async function getPageAccessToken(userToken: string, pageId: string): Promise<string | null> {
  const resp = await fetch(`${GRAPH_API}/me/accounts?fields=id,name,access_token&limit=100`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const data = await resp.json();
  if (data.error) return null;
  const page = (data.data || []).find((p: any) => p.id === pageId);
  return page?.access_token || null;
}

function formatPost(task: any): string {
  const lines: string[] = [];

  lines.push(`🛠️ ${task.title || 'משימה חדשה'}`);

  if (task.description) {
    lines.push('');
    lines.push(task.description);
  }

  lines.push('');
  if (task.city) lines.push(`📍 עיר: ${task.city}`);
  if (task.price) lines.push(`💰 תקציב: ₪${task.price}`);
  if (task.category) lines.push(`🏷️ קטגוריה: ${CATEGORY_LABELS[task.category] || task.category}`);
  if (task.estimated_time) lines.push(`⏱️ זמן משוער: ${task.estimated_time}`);
  if (task.payment_method) lines.push(`💳 תשלום: ${task.payment_method}`);

  lines.push('');
  lines.push('מחפשים עובד מקצועי? היכנסו ל-Joba24 והגישו הצעה!');
  lines.push(`🔗 ${APP_URL}`);

  return lines.join('\n');
}