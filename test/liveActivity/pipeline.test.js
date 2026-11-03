import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync, readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * PIPELINE PREFLIGHT — the build scripts themselves, not mocks.
 *
 * ── WHAT THIS FILE EXISTS FOR ───────────────────────────────────────────────
 * A widget-enabled build died at "Wire the Live Activity widget extension" with
 *
 *     json.decoder.JSONDecodeError: Extra data: line 44 column 1
 *
 * The generator wrote its JSON report AND the human line
 * `OK: ... fully wired` to stdout, CI redirected stdout into
 * `widget-check.json`, and the next step parsed a document followed by a
 * sentence. Every test in the "output contract" block below runs the real
 * command line and would have failed before the fix.
 *
 * The rest covers the other stages that can only be proven by executing the
 * shipped scripts: project generation, the report the workflow reads, and the
 * profile → export-options mapping that decides which profile signs what.
 */

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../..');
const PATCHER = join(ROOT, 'scripts/patch-ios-live-activity.py');
const EXPORT_OPTIONS = join(ROOT, 'scripts/ios-export-options.py');
const PROJECT = join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj');
const APP_INFO = join(ROOT, 'ios/App/App/Info.plist');
const WIDGET_INFO = join(ROOT, 'ios/App/JobaActivityWidget/Info.plist');
const CODEMAGIC = join(ROOT, 'codemagic.yaml');

const APP_BUNDLE_ID = 'com.joba24.preflight.app';
const WIDGET_BUNDLE_ID = `${APP_BUNDLE_ID}.JobaActivityWidget`;
const TEAM_ID = 'TEAM123456';

const read = (path) => readFileSync(path, 'utf8');

/**
 * Runs a script and returns the three things a build step can see.
 * spawnSync, not execFileSync: stderr must be readable on SUCCESS too, because
 * "did this line go to the wrong stream?" is exactly what is being asserted.
 */
function run(script, args, env = {}) {
  const result = spawnSync('python3', [script, ...args], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env },
  });
  return { status: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || '' };
}

const patchArgs = (project, info) => ['--project', project, '--info-plist', info];

/** A throwaway copy of the two files the generator writes. */
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'joba-preflight-'));
  const project = join(dir, 'project.pbxproj');
  const info = join(dir, 'Info.plist');
  copyFileSync(PROJECT, project);
  copyFileSync(APP_INFO, info);
  return { dir, project, info, report: join(dir, 'widget-check.json') };
}

const widgetEnv = { WIDGET_BUNDLE_ID };

/** The generator's apply run, on a patched sandbox. */
function patch({ project, info }) {
  return run(PATCHER, [...patchArgs(project, info), '--quiet'], widgetEnv);
}

/* ══════════════════════════════════════════════════════════════════════════
   1. THE OUTPUT CONTRACT — the bug that stopped the last build
   ══════════════════════════════════════════════════════════════════════════ */
describe('the report is machine data and diagnostics are not', () => {
  it('writes one JSON document to --report, with no human text in it', () => {
    const box = sandbox();
    patch(box);

    const result = run(PATCHER, [...patchArgs(box.project, box.info), '--check', '--require',
      '--report', box.report], widgetEnv);

    expect(result.status).toBe(0);
    // The consumer's exact line, from the workflow. Before the fix this threw
    // JSONDecodeError: Extra data: line 44 column 1.
    const report = JSON.parse(read(box.report));
    expect(report.ok).toBe(true);
    expect(report.widget.present).toBe(true);
    // ...and the sentence that used to break it is on stderr, where a log belongs.
    expect(result.stderr).toContain('fully wired');
    expect(read(box.report)).not.toContain('fully wired');
  });

  it('keeps stdout parseable too, so a redirect cannot corrupt the document', () => {
    const box = sandbox();
    patch(box);

    const result = run(PATCHER, [...patchArgs(box.project, box.info), '--check', '--require'], widgetEnv);

    expect(result.status).toBe(0);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    expect(result.stdout).not.toContain('OK:');
    expect(result.stdout).not.toContain('[live-activity]');
  });

  it('writes the report even when the check fails, and still exits 1', () => {
    const box = sandbox(); // NOT patched: the gate must refuse it
    const result = run(PATCHER, [...patchArgs(box.project, box.info), '--check', '--require',
      '--report', box.report], widgetEnv);

    expect(result.status).toBe(1);
    const report = JSON.parse(read(box.report));
    expect(report.ok).toBe(true);          // the project parses...
    expect(report.widget.present).toBe(false); // ...but the target is absent
    expect(result.stderr).toContain('not fully wired');
  });

  it('writes the report with --quiet (CI never has to read stdout)', () => {
    const box = sandbox();
    patch(box);
    const result = run(PATCHER, [...patchArgs(box.project, box.info), '--check', '--require', '--quiet',
      '--report', box.report], widgetEnv);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(JSON.parse(read(box.report)).widget.present).toBe(true);
  });

  it('reports a missing project as a document, not as a traceback', () => {
    const dir = mkdtempSync(join(tmpdir(), 'joba-preflight-missing-'));
    const report = join(dir, 'report.json');
    const result = run(PATCHER, ['--project', join(dir, 'nope.pbxproj'), '--info-plist',
      join(dir, 'nope.plist'), '--check', '--report', report], widgetEnv);

    expect(result.status).toBe(1);
    const parsed = JSON.parse(read(report));
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain('not found');
  });

  it('leaves no half-written report behind', () => {
    const box = sandbox();
    patch(box);
    run(PATCHER, [...patchArgs(box.project, box.info), '--check', '--require', '--report', box.report], widgetEnv);
    expect(readdirSync(box.dir).some((name) => name.endsWith('.tmp'))).toBe(false);
  });

  it('keeps apply-mode chatter off stdout', () => {
    const box = sandbox();
    const first = run(PATCHER, patchArgs(box.project, box.info), widgetEnv);
    expect(first.status).toBe(0);
    expect(first.stdout).toBe('');
    expect(first.stderr).toContain('project.pbxproj updated');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. THE REPORT THE WORKFLOW ACTUALLY READS
   ══════════════════════════════════════════════════════════════════════════ */
describe('the report proves what the archive needs', () => {
  it('reports the widget target, its bundle id and the shared sources', () => {
    const box = sandbox();
    patch(box);
    run(PATCHER, [...patchArgs(box.project, box.info), '--check', '--require', '--report', box.report], widgetEnv);
    const report = JSON.parse(read(box.report));

    expect(report.targets.sort()).toEqual(['App', 'JobaActivityWidgetExtension']);
    expect(report.widget.bundle_id).toBe(WIDGET_BUNDLE_ID);
    expect(report.widget.deployment_target).toBe('16.1');
    expect(report.widget.infoplist_file).toBe('JobaActivityWidget/Info.plist');
    expect(report.widget.product_type).toBe('com.apple.product-type.app-extension');
    expect(report.embed).toBe(true);
    expect(report.dependency).toBe(true);
    // The attributes file must be compiled by BOTH targets, or the app and the
    // widget would be two different attribute types.
    expect(report.widget.sources).toContain('JobaTaskActivityAttributes.swift');
    expect(report.app_sources).toContain('JobaTaskActivityAttributes.swift');
    expect(report.app_sources).toContain('LiveActivityPlugin.swift');
    expect(report.app_sources).toContain('SceneDelegate.swift');
    expect(report.app_conditions.Debug).toContain('LIVE_ACTIVITY_WIDGET');
    expect(report.app_conditions.Release).toContain('LIVE_ACTIVITY_WIDGET');
    expect(report.info_plist.NSSupportsLiveActivities).toBe(true);
  });

  it('is reproducible: a second run changes nothing', () => {
    const box = sandbox();
    patch(box);
    const afterFirst = read(box.project);
    const second = run(PATCHER, patchArgs(box.project, box.info), widgetEnv);
    expect(second.status).toBe(0);
    expect(second.stderr).toContain('already applied');
    expect(read(box.project)).toBe(afterFirst);
  });

  it('matches the widget bundle id CI passes in, not a derived guess', () => {
    const box = sandbox();
    const other = `${APP_BUNDLE_ID}.DifferentWidgetId`;
    run(PATCHER, patchArgs(box.project, box.info), { WIDGET_BUNDLE_ID: other });
    run(PATCHER, [...patchArgs(box.project, box.info), '--check', '--require', '--report', box.report],
      { WIDGET_BUNDLE_ID: other });

    expect(JSON.parse(read(box.report)).widget.bundle_id).toBe(other);
    expect(read(box.project)).toContain(other);
  });

  it('ships the widget Info.plist with the app-inherited version keys', () => {
    // If the extension hardcoded a version, App Store Connect would reject the
    // upload because an extension's version must match its host app.
    const plist = read(WIDGET_INFO);
    expect(plist).toContain('$(MARKETING_VERSION)');
    expect(plist).toContain('$(CURRENT_PROJECT_VERSION)');
    expect(plist).toContain('com.apple.widgetkit-extension');
    // ...and the app's own plist must use the same substitution.
    const app = read(APP_INFO);
    expect(app).toContain('$(MARKETING_VERSION)');
    expect(app).toContain('$(CURRENT_PROJECT_VERSION)');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   3. SIGNING — profile → export options, by bundle id
   ══════════════════════════════════════════════════════════════════════════ */
function profileXml(name, bundleId, team = TEAM_ID) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Name</key>
	<string>${name}</string>
	<key>TeamIdentifier</key>
	<array>
		<string>${team}</string>
	</array>
	<key>Entitlements</key>
	<dict>
		<key>application-identifier</key>
		<string>${team}.${bundleId}</string>
	</dict>
</dict>
</plist>
`;
}

/** A directory holding the given profiles as .mobileprovision files. */
function profileDir(profiles) {
  const dir = mkdtempSync(join(tmpdir(), 'joba-profiles-'));
  for (const [name, bundleId] of profiles) {
    writeFileSync(join(dir, `${name}.mobileprovision`), profileXml(name, bundleId));
  }
  return dir;
}

function exportOptions(args) {
  return run(EXPORT_OPTIONS, args);
}

describe('export options map one profile per bundle id', () => {
  it('names a profile for the app AND the extension when the widget is on', () => {
    const dir = profileDir([['Joba24 AppStore', APP_BUNDLE_ID], ['Joba24 Widget', WIDGET_BUNDLE_ID]]);
    const out = join(dir, 'export_options.plist');
    const report = join(dir, 'export-options.json');

    const result = exportOptions([
      '--profiles-dir', dir, '--app-bundle-id', APP_BUNDLE_ID,
      '--widget-bundle-id', WIDGET_BUNDLE_ID, '--require-widget', 'True',
      '--out', out, '--report', report,
    ]);

    expect(result.status).toBe(0);
    const options = read(out);
    expect(options).toContain('<string>manual</string>');
    expect(options).toContain('<string>app-store-connect</string>');
    expect(options).toContain('<string>Joba24 AppStore</string>');
    expect(options).toContain('<string>Joba24 Widget</string>');
    // The team id comes from the profile itself - no hardcoded value in the step.
    expect(options).toContain(TEAM_ID);
    // Same contract as the generator: one JSON document in its own file.
    expect(JSON.parse(read(report)).ok).toBe(true);
  });

  it('leaves the shipping build as a single-profile export', () => {
    const dir = profileDir([['Joba24 AppStore', APP_BUNDLE_ID]]);
    const out = join(dir, 'export_options.plist');
    const result = exportOptions([
      '--profiles-dir', dir, '--app-bundle-id', APP_BUNDLE_ID,
      '--widget-bundle-id', WIDGET_BUNDLE_ID, '--require-widget', 'false',
      '--out', out,
    ]);

    expect(result.status).toBe(0);
    const options = read(out);
    expect(options).toContain('<string>Joba24 AppStore</string>');
    expect(options).not.toContain(WIDGET_BUNDLE_ID);
  });

  it('keeps the legacy single-profile fallback, and only when there is one', () => {
    const single = profileDir([['Only Profile On Disk', 'com.something.else']]);
    const singleOut = join(single, 'eo.plist');
    const singleRun = exportOptions([
      '--profiles-dir', single, '--app-bundle-id', APP_BUNDLE_ID, '--out', singleOut,
    ]);
    expect(singleRun.status).toBe(0);          // no widget profile required
    expect(read(singleOut)).toContain('Only Profile On Disk');

    // With two profiles on disk an unmatched app id is an error: the old shell
    // loop silently exported the app with whichever profile sorted first.
    const two = profileDir([['Widget Only', WIDGET_BUNDLE_ID], ['Someone Else', 'com.other.app']]);
    const twoRun = exportOptions([
      '--profiles-dir', two, '--app-bundle-id', APP_BUNDLE_ID, '--out', join(two, 'eo.plist'),
    ]);
    expect(twoRun.status).toBe(1);
    expect(twoRun.stderr).toContain('no provisioning profile matches the app bundle id');
  });

  it('refuses to export a widget build without the extension profile', () => {
    const dir = profileDir([['Joba24 AppStore', APP_BUNDLE_ID]]);
    const out = join(dir, 'eo.plist');
    const report = join(dir, 'eo.json');

    const result = exportOptions([
      '--profiles-dir', dir, '--app-bundle-id', APP_BUNDLE_ID,
      '--widget-bundle-id', WIDGET_BUNDLE_ID, '--require-widget', 'true',
      '--out', out, '--report', report,
    ]);

    expect(result.status).toBe(1);
    expect(existsSync(out)).toBe(false);
    const parsed = JSON.parse(read(report));
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain(WIDGET_BUNDLE_ID);
  });

  it('refuses an unresolvable widget flag instead of defaulting to off', () => {
    const dir = profileDir([['Joba24 AppStore', APP_BUNDLE_ID]]);
    const result = exportOptions([
      '--profiles-dir', dir, '--app-bundle-id', APP_BUNDLE_ID,
      '--require-widget', 'maybe', '--out', join(dir, 'eo.plist'),
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('must be true or false');
  });

  it('fails clearly when no profiles were downloaded at all', () => {
    const empty = mkdtempSync(join(tmpdir(), 'joba-no-profiles-'));
    const result = exportOptions([
      '--profiles-dir', empty, '--app-bundle-id', APP_BUNDLE_ID, '--out', join(empty, 'eo.plist'),
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('no provisioning profiles found');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   3b. THE REAL STEP, EXECUTED — both build modes
   ══════════════════════════════════════════════════════════════════════════
   The block below is not a reconstruction: it is the `script:` text of the
   "Wire the Live Activity widget extension" step, read out of codemagic.yaml and
   run by bash with `set -e`, in a throwaway copy of the project. That is what
   makes "the widget-disabled build is unchanged" a tested claim rather than a
   comment. */

function workflowStep(name) {
  const yaml = read(CODEMAGIC);
  const marker = `      - name: ${name}\n        script: |\n`;
  const start = yaml.indexOf(marker);
  if (start < 0) throw new Error(`workflow step not found: ${name}`);
  const body = yaml.slice(start + marker.length);
  const lines = [];
  for (const line of body.split('\n')) {
    // Step body lines are indented ten spaces; the first line that is not ends it.
    if (!line.startsWith('          ') && line.trim() !== '') break;
    lines.push(line.slice(10));
  }
  return lines.join('\n');
}

/** A directory that looks like the repository to the step script. */
function workspace() {
  const dir = mkdtempSync(join(tmpdir(), 'joba-step-'));
  for (const sub of ['scripts', 'ios/App/App.xcodeproj', 'ios/App/App', 'ios/App/JobaActivityWidget', 'build']) {
    mkdirSync(join(dir, sub), { recursive: true });
  }
  copyFileSync(PATCHER, join(dir, 'scripts/patch-ios-live-activity.py'));
  copyFileSync(PROJECT, join(dir, 'ios/App/App.xcodeproj/project.pbxproj'));
  copyFileSync(APP_INFO, join(dir, 'ios/App/App/Info.plist'));
  // The step asserts these exist before it patches anything (cap sync can
  // regenerate the native scaffolding), so the workspace must contain them.
  copyFileSync(join(ROOT, 'ios/App/App/LiveActivityPlugin.swift'),
    join(dir, 'ios/App/App/LiveActivityPlugin.swift'));
  for (const name of ['JobaActivityWidgetBundle.swift', 'JobaTaskActivityAttributes.swift', 'Info.plist']) {
    copyFileSync(join(ROOT, 'ios/App/JobaActivityWidget', name), join(dir, 'ios/App/JobaActivityWidget', name));
  }
  return dir;
}

/**
 * The step minus its final PlistBuddy block: /usr/libexec/PlistBuddy exists only
 * on macOS. The block is asserted to still be in the workflow separately, so
 * dropping it here cannot hide a deleted check.
 */
function runnableStep(name) {
  const script = workflowStep(name);
  const cut = script.indexOf('echo "=== Confirming the app is allowed to show Live Activities ==="');
  return cut < 0 ? script : script.slice(0, cut);
}

describe('the widget step runs green in both modes', () => {
  const STEP = 'Wire the Live Activity widget extension (opt-in)';

  it('generates, verifies and consumes its own report when the widget is on', () => {
    const dir = workspace();
    const file = join(dir, 'step.sh');
    writeFileSync(file, `set -e\n${runnableStep(STEP)}\n`);

    const result = spawnSync('bash', [file], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, ENABLE_LIVE_ACTIVITY_WIDGET: 'true',
        WIDGET_BUNDLE_ID, CM_BUILD_DIR: join(dir, 'build') },
    });

    expect(result.stderr + result.stdout).toContain('OK: project widget bundle id matches WIDGET_BUNDLE_ID');
    expect(result.stderr + result.stdout).toContain('fully wired');
    expect(result.status).toBe(0);
    // The report is a document, and the patched project really has the target.
    expect(JSON.parse(read(join(dir, 'build/widget-check.json'))).widget.present).toBe(true);
    expect(read(join(dir, 'ios/App/App.xcodeproj/project.pbxproj'))).toContain('JobaActivityWidgetExtension');
  });

  it('touches nothing and exits 0 when the widget is off', () => {
    const dir = workspace();
    const projectBefore = read(join(dir, 'ios/App/App.xcodeproj/project.pbxproj'));
    const plistBefore = read(join(dir, 'ios/App/App/Info.plist'));
    const file = join(dir, 'step.sh');
    writeFileSync(file, `set -e\n${runnableStep(STEP)}\n`);

    const result = spawnSync('bash', [file], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, ENABLE_LIVE_ACTIVITY_WIDGET: 'false',
        WIDGET_BUNDLE_ID, CM_BUILD_DIR: join(dir, 'build') },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('SKIPPED');
    // The shipping build's project and Info.plist are byte-identical.
    expect(read(join(dir, 'ios/App/App.xcodeproj/project.pbxproj'))).toBe(projectBefore);
    expect(read(join(dir, 'ios/App/App/Info.plist'))).toBe(plistBefore);
    expect(existsSync(join(dir, 'build/widget-check.json'))).toBe(false);
  });

  it('still checks NSSupportsLiveActivities in the real workflow', () => {
    // The macOS-only tail this test skips must still be in the step.
    expect(workflowStep(STEP)).toContain('Print :NSSupportsLiveActivities');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4. THE WORKFLOW ITSELF — both modes, statically
   ══════════════════════════════════════════════════════════════════════════ */
describe('ios-workflow wiring', () => {
  const yaml = read(CODEMAGIC);

  it('never redirects a diagnostic stream into the JSON report again', () => {
    // The exact construct that failed: stdout (document + sentence) > file.
    expect(yaml).not.toMatch(/patch-ios-live-activity\.py --check --require\s*>/);
    expect(yaml).toContain('--report "$CM_BUILD_DIR/widget-check.json"');
    // The consumer validates the document before reading a single field.
    expect(yaml).toContain('if not report.get("ok"):');
  });

  it('has no `[ -z ] && …` statement left in a step (the set -e trap)', () => {
    const offenders = yaml.split('\n').filter((line) => /^\s*\[ .* \] && /.test(line));
    expect(offenders).toEqual([]);
  });

  it('builds the export options with the tested script, then exports', () => {
    expect(yaml).toContain('python3 scripts/ios-export-options.py');
    expect(yaml).toContain('--app-bundle-id "$BUNDLE_ID"');
    expect(yaml).toContain('--widget-bundle-id "$WIDGET_BUNDLE_ID"');
    expect(yaml).toContain('--require-widget "${ENABLE_LIVE_ACTIVITY_WIDGET:-false}"');
    expect(yaml).toContain('--out "$CM_BUILD_DIR/export_options.plist"');
    // The export itself is unchanged and still uses that file.
    expect(yaml).toMatch(/- name: Export ipa\n        script: \|\n(?:.*\n)*?          xcodebuild -exportArchive/);
    expect(yaml).toContain('-exportOptionsPlist "$CM_BUILD_DIR/export_options.plist"');
    // No inline heredoc plist can drift from the script's contract.
    expect(yaml).not.toContain('<key>provisioningProfiles</key>');
  });

  it('gates every widget step on the resolved flag', () => {
    // A widget-disabled build must skip: project patch, profile fetch, signing
    // assertion, archive assertions. Four guards, all reading the same variable.
    const guards = yaml.match(/ENABLE_LIVE_ACTIVITY_WIDGET:-\}/g) || [];
    expect(guards.length).toBeGreaterThanOrEqual(4);
    expect(yaml).toContain('if [ "${ENABLE_LIVE_ACTIVITY_WIDGET:-}" != "true" ]; then');
  });

  it('verifies the extension version matches the app before uploading', () => {
    expect(yaml).toContain('CFBundleShortVersionString');
    expect(yaml).toContain('an extension\'s version must match its host app');
  });

  it('still archives, still uploads to TestFlight, still builds Android', () => {
    expect(yaml).toContain('xcodebuild archive');
    expect(yaml).toContain('submit_to_testflight: true');
    expect(yaml).toContain('android-workflow:');
    // Production APNs config is untouched by any of this.
    expect(yaml).not.toContain('APNS_PRIVATE_KEY');
  });
});