import { describe, it, expect } from 'vitest';
import { translations } from '@/lib/i18n';
import { HE, REQUIRED_KEYS, t as backendT } from '../../base44/shared/liveActivityStrings.ts';
import { t as appT } from './labels.js';

/**
 * The Live Activity shows Hebrew copy that must be the app's own copy.
 *
 * There is exactly one honest way to prove that from a backend module that
 * cannot import `src/`: compare every value it carries against the shipped,
 * merged Hebrew dictionary. A wording change anywhere in the app fails this test
 * and names the key, so the Lock Screen can never quietly drift from the app.
 */
const he = translations.he;

describe('backend Hebrew copy IS the app copy', () => {
  it('carries every key the contract reads', () => {
    expect(REQUIRED_KEYS.length).toBe(26);
    for (const key of REQUIRED_KEYS) {
      expect(HE[key], `missing key: ${key}`).toBeDefined();
      expect(he[key], `key not in the app dictionary: ${key}`).toBeDefined();
    }
  });

  it('matches the shipped dictionary value for value', () => {
    for (const key of REQUIRED_KEYS) {
      expect(HE[key], key).toEqual(he[key]);
    }
  });

  it('keeps scanning_texts the app’s own rotating lines, in order', () => {
    expect(Array.isArray(HE.scanning_texts)).toBe(true);
    expect(HE.scanning_texts).toEqual(he.scanning_texts);
    expect(HE.scanning_texts[0]).toBe('מאותת לעובדים');
  });

  it('interpolates exactly like the app translator', () => {
    const cases = [
      ['atb_sub_btn_start', { btn: 'יצאתי לדרך' }],
      ['atb_sub_btn_arrive', { btn: 'הגעתי' }],
      ['atb_sub_btn_finish', { btn: 'סיימתי את העבודה' }],
      ['atb_planned_worker_sub', { when: 'היום, 20:00' }],
      ['atb_planned_owner_sub', { when: 'מחר, 09:30' }],
    ];
    for (const [key, params] of cases) {
      expect(backendT(key, params), key).toBe(appT(key, params));
    }
  });

  it('behaves like the app when a placeholder is missing', () => {
    expect(backendT('atb_sub_btn_start', {})).toBe(appT('atb_sub_btn_start', {}));
    expect(backendT('atb_sub_btn_start')).toBe(HE.atb_sub_btn_start);
  });

  it('returns the key for an unknown string, like the app does', () => {
    expect(backendT('nope_not_a_key')).toBe('nope_not_a_key');
    expect(backendT('nope_not_a_key', 'fallback')).toBe('fallback');
  });
});