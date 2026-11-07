import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * SIGNING — the profile audit, the selection, and the proof read out of the .ipa.
 *
 * ── WHAT WENT WRONG IN THE BUILD ────────────────────────────────────────────
 * App Store Connect held several App Store profiles for ONE bundle id (a valid
 * one and historical ones reported "Invalid"), and the widget produced two
 * downloaded FILES bearing exactly the same profile name.
 *
 * Nothing in the pipeline could tell those apart:
 *   • matching on the bundle id alone is a coin flip between the valid profile
 *     and a revoked one;
 *   • "newest expiry wins" is not validity — an Invalid profile can have a
 *     future date;
 *   • two copies of the SAME profile (one UUID) looked like a name clash and
 *     stopped the build for no reason;
 *   • the archive (`xcode-project use-profiles`) and the export scanned the
 *     directory independently, so they could sign with different profiles.
 *
 * These tests run the real script — `scripts/ios-signing.py select`, then
 * `export-options`, then `verify-ipa` on a real zip — against fixture profiles
 * that carry real metadata: UUID, name, bundle id, team, creation and expiry
 * dates, entitlements, App Groups, device lists and certificates. The identity
 * list stands in for `security find-identity`, so the certificate check is
 * exercised without macOS.
 */

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../..');
const SIGNING = join(ROOT, 'scripts/ios-signing.py');
const CODEMAGIC = join(ROOT, 'codemagic.yaml');

const APP = 'com.joba24.preflight.app';
const WIDGET = `${APP}.JobaActivityWidget`;
const CLIP = `${APP}.Clip`;
const TEAM = 'TEAM123456';
const GROUP = `group.${APP}`;

const CERT_A = Buffer.from('fixture-certificate-A');
const CERT_B = Buffer.from('fixture-certificate-B');
const sha1 = (buf) => createHash('sha1').update(buf).digest('hex').toUpperCase();

const read = (path) => readFileSync(path, 'utf8');

function run(args, env = {}) {
  const result = spawnSync('python3', [SIGNING, ...args], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env },
  });
  return { status: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || '' };
}

/** The identities `security find-identity -v -p codesigning` would report. */
function identitiesFile(entries) {
  const dir = mkdtempSync(join(tmpdir(), 'joba-ids-'));
  const path = join(dir, 'identities.json');
  writeFileSync(path, JSON.stringify(entries));
  return path;
}

const DIST_A = { sha1: sha1(CERT_A), name: `Apple Distribution: Joba24 (${TEAM})`, team_id: TEAM, distribution: true };

function profileXml({
  name,
  uuid,
  bundleId = APP,
  team = TEAM,
  expires = '2030-01-01T00:00:00Z',
  created = '2026-01-01T00:00:00Z',
  groups = [],
  cert = CERT_A,
  getTaskAllow = false,
  devices = null,
  allDevices = false,
  platform = 'iOS',
}) {
  const certs = (Array.isArray(cert) ? cert : [cert])
    .map((c) => `\t\t<data>${c.toString('base64')}</data>`)
    .join('\n');
  const groupXml = groups.length
    ? `\t\t<key>com.apple.security.application-groups</key>\n\t\t<array>\n${groups
      .map((g) => `\t\t\t<string>${g}</string>`).join('\n')}\n\t\t</array>\n`
    : '';
  const deviceXml = devices
    ? `\t<key>ProvisionedDevices</key>\n\t<array>\n${devices
      .map((d) => `\t\t<string>${d}</string>`).join('\n')}\n\t</array>\n`
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>UUID</key>
	<string>${uuid}</string>
	<key>Name</key>
	<string>${name}</string>
	<key>TeamIdentifier</key>
	<array>
		<string>${team}</string>
	</array>
	<key>CreationDate</key>
	<date>${created}</date>
	<key>ExpirationDate</key>
	<date>${expires}</date>
	<key>Platform</key>
	<array>
		<string>${platform}</string>
	</array>
	${allDevices ? '<key>ProvisionsAllDevices</key>\n\t<true/>\n\t' : ''}<key>DeveloperCertificates</key>
	<array>
${certs}
	</array>
${deviceXml}	<key>Entitlements</key>
	<dict>
		<key>application-identifier</key>
		<string>${team}.${bundleId}</string>
		<key>get-task-allow</key>
		<${getTaskAllow}/>
${groupXml}	</dict>
</dict>
</plist>
`;
}

/** A profiles directory: [{file, ...profileXml options}]. */
function profilesDir(files) {
  const dir = mkdtempSync(join(tmpdir(), 'joba-profiles-'));
  for (const entry of files) {
    writeFileSync(join(dir, `${entry.file}.mobileprovision`), profileXml(entry));
  }
  return dir;
}

function select(dir, extra = [], env = {}) {
  const work = mkdtempSync(join(tmpdir(), 'joba-select-'));
  const reportPath = join(work, 'signing-report.json');
  const ids = identitiesFile([DIST_A]);
  const args = [
    'select',
    '--profiles-dir', dir,
    '--app-bundle-id', APP,
    '--app-group', GROUP,
    '--identities-json', ids,
    '--quarantine-dir', join(work, 'superseded'),
    '--report', reportPath,
    ...extra,
  ];
  const result = run(args, env);
  const report = existsSync(reportPath) ? JSON.parse(read(reportPath)) : null;
  return { ...result, report, reportPath, work };
}

const uuidOf = (report, bundleId) => report.targets[bundleId].uuid;

/* ══════════════════════════════════════════════════════════════════════════
   1. AUDIT, DEDUPE, VALIDITY — the historical mess on disk
   ══════════════════════════════════════════════════════════════════════════ */
describe('the audit decodes and classifies every downloaded profile', () => {
  it('picks the one profile that can actually sign, from a realistic pile', () => {
    // The shape reported from Apple Developer: a valid profile plus historical
    // ones that are expired, ad hoc, enterprise, development, and one whose
    // certificate is no longer a valid identity in the keychain.
    const dir = profilesDir([
      { file: 'a-valid', uuid: 'UUID-VALID', name: 'Base44 ios_app_store 1787167724',
        expires: '2027-08-19T00:00:00Z', groups: [GROUP] },
      { file: 'b-expired', uuid: 'UUID-EXPIRED', name: 'Base44 ios_app_store 1787000000',
        expires: '2024-08-19T00:00:00Z', groups: [GROUP] },
      { file: 'c-revoked', uuid: 'UUID-REVOKED', name: 'Base44 ios_app_store 1787169501',
        groups: [GROUP], cert: CERT_B },
      { file: 'd-nogroup', uuid: 'UUID-NOGROUP', name: 'Base44 ios_app_store 1787170281' },
      { file: 'e-devproj', uuid: 'UUID-DEV', name: 'Base44 dev', groups: [GROUP], getTaskAllow: true },
      { file: 'f-adhoc', uuid: 'UUID-ADHOC', name: 'Base44 adhoc', groups: [GROUP], devices: ['DEV1'] },
      { file: 'g-enterprise', uuid: 'UUID-ENTERPRISE', name: 'Base44 inhouse', groups: [GROUP], allDevices: true },
      { file: 'h-otherteam', uuid: 'UUID-TEAM', name: 'Other team', groups: [GROUP], team: 'OTHERTEAM1' },
    ]);

    const result = select(dir);
    expect(result.status).toBe(0);
    expect(uuidOf(result.report, APP)).toBe('UUID-VALID');

    const rejected = Object.fromEntries(result.report.rejected[APP].map((r) => [r.uuid, r]));
    expect(rejected['UUID-EXPIRED'].codes).toContain('expired');
    expect(rejected['UUID-REVOKED'].codes).toContain('certificate_not_installed');
    expect(rejected['UUID-NOGROUP'].codes).toContain(`missing_app_group:${GROUP}`);
    expect(rejected['UUID-DEV'].codes).toContain('development_profile');
    expect(rejected['UUID-ADHOC'].codes).toContain('device_registered_profile');
    expect(rejected['UUID-ENTERPRISE'].codes).toContain('enterprise_profile');
    expect(rejected['UUID-TEAM'].codes).toContain('team_mismatch');
    // The audit keeps the verifiable metadata, not just a verdict.
    const audited = result.report.audit.profiles.find((p) => p.uuid === 'UUID-VALID');
    expect(audited.name).toBe('Base44 ios_app_store 1787167724');
    expect(audited.bundle_id).toBe(APP);
    expect(audited.team_id).toBe(TEAM);
    expect(audited.groups).toEqual([GROUP]);
    expect(audited.expires).toContain('2027-08-19');
    expect(audited.certificates).toEqual([DIST_A.sha1]);
    expect(result.report.targets[APP].certificate.name).toContain('Apple Distribution');
  });

  it('never treats a future expiry date as proof of validity', () => {
    // A revoked certificate is what "Invalid" usually means, and the expiry
    // date still looks perfect. Only the certificates catch it.
    const dir = profilesDir([
      { file: 'only', uuid: 'UUID-REVOKED', name: 'Base44 ios_app_store 1787179888',
        groups: [GROUP], expires: '2031-01-01T00:00:00Z', cert: CERT_B },
    ]);
    const result = select(dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('certificate_not_installed');
    expect(result.stderr).toContain('Apple Developer');
  });

  it('fails with an actionable message when nothing can sign', () => {
    const dir = profilesDir([
      { file: 'old', uuid: 'UUID-OLD', name: 'Base44 ios_app_store', groups: [GROUP],
        expires: '2020-01-01T00:00:00Z' },
    ]);
    const result = select(dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('EXPIRED');
    // Nothing was moved when no selection could be made.
    expect(readdirSync(dir).filter((f) => f.endsWith('.mobileprovision'))).toEqual(['old.mobileprovision']);
  });

  it('refuses a wildcard profile, which cannot carry this app’s entitlements', () => {
    const dir = profilesDir([
      { file: 'wild', uuid: 'UUID-WILD', name: 'Base44 wildcard', bundleId: `${APP}.*`, groups: [GROUP] },
    ]);
    const result = select(dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('WILDCARD');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. THE DUPLICATE THAT BROKE STEP 23
   ══════════════════════════════════════════════════════════════════════════ */
describe('identical downloads are deduplicated by UUID', () => {
  it('does not mistake two copies of ONE profile for a name clash', () => {
    const dir = profilesDir([
      { file: 'widget', uuid: 'UUID-WIDGET', name: 'Joba24 Widget', bundleId: WIDGET, groups: [GROUP] },
      { file: 'widget (1)', uuid: 'UUID-WIDGET', name: 'Joba24 Widget', bundleId: WIDGET, groups: [GROUP] },
      { file: 'app', uuid: 'UUID-APP', name: 'Joba24 AppStore', groups: [GROUP] },
    ]);

    const result = select(dir, [
      '--widget-bundle-id', WIDGET, '--require-widget', 'true',
    ]);

    // The same profile downloaded twice is one profile — and both targets sign.
    expect(result.status).toBe(0);
    expect(uuidOf(result.report, APP)).toBe('UUID-APP');
    expect(uuidOf(result.report, WIDGET)).toBe('UUID-WIDGET');
    expect(result.report.audit.unique).toBe(2);
    expect(result.report.audit.duplicates).toHaveLength(1);
    expect(result.report.audit.duplicates[0].uuid).toBe('UUID-WIDGET');
  });

  it('stops with an actionable error when two DIFFERENT profiles share a name', () => {
    const dir = profilesDir([
      { file: 'x', uuid: 'UUID-ONE', name: 'Joba24 AppStore', groups: [GROUP] },
      { file: 'y', uuid: 'UUID-TWO', name: 'Joba24 AppStore', groups: [GROUP] },
    ]);

    const result = select(dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('share one name');
    expect(result.stderr).toContain('UUID-ONE');
    expect(result.stderr).toContain('UUID-TWO');
    // Guessing is exactly what must not happen: nothing was selected or moved.
    expect(result.report).toBeNull();
    expect(readdirSync(dir).filter((f) => f.endsWith('.mobileprovision')).sort())
      .toEqual(['x.mobileprovision', 'y.mobileprovision']);
  });

  it('stops when the app and widget profiles share one name', () => {
    const dir = profilesDir([
      { file: 'app', uuid: 'UUID-APP', name: 'Base44 profile', groups: [GROUP] },
      { file: 'widget', uuid: 'UUID-WIDGET', name: 'Base44 profile', bundleId: WIDGET, groups: [GROUP] },
    ]);
    const result = select(dir, ['--widget-bundle-id', WIDGET, '--require-widget', 'true']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('share the name');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   3. SELECTION AND PRUNING — one profile per bundle id, and only that one
   ══════════════════════════════════════════════════════════════════════════ */
describe('the selection is deterministic and leaves only one profile per bundle id', () => {
  it('prefers the later expiry among equally valid profiles, never the file name', () => {
    const dir = profilesDir([
      // "zzz" sorts last but expires first: a filename rule would pick it.
      { file: 'aaa', uuid: 'UUID-OLD', name: 'Joba24 A', groups: [GROUP], expires: '2028-01-01T00:00:00Z' },
      { file: 'zzz', uuid: 'UUID-NEW', name: 'Joba24 B', groups: [GROUP], expires: '2031-01-01T00:00:00Z' },
    ]);
    const result = select(dir);
    expect(result.status).toBe(0);
    expect(uuidOf(result.report, APP)).toBe('UUID-NEW');
    // …and the same directory always yields the same choice.
    const again = select(dir);
    expect(uuidOf(again.report, APP)).toBe('UUID-NEW');
  });

  it('moves every other profile for these bundle ids out of Xcode’s way', () => {
    const dir = profilesDir([
      { file: 'keep', uuid: 'UUID-KEEP', name: 'Joba24 keep', groups: [GROUP] },
      { file: 'stale', uuid: 'UUID-STALE', name: 'Joba24 stale', groups: [GROUP],
        expires: '2027-01-01T00:00:00Z' },
      { file: 'unrelated', uuid: 'UUID-OTHER-APP', name: 'Another app', bundleId: 'com.other.app',
        groups: ['group.com.other.app'] },
    ]);

    const result = select(dir);
    expect(result.status).toBe(0);

    // Xcode's directory now holds exactly the selected profile — plus the
    // unrelated app's profile, which belongs to a different bundle id.
    expect(readdirSync(dir).filter((f) => f.endsWith('.mobileprovision')).sort())
      .toEqual(['keep.mobileprovision', 'unrelated.mobileprovision']);

    // Nothing was deleted: the superseded profile was moved, and named.
    expect(result.report.audit.quarantine.moved).toHaveLength(1);
    const moved = result.report.audit.quarantine.moved[0];
    expect(moved.uuid).toBe('UUID-STALE');
    expect(existsSync(moved.moved_to)).toBe(true);
    expect(read(moved.moved_to)).toContain('UUID-STALE');
  });

  it('requires the App Group for the widget too, not just the app', () => {
    const dir = profilesDir([
      { file: 'app', uuid: 'UUID-APP', name: 'Joba24 AppStore', groups: [GROUP] },
      { file: 'widget', uuid: 'UUID-WIDGET', name: 'Joba24 Widget', bundleId: WIDGET },
    ]);
    const result = select(dir, ['--widget-bundle-id', WIDGET, '--require-widget', 'true']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(WIDGET);
    expect(result.stderr).toContain(GROUP);
  });

  it('keeps stdout empty so no JSON consumer can ever be fed a sentence', () => {
    const dir = profilesDir([
      { file: 'app', uuid: 'UUID-APP', name: 'Joba24 AppStore', groups: [GROUP] },
    ]);
    const result = select(dir);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('SELECTED');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4. EXPORT OPTIONS AND THE .IPA — the same profiles, or a hard failure
   ══════════════════════════════════════════════════════════════════════════ */
function exportedFrom(selectionPath, outDir) {
  const out = join(outDir, 'export_options.plist');
  const result = run([
    'export-options', '--selection', selectionPath, '--out', out,
    '--report', join(outDir, 'export-options.json'),
  ]);
  return { ...result, out, plist: existsSync(out) ? read(out) : '' };
}

/** A zipped .ipa holding the given embedded profiles. */
function makeIpa(entries) {
  const dir = mkdtempSync(join(tmpdir(), 'joba-ipa-'));
  const ipa = join(dir, 'App.ipa');
  const payload = {};
  for (const [name, xml] of entries) payload[name] = xml;
  const code = `
import json, zipfile
payload = json.loads(${JSON.stringify(JSON.stringify(payload))})
ipa = ${JSON.stringify(ipa)}
with zipfile.ZipFile(ipa, "w") as archive:
    for name, content in payload.items():
        archive.writestr(name, content)
`;
  const built = spawnSync('python3', ['-c', code], { encoding: 'utf8' });
  if (built.status !== 0) throw new Error(built.stderr);
  return ipa;
}

describe('the export and the .ipa are proven to use the selected profiles', () => {
  const twoTargets = () => {
    const dir = profilesDir([
      { file: 'app', uuid: 'UUID-APP', name: 'Joba24 AppStore', groups: [GROUP] },
      { file: 'widget', uuid: 'UUID-WIDGET', name: 'Joba24 Widget', bundleId: WIDGET, groups: [GROUP] },
    ]);
    return select(dir, ['--widget-bundle-id', WIDGET, '--require-widget', 'true']);
  };

  it('writes the selection into export_options.plist', () => {
    const selection = twoTargets();
    expect(selection.status).toBe(0);
    const exported = exportedFrom(selection.reportPath, selection.work);
    expect(exported.status).toBe(0);
    expect(exported.plist).toContain('<string>manual</string>');
    expect(exported.plist).toContain('<string>app-store-connect</string>');
    expect(exported.plist).toContain('<string>Joba24 AppStore</string>');
    expect(exported.plist).toContain('<string>Joba24 Widget</string>');
    expect(exported.plist).toContain(TEAM);
  });

  it('accepts an .ipa that embeds exactly the selected UUIDs', () => {
    const selection = twoTargets();
    const ipa = makeIpa([
      ['Payload/App.app/embedded.mobileprovision', profileXml({
        uuid: 'UUID-APP', name: 'Joba24 AppStore', groups: [GROUP] })],
      ['Payload/App.app/PlugIns/JobaActivityWidgetExtension.appex/embedded.mobileprovision', profileXml({
        uuid: 'UUID-WIDGET', name: 'Joba24 Widget', bundleId: WIDGET, groups: [GROUP] })],
    ]);
    const result = run(['verify-ipa', '--selection', selection.reportPath, '--ipa', ipa]);
    expect(result.status).toBe(0);
    expect(result.stderr).toContain('archive and export agree');
  });

  it('fails when the .ipa was signed with a DIFFERENT profile than the selection', () => {
    const selection = twoTargets();
    const ipa = makeIpa([
      ['Payload/App.app/embedded.mobileprovision', profileXml({
        uuid: 'UUID-SOMETHING-ELSE', name: 'Joba24 AppStore', groups: [GROUP] })],
      ['Payload/App.app/PlugIns/JobaActivityWidgetExtension.appex/embedded.mobileprovision', profileXml({
        uuid: 'UUID-WIDGET', name: 'Joba24 Widget', bundleId: WIDGET, groups: [GROUP] })],
    ]);
    const result = run(['verify-ipa', '--selection', selection.reportPath, '--ipa', ipa]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('did not use the same profile');
    expect(result.stderr).toContain('UUID-SOMETHING-ELSE');
  });

  it('fails when the widget profile is missing from the .ipa', () => {
    const selection = twoTargets();
    const ipa = makeIpa([
      ['Payload/App.app/embedded.mobileprovision', profileXml({
        uuid: 'UUID-APP', name: 'Joba24 AppStore', groups: [GROUP] })],
    ]);
    const result = run(['verify-ipa', '--selection', selection.reportPath, '--ipa', ipa]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('no widget provisioning profile');
  });

  it('fails when the embedded profile lost the App Group', () => {
    const selection = twoTargets();
    const ipa = makeIpa([
      ['Payload/App.app/embedded.mobileprovision', profileXml({
        uuid: 'UUID-APP', name: 'Joba24 AppStore' })],
      ['Payload/App.app/PlugIns/JobaActivityWidgetExtension.appex/embedded.mobileprovision', profileXml({
        uuid: 'UUID-WIDGET', name: 'Joba24 Widget', bundleId: WIDGET, groups: [GROUP] })],
    ]);
    const result = run(['verify-ipa', '--selection', selection.reportPath, '--ipa', ipa]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(GROUP);
  });

  it('refuses a report that maps two bundle ids to one name', () => {
    const selection = twoTargets();
    const broken = JSON.parse(read(selection.reportPath));
    broken.targets[WIDGET].name = broken.targets[APP].name;
    writeFileSync(selection.reportPath, JSON.stringify(broken));
    const exported = exportedFrom(selection.reportPath, selection.work);
    expect(exported.status).toBe(1);
    expect(exported.plist).toBe('');
    expect(exported.stderr).toContain('one profile name');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4b. THE APP CLIP — a child bundle id, a profile of its own,
       and NO App Group demanded of it
   ══════════════════════════════════════════════════════════════════════════ */
describe('the App Clip is signed like its own bundle, not like an extension', () => {
  const withClip = () => {
    const dir = profilesDir([
      { file: 'app', uuid: 'UUID-APP', name: 'Joba24 AppStore', groups: [GROUP] },
      // A real clip profile carries no App Group: a clip shares no container
      // with the app unless it asks to.
      { file: 'clip', uuid: 'UUID-CLIP', name: 'Joba24 App Clip', bundleId: CLIP },
    ]);
    return select(dir, ['--clip-bundle-id', CLIP, '--require-clip', 'true']);
  };

  it('selects the clip profile even though it has no App Group', () => {
    const selection = withClip();
    expect(selection.status).toBe(0);
    expect(selection.report.targets[CLIP].role).toBe('clip');
    expect(selection.report.targets[CLIP].uuid).toBe('UUID-CLIP');
    expect(selection.report.targets[APP].uuid).toBe('UUID-APP');
    // …and the app still has to carry the group its widget depends on.
    expect(selection.report.targets[APP].groups).toContain(GROUP);
  });

  it('puts the clip into export_options.plist by name', () => {
    const selection = withClip();
    const exported = exportedFrom(selection.reportPath, selection.work);
    expect(exported.status).toBe(0);
    expect(exported.plist).toContain('<string>Joba24 App Clip</string>');
    expect(exported.plist).toContain(CLIP);
  });

  it('accepts an .ipa that embeds the selected clip profile', () => {
    const selection = withClip();
    const ipa = makeIpa([
      ['Payload/App.app/embedded.mobileprovision', profileXml({
        uuid: 'UUID-APP', name: 'Joba24 AppStore', groups: [GROUP] })],
      ['Payload/App.app/AppClips/JobaClip.app/embedded.mobileprovision', profileXml({
        uuid: 'UUID-CLIP', name: 'Joba24 App Clip', bundleId: CLIP })],
    ]);
    const result = run(['verify-ipa', '--selection', selection.reportPath, '--ipa', ipa]);
    expect(result.status).toBe(0);
    expect(result.stderr).toContain('archive and export agree');
  });

  it('fails when the clip is enabled but missing from the .ipa', () => {
    const selection = withClip();
    const ipa = makeIpa([
      ['Payload/App.app/embedded.mobileprovision', profileXml({
        uuid: 'UUID-APP', name: 'Joba24 AppStore', groups: [GROUP] })],
    ]);
    const result = run(['verify-ipa', '--selection', selection.reportPath, '--ipa', ipa]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('no App Clip provisioning profile');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   5. THE WORKFLOW — order matters, and nothing is deleted at Apple
   ══════════════════════════════════════════════════════════════════════════ */
describe('the workflow selects before it signs, and verifies afterwards', () => {
  const yaml = read(CODEMAGIC);

  it('runs the selection after the certificate is installed, before use-profiles', () => {
    const certificates = yaml.indexOf('keychain add-certificates');
    const selectStep = yaml.indexOf('scripts/ios-signing.py select');
    // The real command, not the comment that mentions it earlier in the file.
    const useProfiles = yaml.indexOf('xcode-project use-profiles --verbose');
    const archive = yaml.indexOf('xcodebuild archive');

    expect(certificates).toBeGreaterThan(-1);
    // The certificate must be in the keychain first: matching each profile's
    // certificate against it is what catches a revoked ("Invalid") profile.
    expect(selectStep).toBeGreaterThan(certificates);
    // …and Xcode must only be pointed at the project AFTER the directory holds
    // nothing but the selected profiles.
    expect(useProfiles).toBeGreaterThan(selectStep);
    expect(archive).toBeGreaterThan(useProfiles);
  });

  it('requires the App Group and the widget flag on the selection step', () => {
    const step = yaml.slice(yaml.indexOf('scripts/ios-signing.py select'));
    expect(step.slice(0, 900)).toContain('--app-group "group.$BUNDLE_ID"');
    expect(step.slice(0, 900)).toContain('--require-widget "${ENABLE_LIVE_ACTIVITY_WIDGET:-false}"');
    expect(step.slice(0, 900)).toContain('--report "$CM_BUILD_DIR/signing-report.json"');
  });

  it('builds the export options from that report, never from a second scan', () => {
    expect(yaml).toContain('scripts/ios-signing.py export-options');
    expect(yaml).toContain('--selection "$CM_BUILD_DIR/signing-report.json"');
    expect(yaml).toContain('--out "$CM_BUILD_DIR/export_options.plist"');
    expect(yaml).not.toContain('scripts/ios-export-options.py');
    // No inline plist can drift from the script's contract.
    expect(yaml).not.toContain('<key>provisioningProfiles</key>');
    expect(yaml).toContain('-exportOptionsPlist "$CM_BUILD_DIR/export_options.plist"');
  });

  it('verifies the finished .ipa and keeps the audit as a build artifact', () => {
    const exportStep = yaml.indexOf('-exportOptionsPlist "$CM_BUILD_DIR/export_options.plist"');
    const verifyStep = yaml.indexOf('scripts/ios-signing.py verify-ipa');
    expect(verifyStep).toBeGreaterThan(exportStep);
    expect(yaml).toContain('- build/signing-report.json');
  });

  it('never deletes or revokes an Apple Developer profile', () => {
    // No Apple-side mutation can be hiding in the steps: the only destructive
    // call in the signing code is a local `shutil.move` into quarantine.
    expect(yaml).not.toContain('delete-profile');
    expect(yaml).not.toContain('app-store-connect delete');
    const script = read(SIGNING);
    expect(script).not.toContain('delete-profile');
    expect(script).not.toContain('revoke-profile');
    // The quarantine is a move, and the report says where the file went.
    expect(script).toContain('shutil.move');
    expect(script).toContain('moved_to');
  });

  it('still archives and uploads exactly as before', () => {
    expect(yaml).toContain('xcodebuild archive');
    expect(yaml).toContain('submit_to_testflight: true');
    expect(yaml).toContain('android-workflow:');
  });
});