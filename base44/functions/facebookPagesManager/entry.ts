// 0.8.54 — the same SDK every other function in this app runs on. This file was
// pinned to 0.8.44, whose entity client rejects the `filter(query, options)`
// form (HTTP 400). The guard below reads the post log with a filter, so on the
// old version that read always failed — which is what silently stopped every
// Facebook post. See the note on `logRows`.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getJobaSettings } from '../../shared/jobaSettings.ts';
import { APP_URL, formatFacebookPost } from '../../shared/facebookPost.ts';

const GRAPH_API = 'https://graph.facebook.com/v25.0';

/**
 * How long one run's claim blocks a second run before it is treated as abandoned.
 * A run that dies mid-upload must not lock a task out for ever, and a run that is
 * genuinely posting must not be joined by a second one.
 */
const CLAIM_TTL_MS = 10 * 60 * 1000;
/** A short pause so this run's own claim is visible to a run that started beside it. */
const CLAIM_SETTLE_MS = 400;

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

      // ── ONE POST PER TASK — ONE ROW, CLAIMED, NEVER DELETED ───────────────
      // Two runs of this function for the same task (a re-delivered or retried
      // workflow run, or a second trigger arriving while the first is still
      // uploading photos) both read "no post yet" and both publish — that is
      // what put every task on the Page twice. So the right to post is CLAIMED
      // before anything is published.
      //
      // ── WHY THIS NO LONGER DELETES ITS OWN ROW ─────────────────────────────
      // The claim used to be decided by writing a fresh row and reading the
      // task's rows back. When that read came back EMPTY — a read immediately
      // after the write, before the row is visible — the run concluded "somebody
      // else owns this" and DELETED its own claim. The result was the worst of
      // both worlds: the task was never posted (every run backed off) and the
      // table stayed empty, so nothing anywhere recorded a failure. That is
      // exactly "the Facebook posting simply stopped".
      //
      // The task now keeps ONE log row. It is created if missing and otherwise
      // re-claimed in place, it is never removed, and a row that belongs to
      // another run is left alone. A lost race costs a skip, never a post and
      // never the evidence.
      // ── A LOG WE COULD NOT READ IS NOT A LOG THAT SAYS "NOT POSTED" ────────
      // The first version of this treated a failed read as "no row yet" and
      // posted: one unreachable read meant a second post on the Page. The read
      // is now explicit about its own failure, and a failure REFUSES to post —
      // "once" can only be promised when the record can be read.
      const logRows = async (): Promise<{ rows: any[]; error: string | null }> => {
        try {
          // No options argument: the query is the same on every SDK version, and
          // the task's own rows are few — the sort below is what decides order.
          const page = await base44.asServiceRole.entities.FacebookPostLog
            .filter({ task_id: task.id });
          const rows = page?.items || (Array.isArray(page) ? page : []);
          return {
            error: null,
            rows: rows.slice().sort((a: any, b: any) =>
              String(a.created_date || '').localeCompare(String(b.created_date || '')) ||
              String(a.id).localeCompare(String(b.id))),
          };
        } catch (e) {
          return { rows: [], error: (e as Error).message };
        }
      };

      const firstRead = await logRows();
      if (firstRead.error) {
        return Response.json({ error: `post_log_unreadable: ${firstRead.error}` }, { status: 500 });
      }
      const before = firstRead.rows;
      const postedRow = before.find((r: any) => r.status === 'posted');
      if (postedRow) {
        // Posted already — the Page is the truth and this is where it happened.
        return Response.json({ skipped: true, reason: 'already_posted', post_url: postedRow.post_url || null });
      }
      const freshClaim = before.find((r: any) => (
        r.status === 'claim' && Date.now() - new Date(r.created_date || 0).getTime() < CLAIM_TTL_MS
      ));
      if (freshClaim) return Response.json({ skipped: true, reason: 'in_flight' });

      let claimId: string | null = null;
      try {
        const row = {
          task_id: task.id,
          page_id: settings.facebook_page_id,
          task_title: task.title,
          status: 'claim',
          error: '',
        };
        const existingRow = before[0] || null;
        const saved = existingRow
          ? await base44.asServiceRole.entities.FacebookPostLog.update(existingRow.id, row)
          : await base44.asServiceRole.entities.FacebookPostLog.create(row);
        claimId = saved?.id || existingRow?.id || null;
      } catch (e) {
        // Without the log there is no way to promise "once"; refuse rather than
        // risk a second post.
        return Response.json({ error: `post_log_unavailable: ${(e as Error).message}` }, { status: 500 });
      }

      // Every exit below records the outcome against the claim, so the log is
      // always the truth about what reached the Page.
      const settle = async (patch: Record<string, any>) => {
        if (!claimId) return;
        await base44.asServiceRole.entities.FacebookPostLog.update(claimId, patch).catch(() => {});
      };

      // ── THE READ-AFTER-WRITE GAP, HANDLED INSTEAD OF PUNISHED ─────────────
      // A run that started beside this one may have written its row a moment
      // later. The earliest row is the same row for both of us, so one short
      // pause and a single re-read is enough to agree on the owner — and the
      // loser only skips.
      await new Promise((resolve) => setTimeout(resolve, CLAIM_SETTLE_MS));
      const settleRead = await logRows();
      if (settleRead.error) {
        await settle({ status: 'failed', error: `post_log_unreadable: ${settleRead.error}` });
        return Response.json({ error: `post_log_unreadable: ${settleRead.error}` }, { status: 500 });
      }
      const owner = settleRead.rows.find((r: any) => r.status !== 'failed');
      if (owner && claimId && owner.id !== claimId) {
        await settle({ status: 'failed', error: 'superseded_by_concurrent_run' });
        return Response.json({ skipped: true, reason: 'already_posted', post_url: owner.post_url || null });
      }

      // ── A SECOND NET: THE PAGE ITSELF ─────────────────────────────────────
      // The task's own link is the identity. A post that already carries it
      // means the job is done — including for tasks published before this log
      // existed, where no claim row is available to look at.
      const existingPost = await findExistingPost(settings.facebook_page_id, pageToken, task.id);
      if (existingPost) {
        await settle({ status: 'posted', post_url: existingPost.url });
        return Response.json({ skipped: true, reason: 'already_posted', post_url: existingPost.url });
      }

      // Format and post
      const message = formatFacebookPost(task);

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
        const videoUrl = `https://facebook.com/${settings.facebook_page_id}/videos/${videoData.id}`;
        if (videoData.error) {
          await settle({ status: 'failed', error: String(videoData.error.message || '').slice(0, 300) });
          return Response.json({ error: videoData.error.message }, { status: 500 });
        }
        await settle({ status: 'posted', post_id: videoData.id, post_url: videoUrl, media_type: 'video' });
        return Response.json({ ok: true, post_id: videoData.id, media_type: 'video', post_url: videoUrl });
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
      if (postData.error) {
        await settle({ status: 'failed', error: String(postData.error.message || '').slice(0, 300) });
        return Response.json({ error: postData.error.message }, { status: 500 });
      }

      const [pageId, postId] = postData.id.split('_');
      const postUrl = `https://facebook.com/${pageId}/posts/${postId}`;
      await settle({
        status: 'posted',
        post_id: postData.id,
        post_url: postUrl,
        media_type: attachedMedia.length > 0 ? 'photos' : 'text',
      });
      return Response.json({ ok: true, post_id: postData.id, post_url: postUrl, media_count: attachedMedia.length });
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

/**
 * Is this task already on the Page?
 *
 * Reads the Page's recent posts and looks for the task's own deep link. Any
 * failure returns null, so the check can never block a legitimate post — it only
 * ever answers "yes, and here it is".
 */
async function findExistingPost(
  pageId: string,
  pageToken: string,
  taskId: string,
): Promise<{ url?: string } | null> {
  if (!taskId) return null;
  try {
    const resp = await fetch(
      `${GRAPH_API}/${pageId}/posts?fields=message,permalink_url&limit=25&access_token=${pageToken}`,
    );
    const data = await resp.json();
    if (data?.error) return null;
    const marker = `/task/${taskId}`;
    const hit = (data?.data || []).find(
      (p: any) => typeof p?.message === 'string' && p.message.includes(marker),
    );
    return hit ? { url: hit.permalink_url } : null;
  } catch {
    return null;
  }
}