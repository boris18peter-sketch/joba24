import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../..');
const SCRIPT = join(ROOT, 'scripts/patch-ios-live-activity.py');
const PROJECT = join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj');
const APP_INFO = join(ROOT, 'ios/App/App/Info.plist');

const INTENT = join(ROOT, 'ios/App/JobaActivityWidget/JobaTaskActionIntent.swift');
const STORE = join(ROOT, 'ios/App/JobaActivityWidget/JobaActivityAuthStore.swift');
const WIDGET = join(ROOT, 'ios/App/JobaActivityWidget/JobaActivityWidgetBundle.swift');
const PLUGIN = join(ROOT, 'ios/App/App/LiveActivityPlugin.swift');
const BRIDGE = join(ROOT, 'src/components/RealTaskActivityBridge.jsx');
const NATIVE = join(ROOT, 'src/lib/liveActivityNative.js');
const BACKEND = join(ROOT, 'base44/functions/liveActivityRealTask/entry.ts');
const ENTITY = join(ROOT, 'base44/entities/LiveActivityDeviceEvent.jsonc');

const read = (p) => readFileSync(p, 'utf8');
const check = (project, info) => JSON.parse(
  execFileSync('python3', [SCRIPT, '--check', '--project', project, '--info-plist', info], { cwd: ROOT, encoding: 'utf8' }),
);
const pythonLog = (args) => {
  const result = spawnSync('python3', [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });
  return `${result.stdout || ''}${result.stderr || ''}`;
};

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'joba-intent-'));
  const project = join(dir, 'project.pbxproj');
  const info = join(dir, 'Info.plist');
  copyFileSync(PROJECT, project);
  copyFileSync(APP_INFO, info);
  return { project, info };
}

/**
 * Downgrade a patched project to the shape that was actually on the phone: the
 * App Intent compiled into the widget extension ONLY.
 *
 * The app-phase entry is identified by the file above it (the Capacitor plugin,
 * which only the app target compiles), so this cannot accidentally remove the
 * widget's copy — the point is that the widget KEEPS its copy and the button is
 * still dead.
 */
function makeWidgetOnly(projectPath) {
  const lines = read(projectPath).split('\n');
  const appSources = lines.findIndex((line, i) =>
    line.includes('JobaTaskActionIntent.swift in Sources */,')
    && lines[i - 1].includes('LiveActivityPlugin.swift in Sources */'));
  const buildFiles = lines
    .map((line, i) => (line.includes('JobaTaskActionIntent.swift in Sources */ = {isa = PBXBuildFile') ? i : -1))
    .filter((i) => i >= 0);
  expect(appSources).toBeGreaterThan(-1);
  expect(buildFiles.length).toBe(2);
  for (const index of [appSources, buildFiles[buildFiles.length - 1]].sort((a, b) => b - a)) {
    lines.splice(index, 1);
  }
  writeFileSync(projectPath, lines.join('\n'));
}

/* ══════════════════════════════════════════════════════════════════════════
   1. THE ROOT CAUSE — a LiveActivityIntent must be compiled into the APP too
   ══════════════════════════════════════════════════════════════════════════
   The build that shipped drew the green "סיימתי את התיקון" button perfectly and
   did nothing when tapped. The widget had the intent type (so it could construct
   the Button), but a `LiveActivityIntent` is PERFORMED by the system in the app's
   process, and the app binary contained no such intent. Nothing ran, nothing was
   sent, the task never moved — and every existing check passed, because the
   widget copy was there and the entitlements were correct.

   These tests make that exact build fail in CI instead of in someone's hand. */
describe('the App Intent is compiled into BOTH targets', () => {
  it('puts JobaTaskActionIntent.swift in the app target and the widget', () => {
    const { project, info } = sandbox();
    pythonLog(['--project', project, '--info-plist', info, '--quiet']);
    const report = check(project, info);

    // The app RUNS it...
    expect(report.app_sources).toContain('JobaTaskActionIntent.swift');
    // ...and the widget CONSTRUCTS the button with it.
    expect(report.widget.sources).toContain('JobaTaskActionIntent.swift');
    // The two files it needs at run time are there as well.
    expect(report.app_sources).toContain('JobaActivityAuthStore.swift');
    expect(report.app_sources).toContain('JobaTaskActivityAttributes.swift');
  });

  it('fails the CI gate for the widget-only shape that shipped', () => {
    const { project, info } = sandbox();
    pythonLog(['--project', project, '--info-plist', info, '--quiet']);
    makeWidgetOnly(project);

    // The widget still has the type, so a shallower gate would stay green.
    expect(check(project, info).widget.sources).toContain('JobaTaskActionIntent.swift');
    expect(check(project, info).app_sources).not.toContain('JobaTaskActionIntent.swift');

    const output = pythonLog(['--check', '--require', '--project', project, '--info-plist', info, '--quiet']);
    expect(output).toContain('App sources: JobaTaskActionIntent.swift');
  });

  it('repairs an already-patched project instead of reporting "already applied"', () => {
    const { project, info } = sandbox();
    pythonLog(['--project', project, '--info-plist', info, '--quiet']);
    makeWidgetOnly(project);

    const notes = pythonLog(['--project', project, '--info-plist', info]);
    expect(notes).toContain('added JobaTaskActionIntent.swift to the APP target');
    expect(check(project, info).app_sources).toContain('JobaTaskActionIntent.swift');
    // ...and the gate is clean again.
    expect(pythonLog(['--check', '--require', '--project', project, '--info-plist', info, '--quiet']))
      .toContain('fully wired');
  });

  it('stays idempotent across runs', () => {
    const { project, info } = sandbox();
    pythonLog(['--project', project, '--info-plist', info, '--quiet']);
    const once = read(project);
    pythonLog(['--project', project, '--info-plist', info, '--quiet']);
    expect(read(project)).toBe(once);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. The intent itself: no silent no-op, no invented state
   ══════════════════════════════════════════════════════════════════════════ */
describe('the intent records every stage it stops at', () => {
  const intent = read(INTENT);

  it('is a LiveActivityIntent performed in the app, drawing from the contract', () => {
    expect(intent).toContain('struct JobaTaskActionIntent: LiveActivityIntent');
    expect(intent).toContain('@Parameter(title: "Task")');
    expect(intent).toContain('@Parameter(title: "Role")');
    expect(intent).toContain('@Parameter(title: "Action")');
    expect(intent).toContain('@Parameter(title: "Step")');
  });

  it('names an explicit stage for every way a tap can fail', () => {
    for (const stage of [
      'activity_missing',
      'action_missing',
      'no_endpoint',
      'no_capability',
      'payload_error',
      'network_error',
      'stale_refreshed',
    ]) {
      expect(intent, `the intent must record ${stage}`).toContain(`"${stage}"`);
    }
    // An HTTP refusal is identified by its status AND the server's own code.
    expect(intent).toContain('http_\\(status)');
    expect(intent).toContain('decoded?.error');
  });

  it('writes those stages to the shared App Group, never to a log or a payload', () => {
    expect(intent).toContain('JobaActivityAuthStore.record(');
    // No console logging at all — an extension's stdout is not a diagnostic
    // surface, and a log line is exactly where a token ends up by accident.
    expect(intent).not.toContain('NSLog');
    expect(intent).not.toContain('print(');
    // The capability never enters the activity's content (it is on a Lock Screen)
    // and never into a URL.
    expect(intent).not.toMatch(/withActionState\(token/);
    expect(intent).toContain('"token": token,');
    expect(intent).not.toContain('token: token,');
  });

  it('does not send an unauthenticated request, and says so on the card', () => {
    const capabilityGuard = intent.indexOf('no_capability');
    const request = intent.indexOf('URLSession.shared.data');
    expect(capabilityGuard).toBeGreaterThan(-1);
    expect(request).toBeGreaterThan(capabilityGuard);
    // The card shows the failure instead of pretending the tap worked.
    expect(intent).toContain('withActionState("failed")');
  });

  it('asks for confirmation before the irreversible approval, and only then', () => {
    const confirm = intent.indexOf('withActionState("confirm")');
    const send = intent.indexOf('URLSession.shared.data');
    expect(confirm).toBeGreaterThan(-1);
    expect(confirm).toBeLessThan(send);
    // The gate is the CONTRACT's own marker — an action the server marked
    // irreversible by sending a confirmation sentence — never a hardcoded id.
    expect(intent).toContain('let requiresConfirm = !(action.confirm ?? "").isEmpty');
    expect(intent).toContain('if requiresConfirm && !awaitingConfirmation {');
    // A worker step is not gated twice: the contract makes it forward-only.
    expect(intent).toContain('current.actionState == "confirm"');
  });

  it('treats a refusal that contradicts the card as a stale card, not a failure', () => {
    expect(intent).toContain('isStaleRefusal');
    expect(intent).toContain('server.phase != current.phase');
    expect(intent).toContain('server.action?.id != current.action?.id');
  });

  it('survives a body it cannot decode, and still reports the status', () => {
    expect(intent).toContain('try? JSONDecoder().decode(JobaActionResponse.self, from: data)');
    expect(intent).toContain('(response as? HTTPURLResponse)?.statusCode');
  });
});

describe('the app forwards what the Lock Screen did', () => {
  it('drains the App Group through the bridge, once', () => {
    expect(read(PLUGIN)).toContain('CAPPluginMethod(name: "actionStages"');
    expect(read(PLUGIN)).toContain('JobaActivityAuthStore.drainStages()');
    expect(read(STORE)).toContain('static func drainStages()');
    // Draining is what makes "exactly once" true.
    expect(read(STORE)).toContain('defaults.removeObject(forKey: stagesKey)');
  });

  it('turns a stage into a device event the server accepts', () => {
    const bridge = read(BRIDGE);
    expect(bridge).toContain('drainActivityActionStages');
    expect(bridge).toContain("event: String(entry.stage || '').startsWith('applied') ? 'action_applied' : 'action_failed'");
    expect(read(BACKEND)).toContain("'action_applied', 'action_failed'");
    // The stored reason is the stage plus its code, and nothing else.
    expect(bridge).toContain(".join(':')");
    expect(JSON.parse(read(ENTITY)).properties.event.enum).toEqual(expect.arrayContaining(['action_applied', 'action_failed']));
  });

  it('keeps the capability alive across updates and relaunches', () => {
    const native = read(NATIVE);
    // Minted on start...
    expect(native).toMatch(/if \(result\?\.started === true\) \{\s*\n\s*ensureActionCapability/);
    // ...AND on a successful update, which is the pass a relaunched app takes for
    // a card that is already running.
    expect(native).toMatch(/if \(result\?\.updated === true\) \{[\s\S]{0,400}ensureActionCapability/);
    // A failed mint is retried rather than remembered as success.
    expect(native).toContain('if (result?.ok) capabilityCache.set(key, result)');
    // A closed card forgets it, so the next activity mints a fresh capability.
    expect(native).toContain('capabilityCache.delete(');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   3. The button is only drawn when it can act at all
   ══════════════════════════════════════════════════════════════════════════ */
describe('the button and the card', () => {
  const widget = read(WIDGET);

  it('is a one-tap button bound to the live action, disabled while in flight', () => {
    expect(widget).toContain('Button(intent: JobaTaskActionIntent(');
    expect(widget).toContain('actionId: action.id');
    expect(widget).toContain('expectedStep: action.step');
    expect(widget).toContain('.disabled(isPending)');
  });

  it('is drawn only on iOS 17, where a Live Activity can be interactive', () => {
    expect(widget).toContain('if #available(iOS 17.0, *)');
    expect(widget).toContain('ProgressView()');
    expect(widget).toContain('arrow.clockwise');
  });
});