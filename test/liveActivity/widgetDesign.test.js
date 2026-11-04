import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The Lock Screen must look like the in-app task card, not like a second design.
 *
 * These tests pin the three things that make that true — the icons, the palette
 * and the shapes — against their real source of truth in the app. They are the
 * guard against the regression that produced this work: a native card built from
 * generic SF Symbols, drifting away from ActiveTaskBanner one symbol at a time.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

const WIDGET = read('ios/App/JobaActivityWidget/JobaActivityWidgetBundle.swift');
const BANNER = read('src/components/ActiveTaskBanner.jsx');
const CSS = read('src/index.css');

/** The keys of the banner's ICON_MAP — every icon the app can draw for a step. */
function bannerIconKeys() {
  const block = BANNER.slice(BANNER.indexOf('const ICON_MAP = {'));
  const body = block.slice(0, block.indexOf('};'));
  return [...body.matchAll(/(\w+):\s*\w+/g)].map((m) => m[1]).filter((k) => k !== 'const');
}

/** One `#rrggbb` token from the app's own stylesheet. */
function token(name) {
  const m = CSS.match(new RegExp(`--${name}:\\s*#([0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${name} not found in index.css`);
  return m[1];
}

/** `#1a6fd4` → [0.10, 0.44, 0.83], the way SwiftUI spells it. */
function swiftColor(hex) {
  return [0, 2, 4].map((i) => Math.round((parseInt(hex.slice(i, i + 2), 16) / 255) * 100) / 100);
}

/** The RGB triple the widget assigns to a palette constant. */
function palette(name) {
  const m = WIDGET.match(
    new RegExp(`static let ${name} = Color\\(red: ([\\d.]+), green: ([\\d.]+), blue: ([\\d.]+)\\)`)
  );
  if (!m) throw new Error(`JobaPalette.${name} not found`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

describe('the icons are the app\'s own, not SF Symbols', () => {
  it('draws every icon the banner can use, from lucide path data', () => {
    // The banner's catalogue is the closed set: `ICON_MAP[step.icon]`. If a
    // step ever points at an icon the widget does not know, it falls back to
    // Navigation — exactly what the banner does — so this list is a contract.
    const keys = bannerIconKeys();
    expect(keys.length).toBeGreaterThanOrEqual(8);
    for (const key of keys) {
      expect(WIDGET, `glyph "${key}" must be mapped for the Lock Screen`).toContain(
        `case "${key}": return .`
      );
    }
  });

  it('keeps the banner\'s fallback, so an unknown key is never an empty bubble', () => {
    expect(WIDGET).toMatch(/default: return \.navigation/);
    expect(BANNER).toContain('ICON_MAP[step.icon] || Navigation');
  });

  it('uses the action icon the in-app button uses for each step', () => {
    // getQuickAction: on_the_way → Navigation, arrived → MapPin, else → Check.
    expect(BANNER).toContain("cta.key === 'on_the_way' ? 'navigation' : cta.key === 'arrived' ? 'map_pin' : 'check'");
    expect(WIDGET).toContain('case "on_the_way": return .navigation');
    expect(WIDGET).toContain('case "arrived": return .map_pin');
    expect(WIDGET).toMatch(/static func forActionStep[\s\S]{0,240}default: return \.check/);
  });

  it('has exactly one SF Symbol left, and it is a state rather than an action', () => {
    const symbols = [...WIDGET.matchAll(/systemName: "([^"]+)"/g)].map((m) => m[1]);
    // "this tap did not land" — the app has no icon of its own for that state.
    expect(symbols).toEqual(['arrow.clockwise']);
    for (const substituted of [
      'location.north.fill', 'mappin.and.ellipse', 'checkmark.circle.fill',
      'shippingbox.fill', 'dot.radiowaves.left.and.right', 'person.2.fill',
    ]) {
      expect(WIDGET).not.toContain(substituted);
    }
  });

  it('strokes the glyphs with lucide\'s own weight', () => {
    // 24×24 source box, stroke 2, round caps and joins — the app's rendering.
    expect(WIDGET).toContain('size * 2 / 24');
    expect(WIDGET).toContain('lineCap: .round');
    expect(WIDGET).toContain('lineJoin: .round');
    expect(WIDGET).toContain('let scale = side / 24');
  });
});

describe('the colours are the app\'s tokens', () => {
  const expected = {
    surface: 'surface-2',
    brand: 'brand-primary',
    brandLight: 'brand-primary-light',
    success: 'color-success',
    accent: 'brand-accent-dark',
    text1: 'text-1',
    text2: 'text-2',
    text3: 'text-3',
    border: 'border-1',
    border2: 'border-2',
  };

  for (const [constant, cssToken] of Object.entries(expected)) {
    it(`${constant} is --${cssToken}`, () => {
      const want = swiftColor(token(cssToken));
      const got = palette(constant);
      got.forEach((value, i) => {
        expect(Math.abs(value - want[i])).toBeLessThan(0.006);
      });
    });
  }

  it('keeps the approved success gradient from the app\'s own button', () => {
    // .j-btn-success / the banner's primary button: 059669 → 047857.
    expect(CSS).toContain('linear-gradient(135deg, #059669, #047857)');
    expect(BANNER).toContain('linear-gradient(135deg,#059669,#047857)');
    expect(WIDGET).toContain('[JobaPalette.success, JobaPalette.successDark]');
    expect(palette('successDark')).toEqual(swiftColor('047857'));
  });
});

describe('the shapes match the banner', () => {
  it('uses the banner\'s rounded-square hero, not a circle', () => {
    // 44×44 / radius 14 in the app → the same ratio at any size.
    expect(BANNER).toContain('borderRadius: 14');
    expect(BANNER).toContain("background: 'var(--brand-primary-light)'");
    expect(WIDGET).toContain('let radius = size * (14.0 / 44.0)');
    expect(WIDGET).toContain('RoundedRectangle(cornerRadius: radius, style: .continuous)');
    expect(WIDGET).toContain('JobaPalette.brandLight');
  });

  it('draws the step rail as circles holding each step\'s own glyph', () => {
    expect(WIDGET).toContain('glyph: JobaGlyph.forIconKey(step.icon)');
    expect(WIDGET).toContain('reached ? JobaPalette.brand : JobaPalette.surface');
    // the current step keeps the banner's light-blue halo
    expect(WIDGET).toContain('strokeBorder(JobaPalette.brandLight, lineWidth: 3)');
    // a step's label, in the banner's three states
    expect(WIDGET).toContain('Text(step.label)');
  });

  it('fills the connector from the first step to the current one', () => {
    // Left half filled once this step is reached, right half only while a later
    // step is still ahead — the banner's 16% / 50% / 84% fill, mirrored for RTL.
    expect(WIDGET).toContain('halfLine(filled: index > 0 && reached, hidden: index == 0)');
    expect(WIDGET).toContain('halfLine(filled: index < progress.step, hidden: index == progress.steps.count - 1)');
  });

  it('keeps the primary action a large green rounded button with its glyph', () => {
    // A 56pt floor on the Lock Screen; the expanded Dynamic Island is a fixed,
    // much tighter box, so it passes the height that fits there instead.
    expect(WIDGET).toContain('var minHeight: CGFloat = 56');
    expect(WIDGET).toContain('minHeight: 46');
    expect(WIDGET).toContain('RoundedRectangle(cornerRadius: 14, style: .continuous)');
    expect(WIDGET).toContain('glyph: JobaGlyph.forActionStep(action.step)');
    // The words are still the server's — nothing is invented here.
    expect(WIDGET).toContain('Text(action.label)');
    // Green gradient, white centred label: unchanged.
    expect(WIDGET).toContain('colors: [JobaPalette.success, JobaPalette.successDark]');
    expect(WIDGET).toContain('.multilineTextAlignment(.center)');
  });

  it('grows for a long label instead of clipping or overflowing it', () => {
    // `minHeight` is a FLOOR, applied AFTER the inner padding: the words never
    // touch the rounded edge, and a wrapped label makes the button taller
    // rather than being cut off.
    expect(WIDGET).toContain('var maxLines: Int = 2');
    expect(WIDGET).toContain('.lineLimit(maxLines)');
    expect(WIDGET).toContain('.minimumScaleFactor(0.7)');
    expect(WIDGET).toContain('.fixedSize(horizontal: false, vertical: true)');
    expect(WIDGET).toContain('.frame(maxWidth: .infinity, minHeight: minHeight)');
    expect(WIDGET.indexOf('.padding(.vertical, 12)'))
      .toBeLessThan(WIDGET.indexOf('.frame(maxWidth: .infinity, minHeight: minHeight)'));
    // The island keeps a single line, so nothing wraps inside its fixed height.
    expect(WIDGET).toContain('maxLines: 1');
  });

  it('leaves the App Intent wiring exactly as it was', () => {
    // Sizing is presentation only: the intent still receives the same four
    // values, and the button is still the intent's own trigger.
    expect(WIDGET).toContain('Button(intent: JobaTaskActionIntent(');
    expect(WIDGET).toContain('taskId: taskId');
    expect(WIDGET).toContain('actionId: action.id');
    expect(WIDGET).toContain('expectedStep: action.step');
    expect(WIDGET).toContain('.contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))');
  });

  it('pins the white card and its dark type, as approved', () => {
    expect(WIDGET).toContain('.activityBackgroundTint(JobaPalette.surface)');
    expect(WIDGET).toContain('.environment(\\.colorScheme, .light)');
    expect(WIDGET).toContain('JobaPalette.text1');
    expect(WIDGET).toContain('JobaPalette.text2');
    // The Dynamic Island keeps the semantic colours: its surface is black.
    expect(WIDGET).toContain('.foregroundStyle(.secondary)');
  });
});

describe('the banner is untouched, and still the source of truth', () => {
  it('carries no native concern and no widget import', () => {
    expect(BANNER).not.toContain('liveActivityNative');
    expect(BANNER).not.toContain('JobaGlyph');
    expect(BANNER).not.toContain('activityBackgroundTint');
  });

  it('still owns every word on the card', () => {
    // The widget prints contract copy only; the same strings are translated here.
    expect(WIDGET).not.toContain("t('");
    expect(BANNER).toContain("t('atb_sub_tap_approve')");
  });

  it('preserves the interactive intent it was built on', () => {
    expect(WIDGET).toContain('Button(intent: JobaTaskActionIntent(');
    expect(WIDGET).toContain('.disabled(isPending)');
    expect(WIDGET).toContain('expectedStep: action.step');
  });
});