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

      // ── Upload media if the task has images or video ──
      const taskImages = Array.isArray(task.images) ? task.images.filter(Boolean) : [];
      const taskVideo = task.video_url || null;

      // If there's a video, post it as a video post (Facebook doesn't allow
      // mixing video + photos in a single post)
      if (taskVideo) {
        const videoResp = await fetch(`${GRAPH_API}/${settings.facebook_page_id}/videos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_url: taskVideo,
            description: message,
            access_token: pageToken,
          }),
        });
        const videoData = await videoResp.json();
        if (videoData.error) return Response.json({ error: videoData.error.message }, { status: 500 });
        return Response.json({ ok: true, post_id: videoData.id, media_type: 'video', post_url: `https://facebook.com/${settings.facebook_page_id}/videos/${videoData.id}` });
      }

      // Upload images as unpublished photos, then attach to the feed post
      // (Facebook allows up to 10 photos per multi-photo post)
      const attachedMedia: { media_fbid: string }[] = [];
      for (const imgUrl of taskImages.slice(0, 10)) {
        try {
          const photoResp = await fetch(`${GRAPH_API}/${settings.facebook_page_id}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: imgUrl,
              published: false,
              access_token: pageToken,
            }),
          });
          const photoData = await photoResp.json();
          if (photoData.id) {
            attachedMedia.push({ media_fbid: photoData.id });
          }
        } catch {}
      }

      // ── Create feed post (text-only or multi-photo) ──
      const postBody: Record<string, any> = { message, access_token: pageToken };
      if (attachedMedia.length > 0) {
        postBody.attached_media = attachedMedia;
      }

      const postResp = await fetch(`${GRAPH_API}/${settings.facebook_page_id}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postBody),
      });
      const postData = await postResp.json();
      if (postData.error) return Response.json({ error: postData.error.message }, { status: 500 });

      const [pageId, postId] = postData.id.split('_');
      return Response.json({ ok: true, post_id: postData.id, post_url: `https://facebook.com/${pageId}/posts/${postId}`, media_count: attachedMedia.length });
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

// Lists managed Pages including Business-Manager-owned Pages.
// /me/accounts returns only directly-managed Pages. Pages owned by or shared
// with a Business Manager require business_management scope and separate
// calls to /{business-id}/owned_pages and /{business-id}/client_pages.
async function listPages(userToken: string): Promise<any[] | Response> {
  // 1. Direct pages
  const acctResp = await fetch(`${GRAPH_API}/me/accounts?fields=id,name,access_token&limit=100`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const acctData = await acctResp.json();
  if (acctData.error) return Response.json({ error: acctData.error.message }, { status: 500 });

  const directPages = (acctData.data || []).map((p: any) => ({ id: p.id, name: p.name }));
  const pageMap = new Map<string, any>();
  for (const p of directPages) pageMap.set(p.id, p);

  // 2. Business-Manager pages
  const bizResp = await fetch(`${GRAPH_API}/me/businesses?fields=id,name&limit=100`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const bizData = await bizResp.json();
  if (!bizData.error && bizData.data) {
    for (const biz of bizData.data) {
      const [clientResp, ownedResp] = await Promise.all([
        fetch(`${GRAPH_API}/${biz.id}/client_pages?fields=id,name,access_token&limit=100`, {
          headers: { Authorization: `Bearer ${userToken}` },
        }),
        fetch(`${GRAPH_API}/${biz.id}/owned_pages?fields=id,name,access_token&limit=100`, {
          headers: { Authorization: `Bearer ${userToken}` },
        }),
      ]);
      const clientData = await clientResp.json();
      const ownedData = await ownedResp.json();
      for (const p of (clientData.data || [])) {
        if (!pageMap.has(p.id)) pageMap.set(p.id, { id: p.id, name: p.name });
      }
      for (const p of (ownedData.data || [])) {
        if (!pageMap.has(p.id)) pageMap.set(p.id, { id: p.id, name: p.name });
      }
    }
  }

  return Array.from(pageMap.values());
}

async function getPageAccessToken(userToken: string, pageId: string): Promise<string | null> {
  // Try direct pages first
  const acctResp = await fetch(`${GRAPH_API}/me/accounts?fields=id,name,access_token&limit=100`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const acctData = await acctResp.json();
  if (!acctData.error) {
    const page = (acctData.data || []).find((p: any) => p.id === pageId);
    if (page?.access_token) return page.access_token;
  }

  // Try Business-Manager pages
  const bizResp = await fetch(`${GRAPH_API}/me/businesses?fields=id,name&limit=100`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const bizData = await bizResp.json();
  if (!bizData.error && bizData.data) {
    for (const biz of bizData.data) {
      const [clientResp, ownedResp] = await Promise.all([
        fetch(`${GRAPH_API}/${biz.id}/client_pages?fields=id,name,access_token&limit=100`, {
          headers: { Authorization: `Bearer ${userToken}` },
        }),
        fetch(`${GRAPH_API}/${biz.id}/owned_pages?fields=id,name,access_token&limit=100`, {
          headers: { Authorization: `Bearer ${userToken}` },
        }),
      ]);
      const clientData = await clientResp.json();
      const ownedData = await ownedResp.json();
      const found = [...(clientData.data || []), ...(ownedData.data || [])].find((p: any) => p.id === pageId);
      if (found?.access_token) return found.access_token;
    }
  }

  return null;
}

// Extracts only the user's free-text description, stripping the structured
// form-field block (which starts with "--- emoji label ---") that some
// categories append to the description field.
function extractMainDescription(description: string): string {
  if (!description) return '';
  const separatorMatch = description.match(/---[^-].*?---/);
  if (!separatorMatch) return description.trim();
  const separatorIdx = description.indexOf(separatorMatch[0]);
  return description.slice(0, separatorIdx).trim();
}

function formatPost(task: any): string {
  const lines: string[] = [];

  // ── Headline ──
  lines.push('🔔 עבודה חדשה ב-Joba24');
  lines.push('');

  // ── Title ──
  if (task.title) {
    lines.push(task.title);
    lines.push('');
  }

  // ── Description (only the user's free text, not the structured form fields) ──
  const desc = extractMainDescription(task.description);
  if (desc && desc !== task.title) {
    lines.push(desc);
    lines.push('');
  }

  // ── City + Price ──
  const details: string[] = [];
  if (task.city) details.push(task.city);
  if (task.price) details.push(`מוכן לשלם ₪${task.price}`);
  if (details.length) {
    lines.push(details.join(' • '));
    lines.push('');
  }

  // ── Call to action + clean link on its own line (no trailing text) ──
  lines.push('מתאים לך? 👈');
  // Link on its own line with no trailing punctuation/spaces — Facebook
  // sometimes concatenates trailing characters into the URL, breaking the
  // deep link. A clean line ensures the link is parsed correctly.
  lines.push(`${APP_URL}/task/${task.id}?utm_source=facebook`);

  return lines.join('\n');
}