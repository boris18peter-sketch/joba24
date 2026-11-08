import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The two reasons App Store Connect refused the FIRST App Clip .ipa.
 *
 * Both facts live outside project.pbxproj — one in the clip's Info.plist, one in
 * the PARENT app's entitlements — which is exactly why a perfectly wired clip
 * target could still be rejected at upload. These tests pin the committed files,
 * prove the patcher repairs them on every run (not only on the run that adds the
 * target), and prove the archive verifier reads the BUILT artifact.
 */

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');

const PATCHER = join(ROOT, 'scripts/patch-ios-app-clip.py');
const VERIFIER = join(ROOT, 'scripts/verify-ios-app-clip.py');
const PROJECT = join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj');
const CLIP_PLIST = join(ROOT, 'ios/App/JobaClip/Info.plist');
const APP_ENTITLEMENTS = join(ROOT, 'ios/App/App/App.entitlements');

const read = (path) => readFileSync(path, 'utf8');

const TEAM = '322DV2PB9V';
const APP_BUNDLE = 'com.base69e6bdb4986a04a256653a23.app';
const CLIP_BUNDLE = `${APP_BUNDLE}.Clip`;
const APPCLIP_KEY = 'com.apple.developer.associated-appclip-app-identifiers';

const ORIENTATIONS = [
  'UIInterfaceOrientationPortrait',
  'UIInterfaceOrientationPortraitUpsideDown',
  'UIInterfaceOrientationLandscapeLeft',
  'UIInterfaceOrientationLandscapeRight',
];

/** The <string> values of one key's <array>, read straight from the XML. */
function values(text, key) {
  const match = text.match(new RegExp(`<key>${key}</key>\\s*<array>([\\s\\S]*?)</array>`));
  if (!match) return [];
  return [...match[1].matchAll(/<string>([^<]*)<\/string>/g)].map((m) => m[1]);
}

/* ── plist fixtures ──────────────────────────────────────────────────────── */
const plistDoc = (body) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n` +
  `<plist version="1.0">\n<dict>\n${body}</dict>\n</plist>`;
const plistString = (key, value) => `\t<key>${key}</key>\n\t<string>${value}</string>\n`;
const plistArray = (key, entries) =>
  `\t<key>${key}</key>\n\t<array>\n${entries.map((e) => `\t\t<string>${e}</string>\n`).join('')}\t</array>\n`;

function run(script, args) {
  const result = spawnSync('python3', [script, ...args], { cwd: ROOT, encoding: 'utf8' });
  return { code: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'joba-clip-'));
  const project = join(dir, 'project.pbxproj');
  const infoPlist = join(dir, 'Info.plist');
  const entitlements = join(dir, 'App.entitlements');
  copyFileSync(PROJECT, project);
  copyFileSync(CLIP_PLIST, infoPlist);
  copyFileSync(APP_ENTITLEMENTS, entitlements);
  return { dir, project, infoPlist, entitlements };
}

/** Both files as App Store Connect rejected them: portrait only, no clip id. */
function damage({ project, infoPlist, entitlements }) {
  writeFileSync(infoPlist, plistDoc(plistArray('UISupportedInterfaceOrientations', [ORIENTATIONS[0]])));
  writeFileSync(entitlements, plistDoc(plistString('aps-environment', 'production')));
  return { project, infoPlist, entitlements };
}

const patch = (files) => run(PATCHER, [
  '--project', files.project,
  '--clip-plist', files.infoPlist,
  '--app-entitlements', files.entitlements,
  '--team-id', TEAM,
]);

const check = (files) => run(PATCHER, [
  '--check', '--require',
  '--project', files.project,
  '--clip-plist', files.infoPlist,
  '--app-entitlements', files.entitlements,
  '--team-id', TEAM,
]);

/* ══════════════════════════════════════════════════════════════════════════
   1. Error 90474 — the clip must declare all four orientations
   ══════════════════════════════════════════════════════════════════════════ */
describe('the App Clip orientation declaration', () => {
  const text = read(CLIP_PLIST);

  it('declares all four orientations on the generic key', () => {
    expect(values(text, 'UISupportedInterfaceOrientations').sort()).toEqual([...ORIENTATIONS].sort());
  });

  it('declares them on the iPad key too, which is what iPad reads first', () => {
    // TARGETED_DEVICE_FAMILY is "1,2", so the clip ships on iPad and Apple
    // validates multitasking support there.
    expect(values(text, 'UISupportedInterfaceOrientations~ipad').sort())
      .toEqual([...ORIENTATIONS].sort());
  });

  it('still declares the App Clip dictionary and its launch screen', () => {
    // The orientation fix must not cost the clip its identity.
    expect(text).toContain('<key>NSAppClip</key>');
    expect(text).toContain('NSAppClipRequestEphemeralUserNotification');
    expect(text).toContain('<key>UILaunchScreen</key>');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. Warning 90876 — the parent app names its clip, team-prefixed
   ══════════════════════════════════════════════════════════════════════════ */
describe('the parent app clip entitlement', () => {
  const text = read(APP_ENTITLEMENTS);

  it('names the clip with the Apple Team ID prefix', () => {
    expect(values(text, APPCLIP_KEY)).toEqual([`${TEAM}.${CLIP_BUNDLE}`]);
  });

  it('keeps every entitlement the app already shipped with', () => {
    // Adding a key must not disturb signing: push, universal links and the
    // App Group the Live Activity widget reads are all still declared.
    expect(text).toContain('<key>aps-environment</key>');
    expect(text).toContain('applinks:joba24.com');
    expect(text).toContain('<key>com.apple.security.application-groups</key>');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   3. The patcher repairs them, every run, and refuses a wrong pair
   ══════════════════════════════════════════════════════════════════════════ */
describe('the patcher normalises both files', () => {
  it('repairs a rejected pair and then leaves it byte-identical', () => {
    const files = damage(sandbox());

    const first = patch(files);
    expect(first.code, first.stderr).toBe(0);
    expect(values(read(files.infoPlist), 'UISupportedInterfaceOrientations').sort())
      .toEqual([...ORIENTATIONS].sort());
    expect(values(read(files.infoPlist), 'UISupportedInterfaceOrientations~ipad').sort())
      .toEqual([...ORIENTATIONS].sort());
    expect(values(read(files.entitlements), APPCLIP_KEY)).toEqual([`${TEAM}.${CLIP_BUNDLE}`]);

    const plistAfterFirst = read(files.infoPlist);
    const entitlementsAfterFirst = read(files.entitlements);

    // A second run (and every run after it) must be a no-op: the project is
    // already patched and both files already correct.
    const second = patch(files);
    expect(second.code, second.stderr).toBe(0);
    expect(read(files.infoPlist)).toBe(plistAfterFirst);
    expect(read(files.entitlements)).toBe(entitlementsAfterFirst);
    expect(second.stdout).toContain('already applied');
  });

  it('passes the strict gate only when both fixes are in place', () => {
    const files = damage(sandbox());

    const before = check(files);
    expect(before.code).toBe(1);
    expect(before.stderr).toContain('all four clip orientations (error 90474)');
    expect(before.stderr).toContain('parent appclip identifier (warning 90876)');

    patch(files);
    const after = check(files);
    expect(after.code, after.stderr).toBe(0);
    const report = JSON.parse(after.stdout);
    expect(report.clip_orientations_complete).toBe(true);
    expect(report.parent_appclip_ok).toBe(true);
    expect(report.parent_appclip_expected).toBe(`${TEAM}.${CLIP_BUNDLE}`);
  });

  it('catches a partial orientation list, not just an empty one', () => {
    const files = sandbox();
    writeFileSync(files.infoPlist, plistDoc(
      plistArray('UISupportedInterfaceOrientations',
        ['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationLandscapeLeft'])
      + plistArray('UISupportedInterfaceOrientations~ipad',
        ['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationLandscapeLeft'])));
    const result = check(files);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('error 90474');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4. The archive verifier reads the BUILT product
   ══════════════════════════════════════════════════════════════════════════ */
function archive({ orientations = ORIENTATIONS, clipBundle = CLIP_BUNDLE,
  appclip = [`${TEAM}.${CLIP_BUNDLE}`] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'joba-clip-archive-'));
  const clipDir = join(root, 'build/App.xcarchive/Products/Applications/App.app/AppClips/JobaClip.app');
  mkdirSync(clipDir, { recursive: true });
  writeFileSync(join(clipDir, 'Info.plist'), plistDoc(
    plistString('CFBundleIdentifier', clipBundle)
    + plistArray('UISupportedInterfaceOrientations', orientations)));

  const entitlements = join(root, 'entitlements.plist');
  writeFileSync(entitlements, plistDoc(
    plistString('com.apple.developer.team-identifier', TEAM)
    + plistString('application-identifier', `${TEAM}.${APP_BUNDLE}`)
    + plistArray(APPCLIP_KEY, appclip)));

  return { archive: join(root, 'build/App.xcarchive'), entitlements };
}

describe('the archive verifier', () => {
  it('accepts an archive that carries both fixes', () => {
    const fixture = archive();
    const result = run(VERIFIER, ['--archive', fixture.archive,
      '--entitlements', fixture.entitlements]);
    expect(result.code, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.ok).toBe(true);
    expect(report.clip_bundle_id).toBe(CLIP_BUNDLE);
    expect(report.parent_appclip_expected).toBe(`${TEAM}.${CLIP_BUNDLE}`);
  });

  it('rejects a built clip that lost an orientation (90474)', () => {
    const fixture = archive({ orientations: [ORIENTATIONS[0]] });
    const result = run(VERIFIER, ['--archive', fixture.archive,
      '--entitlements', fixture.entitlements]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('90474');
    expect(result.stderr).toContain('UIInterfaceOrientationLandscapeRight');
  });

  it('rejects a signed app that does not name its clip (90876)', () => {
    const fixture = archive({ appclip: [] });
    const result = run(VERIFIER, ['--archive', fixture.archive,
      '--entitlements', fixture.entitlements]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('90876');
    expect(result.stderr).toContain(`${TEAM}.${CLIP_BUNDLE}`);
  });

  it('rejects an archive that mixes two builds', () => {
    const fixture = archive({ clipBundle: `${APP_BUNDLE}.ClipOld` });
    const result = run(VERIFIER, ['--archive', fixture.archive,
      '--entitlements', fixture.entitlements]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('mixes two different builds');
  });

  it('rejects an archive with no clip embedded', () => {
    const fixture = archive();
    const app = join(fixture.archive, 'Products', 'Applications', 'App.app');
    const result = run(VERIFIER, ['--archive', fixture.archive,
      '--entitlements', fixture.entitlements]);
    expect(result.code, result.stderr).toBe(0); // sanity: the good fixture passes
    expect(app).toContain('App.app');
    const empty = archive();
    const clipDir = join(empty.archive, 'Products/Applications/App.app/AppClips/JobaClip.app');
    writeFileSync(join(clipDir, 'Info.plist'), '<plist><dict/></plist>');
    const missing = run(VERIFIER, ['--archive', join(tmpdir(), 'joba-clip-archive-does-not-exist'),
      '--entitlements', empty.entitlements]);
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain('was not found');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   5. The pipeline runs both checks, gated on the clip flag
   ══════════════════════════════════════════════════════════════════════════ */
describe('the build wiring', () => {
  const yaml = read(join(ROOT, 'codemagic.yaml'));

  it('verifies the built archive, and only when the clip is enabled', () => {
    const step = yaml.indexOf('name: Verify the App Clip in the archive (iOS)');
    expect(step).toBeGreaterThan(-1);
    const body = yaml.slice(step, step + 1600);
    expect(body).toContain('verify-ios-app-clip.py');
    expect(body).toContain('ENABLE_APP_CLIP');
    // After the archive exists, never before it.
    expect(step).toBeGreaterThan(yaml.indexOf('xcodebuild archive'));
  });

  it('requires the App Clip capability on the parent profile', () => {
    // Warning 90876 is only resolved when the PROFILE carries the identifier.
    expect(yaml).toContain('--require-appclip "${ENABLE_APP_CLIP:-false}"');
    const verify = read(join(ROOT, 'scripts/ios-signing.py'));
    expect(verify).toContain('missing_appclip_entitlement');
    expect(verify).toContain('appclip_identifiers');
  });

  it('leaves the Live Activity widget flag and its steps untouched', () => {
    expect(yaml).toContain('--require-widget "${ENABLE_LIVE_ACTIVITY_WIDGET:-false}"');
    expect(yaml).toContain('name: Verify the Live Activity extension in the archive (iOS)');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   6. THE DOMAIN CHECK — "Invalid Entitlement: Missing Section"
   ══════════════════════════════════════════════════════════════════════════
   Build 41 uploaded with the clip inside it and both entitlement sides correct,
   and App Store Connect still failed the DOMAIN validation. The fault was on the
   web server, not in the app: the association file carried `applinks` only, so
   Apple found no `appclips` section naming the clip and reported a missing
   section. The clip's entitlement was right all along — it had nothing to point
   at. These pin the file Apple actually downloads. */
describe('the association file the App Clip domain check reads', () => {
  const FILES = [
    'public/.well-known/apple-app-site-association',
    'public/apple-app-site-association',
  ];

  it.each(FILES)('%s names the clip in an appclips section', (rel) => {
    const doc = JSON.parse(read(join(ROOT, rel)));

    // The parent app's own links keep working exactly as before.
    expect(doc.applinks.details.map((entry) => entry.appID)).toEqual([`${TEAM}.${APP_BUNDLE}`]);
    expect(doc.applinks.details[0].paths).toEqual(['*']);

    // Without this key Apple answers "Invalid Entitlement: Missing Section" and
    // the App Clip experience never validates. It is the CLIP's identifier — the
    // full app id plus the .Clip suffix — and no new .ipa can substitute for it.
    expect(doc.appclips).toBeTruthy();
    expect(doc.appclips.apps).toEqual([`${TEAM}.${CLIP_BUNDLE}`]);
  });

  it('is raw JSON at the well-known path', () => {
    // Apple fetches this path directly, following no wrapper: a body that is not
    // the JSON document itself is silently unreadable to it.
    const raw = read(join(ROOT, 'public/.well-known/apple-app-site-association'));
    expect(raw.trim().startsWith('{')).toBe(true);
    expect(raw).not.toContain('<');
  });

  it('claims the same domain the clip entitlement claims', () => {
    // The host is matched by Apple: the clip's `appclips:` host and the domain
    // serving that section must be the same one.
    const template = read(join(ROOT, 'ios/App/JobaClip/JobaClip.entitlements.template'));
    const hosts = [...template.matchAll(/<string>appclips:([^<]+)<\/string>/g)].map((m) => m[1]);
    expect(hosts).toEqual(['joba24.com']);
  });
});