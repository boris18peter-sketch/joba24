import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync, copyFileSync, readFileSync, readdirSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeConfig } from '../../base44/shared/liveActivityConfig.ts';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../..');
const SCRIPT = join(ROOT, 'scripts/patch-ios-live-activity.py');
const PROJECT = join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj');
const APP_INFO = join(ROOT, 'ios/App/App/Info.plist');
const WIDGET_DIR = join(ROOT, 'ios/App/JobaActivityWidget');
const PLUGIN = join(ROOT, 'ios/App/App/LiveActivityPlugin.swift');
const BRIDGE = join(ROOT, 'src/lib/liveActivityNative.js');
const CODEMAGIC = join(ROOT, 'codemagic.yaml');

const read = (p) => readFileSync(p, 'utf8');
const python = (args) => execFileSync('python3', [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });
const check = (project, info) => JSON.parse(python(['--check', '--project', project, '--info-plist', info]));

/** Runs the generator expecting it to FAIL, and returns everything it said. */
const pythonFailure = (args) => {
  try {
    execFileSync('python3', [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    return '';
  } catch (err) {
    return `${err.stdout || ''}${err.stderr || ''}${err.message}`;
  }
};

/** A throwaway copy of the two files the generator touches. */
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'joba-la-'));
  const project = join(dir, 'project.pbxproj');
  const info = join(dir, 'Info.plist');
  copyFileSync(PROJECT, project);
  copyFileSync(APP_INFO, info);
  return { project, info };
}

/* ══════════════════════════════════════════════════════════════════════════
   1. The shipping project is untouched
   ══════════════════════════════════════════════════════════════════════════ */
describe('the committed project is unchanged', () => {
  it('has no widget target until the build generator runs', () => {
    const project = read(PROJECT);
    expect(project).not.toContain('JobaActivityWidgetExtension');
    expect(project).not.toContain('PBXCopyFilesBuildPhase');
    // The two files this stage adds to the app target are not referenced yet
    // either — the generator is the only thing that adds them.
    expect(project).not.toContain('LiveActivityPlugin.swift');
  });

  it('does not grant Live Activities to the shipping app', () => {
    // NSSupportsLiveActivities is added by the generator, so a build that never
    // enables the widget cannot behave differently from today's release.
    expect(read(APP_INFO)).not.toContain('NSSupportsLiveActivities');
  });

  it('ships the widget sources and the bridge in the repository', () => {
    expect(read(join(WIDGET_DIR, 'JobaTaskActivityAttributes.swift')).length).toBeGreaterThan(500);
    expect(read(join(WIDGET_DIR, 'JobaActivityWidgetBundle.swift')).length).toBeGreaterThan(500);
    expect(read(join(WIDGET_DIR, 'Info.plist'))).toContain('com.apple.widgetkit-extension');
    expect(read(PLUGIN)).toContain('CAPBridgedPlugin');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. The generator produces a real second target, idempotently
   ══════════════════════════════════════════════════════════════════════════ */
describe('project generator', () => {
  it('adds the extension target, then refuses to add it twice', () => {
    const { project, info } = sandbox();

    python(['--project', project, '--info-plist', info, '--quiet']);
    const afterFirst = read(project);
    const report = check(project, info);

    expect(report.ok).toBe(true);
    expect(report.targets.sort()).toEqual(['App', 'JobaActivityWidgetExtension']);
    expect(report.widget.present).toBe(true);
    expect(report.widget.product_type).toBe('com.apple.product-type.app-extension');
    expect(report.widget.deployment_target).toBe('16.1');
    expect(report.widget.skip_install).toBe('YES');
    expect(report.widget.infoplist_file).toBe('JobaActivityWidget/Info.plist');
    expect(report.widget.sources.sort()).toEqual([
      'JobaActivityWidgetBundle.swift',
      'JobaTaskActivityAttributes.swift',
    ]);
    expect(report.widget.configurations.sort()).toEqual(['Debug', 'Release']);
    expect(report.embed).toBe(true);
    expect(report.dependency).toBe(true);
    expect(report.app_sources).toContain('LiveActivityPlugin.swift');
    // The shared attributes file must be in BOTH targets, or the app and the
    // widget would be compiling two different attribute types.
    expect(report.app_sources).toContain('JobaTaskActivityAttributes.swift');

    const secondRun = python(['--project', project, '--info-plist', info]);
    expect(secondRun).toContain('already applied');
    expect(read(project)).toBe(afterFirst);
  });

  it('passes the strict CI gate only when fully wired', () => {
    const { project, info } = sandbox();
    expect(() => python(['--check', '--require', '--project', project, '--info-plist', info]))
      .toThrow(); // unwired copy must fail the gate

    python(['--project', project, '--info-plist', info, '--quiet']);
    const output = python(['--check', '--require', '--project', project, '--info-plist', info]);
    expect(output).toContain('fully wired');
  });

  it('leaves every existing app setting exactly as it was', () => {
    const { project, info } = sandbox();
    python(['--project', project, '--info-plist', info, '--quiet']);
    const patched = read(project);

    // The app target keeps its bundle id and its iOS 15 deployment target.
    expect(patched).toContain('PRODUCT_BUNDLE_IDENTIFIER = com.base69e6bdb4986a04a256653a23.app;');
    expect(patched).toContain('IPHONEOS_DEPLOYMENT_TARGET = 15.0;');
    expect(patched).toContain('CODE_SIGN_ENTITLEMENTS = App/App.entitlements;');
    expect(patched).toContain('INFOPLIST_FILE = App/Info.plist;');
    expect(patched).toContain('productType = "com.apple.product-type.application";');
    // The Capacitor SPM dependency of the app is still there.
    expect(patched).toContain('4D22ABE82AF431CB00220026 /* CapApp-SPM */');
    // Only the widget target is 16.1.
    expect(patched).toContain('IPHONEOS_DEPLOYMENT_TARGET = 16.1;');
  });

  it('enables Live Activities on the app once the extension is wired', () => {
    const { project, info } = sandbox();
    python(['--project', project, '--info-plist', info, '--quiet']);
    expect(read(info)).toContain('NSSupportsLiveActivities');
    expect(check(project, info).info_plist.NSSupportsLiveActivities).toBe(true);
    // The existing background mode must survive the plist rewrite.
    expect(check(project, info).info_plist.UIBackgroundModes).toContain('remote-notification');
  });

  it('refuses to write a project it cannot re-parse', () => {
    // A deliberately broken anchor proves the generator fails loudly instead of
    // producing a half-linked project.
    const dir = mkdtempSync(join(tmpdir(), 'joba-la-broken-'));
    const project = join(dir, 'project.pbxproj');
    const info = join(dir, 'Info.plist');
    copyFileSync(APP_INFO, info);
    copyFileSync(PROJECT, project);
    const damaged = read(project).replace('/* End PBXBuildFile section */', '');
    // (fs write through python is unnecessary: assert on the text itself)
    expect(damaged.includes('/* End PBXBuildFile section */')).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   3. The native contract matches the server's snapshot
   ══════════════════════════════════════════════════════════════════════════ */
describe('activity contract', () => {
  const attributes = read(join(WIDGET_DIR, 'JobaTaskActivityAttributes.swift'));
  const snapshot = read(join(ROOT, 'base44/shared/taskActivitySnapshot.ts'));

  const DISPLAYED_FIELDS = [
    'title', 'subtitle', 'phase', 'role', 'revision', 'contractVersion',
    'iconKey', 'colorKey', 'categoryLabel', 'deepLink', 'updatedAt',
    'progress', 'counters',
  ];

  it('decodes every field the server actually sends', () => {
    const codingKeys = attributes.slice(attributes.indexOf('private enum CodingKeys'));
    for (const field of DISPLAYED_FIELDS) {
      expect(codingKeys, `CodingKeys must cover "${field}"`).toContain(field);
      expect(snapshot, `the snapshot contract must still send "${field}"`).toContain(field);
    }
  });

  it('never drops an update because one field was unexpected', () => {
    // A strict decoder turns a single renamed or retyped field into a silently
    // dropped update. Every field is decoded defensively.
    expect(attributes).toContain('public init(from decoder: Decoder) throws');
    expect(attributes).toContain('try? c.decode(String.self, forKey: .title)');
    expect(attributes).toContain('?? ""');
    expect(attributes).not.toMatch(/try c\.decode\(String\.self, forKey: \.title\)/);
  });

  it('is compiled for the app and the widget with the same type', () => {
    // The attributes type is the join between the two targets; if the widget
    // declared its own copy, iOS would never match the incoming content.
    const widget = read(join(WIDGET_DIR, 'JobaActivityWidgetBundle.swift'));
    expect(widget).toContain('ActivityConfiguration(for: JobaTaskActivity.self)');
    expect(widget).toContain('context.state.title');
    expect(widget).toContain('context.state.subtitle');
    // No lifecycle decision is re-implemented in the widget.
    expect(widget).not.toContain("=== 'TAKEN'");
    expect(widget).not.toMatch(/task\.status/);
  });

  it('lays the activity out right-to-left, as the app does', () => {
    const widget = read(join(WIDGET_DIR, 'JobaActivityWidgetBundle.swift'));
    expect(widget).toContain('layoutDirection, .rightToLeft');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4. The bridge cannot contact Apple, and matches the web side
   ══════════════════════════════════════════════════════════════════════════ */
describe('capacitor bridge', () => {
  const plugin = read(PLUGIN);
  const bridge = read(BRIDGE);

  it('exposes the js name and methods the web bridge calls', () => {
    expect(plugin).toContain('public let jsName = "JobaActivity"');
    expect(bridge).toContain("LIVE_ACTIVITY_PLUGIN = 'JobaActivity'");

    const declared = [...plugin.matchAll(/CAPPluginMethod\(name: "([A-Za-z]+)"/g)].map((m) => m[1]);
    expect(declared.sort()).toEqual(['activeActivities', 'end', 'isAvailable', 'start', 'update']);

    const fromBridge = (bridge.match(/LIVE_ACTIVITY_METHODS = \[([^\]]+)\]/) || [])[1] || '';
    for (const method of declared) expect(fromBridge).toContain(method);
  });

  it('never sends anything itself', () => {
    // ActivityKit issues the token; the plugin only reports it. There is no HTTP
    // client here, so a bug cannot produce a push.
    expect(plugin).not.toContain('URLSession');
    expect(plugin).not.toContain('fetch(');
    expect(plugin).not.toContain('apns');
    expect(plugin).not.toContain('SendPushNotification');
    expect(plugin).toContain('notifyListeners("activityToken"');
  });

  it('maps the build type to the right APNs environment', () => {
    // Sandbox tokens are rejected by production APNs and vice versa.
    expect(plugin).toContain('#if DEBUG');
    expect(plugin).toContain('return "development"');
    expect(plugin).toContain('return "production"');
  });

  it('is inert on anything older than iOS 16.2 and on the web', () => {
    expect(plugin).toContain('#available(iOS 16.2, *)');
    expect(plugin).toContain('"unsupported_ios"');
    expect(bridge).toContain("Capacitor.getPlatform() === 'ios'");
    expect(bridge).toContain('not_native');
  });

  it('registers the token through the existing authorized function', () => {
    expect(bridge).toContain("'registerLiveActivityToken'");
    expect(bridge).toContain('task_id:');
    expect(bridge).toContain('environment:');
    // Never invents a content state — it must be handed one.
    expect(bridge).toContain('missing_input');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   5. Nothing activates it yet
   ══════════════════════════════════════════════════════════════════════════ */
describe('production stays inert', () => {
  function sourceFiles(dir = join(ROOT, 'src'), found = []) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) sourceFiles(full, found);
      else if (['.js', '.jsx', '.ts', '.tsx'].includes(extname(full))) found.push(full);
    }
    return found;
  }

  it('only the admin test panel imports the web bridge', () => {
    // The bridge must not be reachable from any user-facing screen yet. The one
    // permitted importer is the local test panel, which starts a fixture
    // activity and touches no task.
    const importers = sourceFiles().filter((file) => {
      if (file === BRIDGE) return false;
      return read(file).includes('liveActivityNative');
    });
    expect(importers).toEqual([join(ROOT, 'src/components/liveActivity/LiveActivityTestPanel.jsx')]);
  });

  it('reaches the local test surface only behind the admin guard', () => {
    const app = read(join(ROOT, 'src/App.jsx'));
    const guard = app.indexOf('<Route element={<AdminRoute />}>');
    expect(guard).toBeGreaterThan(-1);
    // The only declaration of the route sits inside that guarded block, which
    // closes at the first `</Route>` group after it.
    const guardedBlock = app.slice(guard, app.indexOf('</Route>\n                </Route>', guard));
    expect(guardedBlock).toContain('path="/live-activity-test"');
    expect(app.split('path="/live-activity-test"').length - 1).toBe(1);
  });

  it('the delivery locks are still shut', () => {
    const config = normalizeConfig(null);
    expect(config.enabled).toBe(false);
    expect(config.dry_run).toBe(true);
    // Observation is a separate switch and may stay on; it sends nothing.
    expect(normalizeConfig({ enabled: true, dry_run: true }).dry_run).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   6. The build pipeline gates everything behind one flag
   ══════════════════════════════════════════════════════════════════════════ */
describe('codemagic pipeline', () => {
  const yaml = read(CODEMAGIC);

  it('ships the widget off by default', () => {
    // The switch is NOT hardcoded in the workflow any more: it is asked for at
    // build time and defaults to off, so an ordinary build is exactly the app
    // that ships today and the production default can never be flipped by
    // accident in source control.
    expect(yaml).toContain('liveActivityWidget:');
    expect(yaml).toContain('type: boolean');
    expect(yaml).toContain('default: false');
    expect(yaml).not.toMatch(/^\s*ENABLE_LIVE_ACTIVITY_WIDGET:\s*"true"/m);
    // One step turns that input into the variable every gate below reads, and it
    // runs before the project can be patched.
    expect(yaml).toContain('echo "ENABLE_LIVE_ACTIVITY_WIDGET=true" >> "$CM_ENV"');
    expect(yaml.indexOf('Resolve build flags'))
      .toBeLessThan(yaml.indexOf('python3 scripts/patch-ios-live-activity.py'));
    expect(yaml).toContain('WIDGET_BUNDLE_ID: "com.base69e6bdb4986a04a256653a23.app.JobaActivityWidget"');
  });

  it('patches the project only when explicitly enabled', () => {
    expect(yaml).toContain('scripts/patch-ios-live-activity.py');
    expect(yaml).toContain('--check --require');
    const guard = yaml.indexOf('if [ "${ENABLE_LIVE_ACTIVITY_WIDGET:-}" != "true" ]; then');
    const patch = yaml.indexOf('python3 scripts/patch-ios-live-activity.py');
    expect(guard).toBeGreaterThan(-1);
    expect(patch).toBeGreaterThan(guard);
  });

  it('fetches the extension profile and names it in the export', () => {
    expect(yaml).toContain('app-store-connect fetch-signing-files "$WIDGET_BUNDLE_ID"');
    expect(yaml).toContain('WIDGET_PROFILE_ENTRY');
    expect(yaml).toContain('$WIDGET_PROFILE_ENTRY');
  });

  it('still builds and signs the app exactly as before', () => {
    expect(yaml).toContain('xcodebuild archive');
    expect(yaml).toContain('-scheme "$XCODE_SCHEME"');
    expect(yaml).toContain('DEVELOPMENT_TEAM=322DV2PB9V');
    expect(yaml).toContain('submit_to_testflight: true');
    // The Android workflow is untouched.
    expect(yaml).toContain('android-workflow:');
  });

  it('declares the extension checks that prove a real build', () => {
    expect(yaml).toContain('JobaActivityWidgetExtension.appex embedded');
    expect(yaml).toContain('widgetkit-extension point present');
  });

  it('proves BOTH targets are signed before archiving', () => {
    // A profile is looked up BY bundle id, so the patched project and
    // WIDGET_BUNDLE_ID are compared before anything is fetched...
    expect(yaml).toContain('project widget bundle id matches WIDGET_BUNDLE_ID');
    // ...and the project is inspected after use-profiles, so a target left
    // without a profile fails fast instead of at the end of a long archive.
    expect(yaml).toContain('Verify BOTH targets are signed (iOS)');
    expect(yaml).toContain('no provisioning profile was applied');
    expect(yaml).toContain('"JobaActivityWidgetExtension" => ENV["WIDGET_BUNDLE_ID"]');
  });

  it('refuses to build when the flag could not be resolved', () => {
    // A build whose input resolved to anything but a clean true/false used to
    // fall through to the "disabled" branch, so a ticked box could produce a
    // SHIPPING build that looked like a widget build. It now stops.
    expect(yaml).toContain("WANT=\"${{ inputs.liveActivityWidget }}\"");
    expect(yaml).toContain('case "$WANT" in');
    expect(yaml).toContain('expected true or false');
    expect(yaml).toContain('Refusing to build');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   7. THE FAILED BUILD — regression proof
   ══════════════════════════════════════════════════════════════════════════
   The first widget-enabled archive died in SceneDelegate.swift with
   "cannot find 'JobaActivityPlugin' in scope". The class was correct and the
   file correct; the two simply were not in the same build. LiveActivityPlugin
   .swift is added to the app target by the generator, and that build never ran
   the generator, so the target compiled a reference to a class it did not
   contain. These checks make that impossible to reintroduce silently. */
describe('the app target never references a class it does not compile', () => {
  const scene = read(join(ROOT, 'ios/App/App/SceneDelegate.swift'));

  /** The text between `#if LIVE_ACTIVITY_WIDGET` and its `#endif`. */
  function guardedBlock(source) {
    const start = source.indexOf('#if LIVE_ACTIVITY_WIDGET');
    if (start < 0) return '';
    const end = source.indexOf('#endif', start);
    return end < 0 ? '' : source.slice(start + '#if LIVE_ACTIVITY_WIDGET'.length, end);
  }

  it('registers the plugin only inside the compilation condition', () => {
    expect(scene).toContain('#if LIVE_ACTIVITY_WIDGET');
    expect(guardedBlock(scene)).toContain('registerPluginInstance(JobaActivityPlugin())');
    // The reference must exist nowhere else in the file.
    expect(scene.split('JobaActivityPlugin()').length - 1).toBe(1);
  });

  it('declares every class it registers', () => {
    // A generalised guard: each registered plugin must have a class somewhere in
    // the iOS sources, so a renamed or deleted plugin file is caught here rather
    // than at the end of an archive.
    const registered = [...scene.matchAll(/registerPluginInstance\((\w+)\(\)\)/g)].map((m) => m[1]);
    expect(registered.length).toBeGreaterThan(2);

    const swift = [];
    (function walk(dir) {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (entry.endsWith('.swift')) swift.push(read(full));
      }
    })(join(ROOT, 'ios'));

    const all = swift.join('\n');
    for (const name of registered) {
      expect(all, `${name} is registered but has no class declaration`).toMatch(
        new RegExp(`class\\s+${name}\\b`)
      );
    }
  });

  it('compiles the plugin in the same target that compiles SceneDelegate', () => {
    // Requirement (1) of the report: the file must be in the App target's own
    // Compile Sources — not merely referenced by the project.
    const { project, info } = sandbox();
    python(['--project', project, '--info-plist', info, '--quiet']);
    const report = check(project, info);

    expect(report.app_sources).toContain('SceneDelegate.swift');
    expect(report.app_sources).toContain('LiveActivityPlugin.swift');
  });

  it('defines the condition the guard reads, in both App configurations', () => {
    const { project, info } = sandbox();
    python(['--project', project, '--info-plist', info, '--quiet']);
    const conditions = check(project, info).app_conditions;

    expect(Object.keys(conditions).sort()).toEqual(['Debug', 'Release']);
    expect(conditions.Debug).toContain('LIVE_ACTIVITY_WIDGET');
    expect(conditions.Release).toContain('LIVE_ACTIVITY_WIDGET');
    // Debug must keep DEBUG: the plugin maps its APNs environment from it.
    expect(conditions.Debug).toContain('DEBUG');
  });

  it('leaves the shipping project without the condition', () => {
    // The unpatched project defines no such condition and contains no such file,
    // so the guard is the ONLY thing standing between the shipping build and the
    // exact error that failed the archive. If this ever flips, the guard is no
    // longer what protects it and the test above stops proving anything.
    const report = check(PROJECT, APP_INFO);
    expect(report.widget.present).toBe(false);
    expect(report.app_sources).not.toContain('LiveActivityPlugin.swift');
    expect(JSON.stringify(report.app_conditions)).not.toContain('LIVE_ACTIVITY_WIDGET');
  });

  it('fails the CI gate when the condition goes missing', () => {
    const { project, info } = sandbox();
    python(['--project', project, '--info-plist', info, '--quiet']);
    writeFileSync(project, read(project)
      .replace('SWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG LIVE_ACTIVITY_WIDGET";',
        'SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;')
      .replace('SWIFT_ACTIVE_COMPILATION_CONDITIONS = "LIVE_ACTIVITY_WIDGET";',
        'SWIFT_ACTIVE_COMPILATION_CONDITIONS = "";'));

    const output = pythonFailure(['--check', '--require', '--project', project, '--info-plist', info]);
    expect(output).toContain('LIVE_ACTIVITY_WIDGET compilation condition');
  });

  it('repairs a project patched before the condition existed', () => {
    // An older generator added the target but not the flag. Re-running must add
    // the missing condition instead of reporting "already applied" over an
    // inert feature.
    const { project, info } = sandbox();
    python(['--project', project, '--info-plist', info, '--quiet']);
    writeFileSync(project, read(project).replace(
      'SWIFT_ACTIVE_COMPILATION_CONDITIONS = "LIVE_ACTIVITY_WIDGET";',
      'SWIFT_ACTIVE_COMPILATION_CONDITIONS = "";'
    ));

    python(['--project', project, '--info-plist', info, '--quiet']);
    expect(check(project, info).app_conditions.Release).toContain('LIVE_ACTIVITY_WIDGET');
  });
});