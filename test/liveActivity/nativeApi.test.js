import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * The ActivityKit surface — and the honest limit of a test like this.
 *
 * ── WHAT THIS FILE CAN AND CANNOT PROVE ────────────────────────────────────
 * It CAN prove that the two call shapes which failed the Codemagic archive are
 * gone and that the replacements are the static members Apple actually declares,
 * inside the availability scope those members require. It CANNOT prove the
 * Swift compiles: only Xcode can say that, and no JavaScript test is a
 * substitute for an archive.
 *
 * This distinction is the point. The previous round's suite was green while
 * `Activity<...>.pushType` — a member that has never existed — sat in the file,
 * because the tests asserted what the code *did*, never how it *called the SDK*.
 * These assertions are therefore written against the SDK's declarations:
 *
 *     class Activity<Attributes> {
 *         @available(iOS 17.2, *)
 *         public static var pushToStartToken: Data? { get }
 *         @available(iOS 17.2, *)
 *         public static var pushToStartTokenUpdates: Activity<Attributes>.PushTokenUpdates { get }
 *     }
 *
 * Note both are STATIC and on `Activity` — never on a `PushType`. `PushType` is
 * only the argument that opts one activity into push at
 * `Activity.request(attributes:content:pushType:)`.
 */

const REPO = process.cwd();
const read = (path) => readFileSync(resolve(REPO, path), 'utf8');

const plugin = read('ios/App/App/LiveActivityPlugin.swift');
const nativeBridge = read('src/lib/liveActivityNative.js');
const store = read('ios/App/JobaActivityWidget/JobaActivityAuthStore.swift');
const widget = read('ios/App/JobaActivityWidget/JobaActivityWidgetBundle.swift');
const intent = read('ios/App/JobaActivityWidget/JobaTaskActionIntent.swift');

describe('the push-to-start API is the one ActivityKit actually declares', () => {
  it('reads the INSTALL token from the static member, not from a pushType', () => {
    expect(plugin).toMatch(/Activity<JobaTaskActivity>\.pushToStartToken\b/);
    // `Activity` has no `pushType` member — this is the exact archive error.
    expect(plugin).not.toMatch(/Activity<[A-Za-z0-9_]+>\s*\.\s*pushType\b/);
    expect(plugin).not.toMatch(/\.pushType\?\./);
  });

  it('observes the static update stream', () => {
    expect(plugin).toMatch(/Activity<JobaTaskActivity>\.pushToStartTokenUpdates\b/);
    // It is an AsyncSequence, so it is consumed with `for await`, never awaited once.
    expect(plugin).toMatch(/for await tokenData in updates/);
  });

  it('keeps the one legitimate `pushType` use: the request argument', () => {
    // `Activity.request(..., pushType: .token)` is correct and must survive.
    expect(plugin).toContain('pushType: .token');
  });

  it('references both static members only inside an iOS 17.2 availability scope', () => {
    // Comments are stripped first: a doc comment that mentions the API must not
    // be mistaken for a call to it (this exact confusion is why the window below
    // is anchored to the enclosing function rather than to a character offset).
    const code = plugin.replace(/\/\/[^\n]*/g, '');
    for (const member of ['pushToStartToken', 'pushToStartTokenUpdates']) {
      const index = code.search(new RegExp(`Activity<JobaTaskActivity>\\.${member}\\b`));
      expect(index, `${member} must be referenced`).toBeGreaterThan(-1);
      // The scope that makes the 17.2-only member legal: the enclosing method's
      // annotation, or the `guard #available` inside it.
      const scopeStart = Math.max(0, code.lastIndexOf('func ', index) - 120);
      const scope = code.slice(scopeStart, index);
      expect(scope).toMatch(/@available\(iOS 17\.2|#available\(iOS 17\.2/);
    }
  });
});

describe('the ActivityState switch cannot break on a newer SDK', () => {
  it('reports an SDK-added state by its own name instead of naming it', () => {
    expect(plugin).toContain('@unknown default: return String(describing: state).lowercased()');
    // Naming `.pending` is a HARD ERROR on any SDK that lacks it, so the case is
    // deliberately not spelled out: the description yields "pending" anyway.
    expect(plugin).not.toMatch(/case \.pending\b/);
  });

  it('still names the four states it can act on', () => {
    for (const state of ['active', 'stale', 'ended', 'dismissed']) {
      expect(plugin).toContain(`case .${state}:`);
    }
  });
});

describe('nothing that was working was traded away for the build', () => {
  it('keeps the plugin surface the app calls', () => {
    for (const method of ['pushToStartToken', 'setUserActionAuth', 'setActionAuth', 'actionStages']) {
      expect(plugin).toContain(`CAPPluginMethod(name: "${method}"`);
    }
  });

  it('keeps registering the start token with the backend', () => {
    // The registration path is untouched by this fix: one token kind, one call.
    expect(nativeBridge).toMatch(/kind: 'start'/);
    expect(nativeBridge).toContain("base44.functions.invoke('registerLiveActivityToken'");
    expect(nativeBridge).toMatch(/export async function syncPushToStartToken\(/);
    expect(nativeBridge).toContain("JobaActivity.addListener('pushToStartToken'");
  });

  it('keeps the expired-capability fallback intact', () => {
    expect(store).toContain('static func canAct(taskId: String, role: String, now: Date = Date())');
    expect(widget).toContain('if JobaActivityAuthStore.canAct(taskId: taskId, role: role)');
    expect(widget).toMatch(/Link\(destination: url\)/);
    expect(intent).toContain('stage("no_capability"');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   The generator: the only step that stands between this tree and an archive
   ══════════════════════════════════════════════════════════════════════════ */
const pythonAvailable = spawnSync('python3', ['--version']).status === 0;
const runPatcher = (args) => spawnSync(
  'python3',
  ['scripts/patch-ios-live-activity.py', ...args],
  { cwd: REPO, encoding: 'utf8' },
);

describe.runIf(pythonAvailable)('the patch script repairs and gates the Swift it prepares', () => {
  const withTempTree = (fn) => {
    const dir = mkdtempSync(join(tmpdir(), 'joba-lv-api-'));
    try {
      const project = join(dir, 'project.pbxproj');
      const plist = join(dir, 'Info.plist');
      const plugin = join(dir, 'LiveActivityPlugin.swift');
      copyFileSync(resolve(REPO, 'ios/App/App.xcodeproj/project.pbxproj'), project);
      copyFileSync(resolve(REPO, 'ios/App/App/Info.plist'), plist);
      return fn({ dir, project, plist, plugin });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  /** The tree as it was when Codemagic failed: the exact two lines. */
  const brokenPlugin = () => read('ios/App/App/LiveActivityPlugin.swift')
    .replace(
      'Activity<JobaTaskActivity>.pushToStartTokenUpdates',
      'Activity<JobaTaskActivity>.pushType?.pushToStartTokenUpdates',
    )
    .replace(
      'Activity<JobaTaskActivity>.pushToStartToken',
      'Activity<JobaTaskActivity>.pushType?.pushToStartToken',
    );

  it('repairs an older tree in the same run that wires the project', () => {
    withTempTree(({ project, plist, plugin }) => {
      const broken = brokenPlugin();
      expect(broken).toMatch(/\.pushType\?\.pushToStartToken/);
      writeFileSync(plugin, broken);

      const applied = runPatcher(['--project', project, '--info-plist', plist, '--plugin', plugin, '--quiet']);
      expect(applied.status, applied.stderr).toBe(0);

      const repaired = readFileSync(plugin, 'utf8');
      expect(repaired).not.toMatch(/Activity<[A-Za-z0-9_]+>\s*\.\s*pushType\b/);
      expect(repaired).toMatch(/Activity<JobaTaskActivity>\.pushToStartToken\b/);
      expect(repaired).toMatch(/Activity<JobaTaskActivity>\.pushToStartTokenUpdates\b/);

      const checked = runPatcher(['--check', '--require', '--quiet',
        '--project', project, '--info-plist', plist, '--plugin', plugin]);
      expect(checked.status, checked.stderr).toBe(0);
      expect(checked.stderr).toContain('OK: Live Activity widget extension is fully wired');
    });
  });

  it('refuses to certify a tree where the broken expression is back', () => {
    withTempTree(({ project, plist, plugin }) => {
      // Wire the project properly, then break ONLY the source the gate reads.
      const applied = runPatcher(['--project', project, '--info-plist', plist, '--plugin', plugin, '--quiet']);
      expect(applied.status, applied.stderr).toBe(0);
      writeFileSync(plugin, brokenPlugin());

      const checked = runPatcher(['--check', '--require', '--quiet',
        '--project', project, '--info-plist', plist, '--plugin', plugin]);
      expect(checked.status).toBe(1);
      expect(checked.stderr).toMatch(/ActivityKit member that does not exist/);
    });
  });

  it('passes on this repository, and the committed plugin needs no repair', () => {
    withTempTree(({ project, plist, plugin }) => {
      copyFileSync(resolve(REPO, 'ios/App/App/LiveActivityPlugin.swift'), plugin);
      const applied = runPatcher(['--project', project, '--info-plist', plist, '--plugin', plugin, '--quiet']);
      expect(applied.status, applied.stderr).toBe(0);
      // Nothing to repair: the file on disk is already correct.
      expect(applied.stderr).not.toContain('repaired LiveActivityPlugin.swift');
      expect(readFileSync(plugin, 'utf8')).toBe(read('ios/App/App/LiveActivityPlugin.swift'));
    });
  });
});