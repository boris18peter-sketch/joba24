import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ── THE CARD'S BUTTON MUST CHANGE THE STATUS WITHOUT OPENING THE APP ────────
 * Android's card is drawn by the FCM data message itself, inside a service that
 * has no session — so unlike iOS there is no later moment at which the app could
 * hand that card its capability. It therefore has to be minted by the dispatcher
 * and travel WITH the revision; if this wiring ever slips, every button silently
 * degrades to "open the app", which is exactly the behaviour being fixed.
 */
const SEND = readFileSync(join(process.cwd(), 'base44/shared/liveActivitySend.ts'), 'utf8');

describe('android dispatch carries the card capability', () => {
  it('mints a per-card token as part of the same revision', () => {
    expect(SEND).toContain('signActionToken({');
    // Bound to the RECIPIENT of this dispatch, this task and this role — never
    // a blanket token that could act for anyone.
    expect(SEND).toContain('userId: recipientId');
    expect(SEND).toContain('taskId: task.id');
    expect(SEND).toContain('actions: actionsForRole(role)');
  });

  it('never attaches one to a closing message', () => {
    // A card that is being taken down has nothing left to act on.
    expect(SEND).toMatch(/if \(androidTokens\.length && plan\.kind !== 'end'\)/);
  });

  it('hands it to the Android transport', () => {
    expect(SEND).toContain('actionAuth: androidActionAuth');
  });

  it('still works when no secret is configured', () => {
    // Without the signing secret nothing can be minted, and the card must still
    // be delivered — a missing capability may cost the button, never the card.
    expect(SEND).toContain("Deno.env.get('LIVE_ACTIVITY_ACTION_SECRET') || ''");
    expect(SEND).toMatch(/if \(signed\?\.ok && signed\.token\)/);
  });
});