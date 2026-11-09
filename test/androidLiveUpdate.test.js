import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildLiveUpdateData, looksLikeAndroidToken, LIVE_UPDATE_KEY } from '../base44/shared/liveActivityFcm.ts';
import { mayContactFcmFor } from '../base44/shared/liveActivityConfig.ts';

/**
 * The Android Live Update is the iOS Live Activity's twin, and these tests pin the
 * three things that make it a twin rather than a lookalike:
 *
 *   1. the SOURCE that gets injected into the generated Android project — the
 *      ordering rules, the palette, the RTL handling, the API-36 promotion path;
 *   2. the WIRING the build step produces — one FCM service (not two), the two
 *      receivers, the promoted permission, and the plugin registered in
 *      MainActivity before super.onCreate;
 *   3. the CONTRACT the server sends, byte-for-byte the payload the native side
 *      parses, and the rollout gate that decides whether anything is sent at all.
 */

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');

const PATCHER = join(ROOT, 'scripts/patch-android-live-update.py');
const MAINACTIVITY = join(ROOT, 'scripts/patch-android-mainactivity.py');
const SOURCE_DIR = join(ROOT, 'android-config/live-update/src');

const PACKAGE = 'com.example.joba24.app';
const CLIP_SERVICE = 'io.capawesome.capacitorjs.plugins.firebase.messaging.MessagingService';

const read = (path) => readFileSync(path, 'utf8');
const source = (name) => read(join(SOURCE_DIR, name));

/**
 * The web module itself is not importable here: it is built on the Capacitor
 * bridge and the app's SDK client, both of which expect a window. Its method list
 * is therefore read out of the source — which is the fact being checked anyway
 * (that the JS side and the Java side name the same methods).
 */
const ANDROID_MODULE = read(join(ROOT, 'src/lib/androidLiveUpdate.js'));
const LIVE_UPDATE_METHODS = [...ANDROID_MODULE
  .match(/LIVE_UPDATE_METHODS = \[([\s\S]*?)\]/)[1]
  .matchAll(/'([^']+)'/g)].map((match) => match[1]);

const JAVA_FILES = [
  'JobaLiveUpdatePayload.java',
  'JobaLiveUpdateStore.java',
  'JobaLiveUpdateNotifier.java',
  'JobaLiveUpdateEngine.java',
  'JobaLiveUpdateMessagingService.java',
  'JobaLiveUpdateActionReceiver.java',
  'JobaLiveUpdateOpenReceiver.java',
  'JobaLiveUpdatePlugin.java',
];

/* ── a minimal Capacitor project, as `npx cap add android` leaves it ─────── */
const MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="${PACKAGE}">
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <application
        android:allowBackup="true"
        android:label="Joba24">
        <activity
            android:name="${PACKAGE}.MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <intent-filter>
                <action android:name="FCM_PLUGIN_ACTIVITY" />
                <category android:name="android.intent.category.DEFAULT" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`;

const MAIN_ACTIVITY = `package ${PACKAGE};

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {}
`;

/* The Gradle file a Capacitor 6+ / AGP 8 project generates: the identifier
   lives here, as `namespace` plus `defaultConfig.applicationId`, and the
   manifest has no package attribute of its own. */
const BUILD_GRADLE = `apply plugin: 'com.android.application'

android {
    namespace "${PACKAGE}"
    compileSdk rootProject.ext.compileSdkVersion

    defaultConfig {
        applicationId "${PACKAGE}"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0"
    }
}

dependencies {
    implementation project(':capacitor-android')
}
`;

/* The version the patcher falls back to when the plugin is not installed in the
   project it is patching (which is the case for every temp project here). It is
   the messaging plugin's own default, so no version is ever invented. */
const FIREBASE_MESSAGING = 'com.google.firebase:firebase-messaging';
const FIREBASE_MESSAGING_FALLBACK = '25.0.1';

function project({ manifestPackage = true, gradle = BUILD_GRADLE, manifest: custom = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'joba-android-live-'));
  const main = join(root, 'android/app/src/main');
  const javaDir = join(main, 'java', ...PACKAGE.split('.'));
  mkdirSync(javaDir, { recursive: true });
  const manifest = custom ?? (manifestPackage ? MANIFEST : MANIFEST.replace(` package="${PACKAGE}"`, ''));
  writeFileSync(join(main, 'AndroidManifest.xml'), manifest);
  writeFileSync(join(javaDir, 'MainActivity.java'), MAIN_ACTIVITY);
  if (gradle) writeFileSync(join(root, 'android/app/build.gradle'), gradle);
  return {
    root,
    javaDir,
    manifest: join(main, 'AndroidManifest.xml'),
    mainActivity: join(javaDir, 'MainActivity.java'),
    gradle: join(root, 'android/app/build.gradle'),
  };
}

function run(script, args) {
  const result = spawnSync('python3', [script, ...args], { cwd: ROOT, encoding: 'utf8' });
  return { code: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

/* ══════════════════════════════════════════════════════════════════════════
   1. THE INJECTED SOURCE
   ══════════════════════════════════════════════════════════════════════════ */
describe('Android Live Update — the native card', () => {
  it('ships every class the wiring references', () => {
    for (const name of JAVA_FILES) {
      expect(existsSync(join(SOURCE_DIR, name)), `${name} is missing`).toBe(true);
    }
  });

  it('draws the iOS palette, unchanged', () => {
    const notifier = source('JobaLiveUpdateNotifier.java');
    // Copied from JobaPalette in JobaActivityWidgetBundle.swift. A drift here is
    // the one parity bug a user would notice immediately: two brands, one app.
    expect(notifier).toContain('0xFF1A6FD4'); // brand blue
    expect(notifier).toContain('0xFF059669'); // success green
    expect(notifier).toContain('0xFF0D1E40'); // text-1
    expect(notifier).toContain('0xFF4B6083'); // text-2
    expect(notifier).toContain('0xFFE4EAF5'); // border
    expect(notifier).toContain('setColor(colorFor(payload))');
  });

  it('keeps the card ongoing, silent and updated in place', () => {
    const notifier = source('JobaLiveUpdateNotifier.java');
    expect(notifier).toContain('setOngoing(true)');
    // One alert on the first post, silence afterwards — a Live Activity does not
    // buzz on every revision, and neither may this.
    expect(notifier).toContain('setOnlyAlertOnce(true)');
    expect(notifier).toContain('setSilent(true)');
    // Replace, never stack: one notification identity per (task, role).
    expect(notifier).toContain('manager.notify(TAG, notificationId(key), notification)');
    // ── AND IT MAY ONLY EVER CANCEL ITS OWN CARD ──────────────────────────────
    // `NotificationManager.cancelAll()` would take every Joba24 notification with
    // it — the app's existing pushes included — as soon as one task ended. The
    // card is addressed by (tag, id) and nothing else, so there is no bulk cancel
    // in this file at all.
    expect(notifier).not.toContain('cancelAll()');
    expect(notifier).toContain('manager.cancel(TAG, notificationId(key))');
  });

  it('stays silent without calling setSilent on a framework builder', () => {
    // `setSilent(boolean)` exists ONLY on NotificationCompat's builder. The
    // promoted path builds on the FRAMEWORK builder (it has to: the promoted
    // style and its extras are framework types), so that call did not compile —
    // "cannot find symbol" at :app:compileReleaseJavaWithJavac.
    const notifier = source('JobaLiveUpdateNotifier.java');
    const promoted = notifier.slice(
      notifier.indexOf('private static Notification buildPromoted('),
      notifier.indexOf('private static Notification buildOngoing('),
    );
    expect(promoted).not.toContain('.setSilent(');
    // …and it is still silent: the two calls androidx's setSilent performs.
    expect(promoted).toContain('.setSound(null)');
    expect(promoted).toContain('.setVibrate(null)');
    expect(promoted).toContain('.setOnlyAlertOnce(true)');

    // The compat path has the method, and keeps using it.
    const ongoing = notifier.slice(notifier.indexOf('private static Notification buildOngoing('));
    expect(ongoing).toContain('NotificationCompat.Builder');
    expect(ongoing).toContain('.setSilent(true)');
  });

  it('uses nothing above the project\'s minSdk on the card\'s own path', () => {
    // minSdk is 24 and the generated project enables no core-library desugaring,
    // so `String.join` (API 26) throws NoSuchMethodError on Android 7.x — on the
    // exact path that posts a card, where it looks like "Live Updates never
    // appear". The sources build their strings with a StringBuilder instead.
    for (const name of JAVA_FILES) {
      expect(source(name), `${name} must not use String.join`).not.toContain('String.join(');
    }
    expect(source('JobaLiveUpdatePayload.java')).toContain('public static String join(String delimiter, List<String> values)');
  });

  it('marks Hebrew text right-to-left', () => {
    const payload = source('JobaLiveUpdatePayload.java');
    expect(payload).toContain('"\\u200F"');
    expect(payload).toContain('public static String rtl(String value)');
    const notifier = source('JobaLiveUpdateNotifier.java');
    expect(notifier).toContain('JobaLiveUpdatePayload.rtl(payload.subtitle)');
    expect(notifier).toContain('JobaLiveUpdatePayload.rtl(payload.actionLabel)');
  });

  it('reaches the Android 16 Live Update without binding the build to SDK 36', () => {
    const notifier = source('JobaLiveUpdateNotifier.java');
    // Promotion is requested through the platform's own extra, and the style is
    // created reflectively so the injected file compiles on any compileSdk.
    expect(notifier).toContain('android.requestPromotedOngoing');
    expect(notifier).toContain('Class.forName("android.app.Notification$ProgressStyle")');
    expect(notifier).toContain('"setShortCriticalText"');
    // …and the fallback is a real path, not a crash: below 36 the compat builder
    // draws the same card with a progress bar.
    expect(notifier).toContain('new NotificationCompat.Builder(context, CHANNEL_ID)');
    expect(notifier).toContain('Build.VERSION.SDK_INT >= 36');
  });

  it('applies the same ordering rules as the iOS snapshot contract', () => {
    const store = source('JobaLiveUpdateStore.java');
    // shouldApplySnapshot, ported: newer revision wins, equal revision falls back
    // to updatedAt, an equal pair is a no-op.
    expect(store).toContain('if (payload.revision != previous) return payload.revision > previous;');
    expect(store).toContain('if (nextUpdated != previousUpdated) return nextUpdated > previousUpdated;');
    // …and the terminal rule: nothing at or below an ended revision reopens a card.
    expect(store).toContain('if (ended >= payload.revision) return false;');
    expect(store).toContain('public void markEnded(String key, long revision)');
  });

  it('renders the same single action the Lock Screen offers', () => {
    const payload = source('JobaLiveUpdatePayload.java');
    expect(payload).toContain('JSONObject action = body.optJSONObject("action")');
    expect(payload).toContain('public boolean hasAction()');
    const receiver = source('JobaLiveUpdateActionReceiver.java');
    // The exact body the iOS App Intent posts.
    expect(receiver).toContain('body.put("token", token)');
    expect(receiver).toContain('body.put("action_id", actionId)');
    expect(receiver).toContain('body.put("expected_step"');
    expect(receiver).toContain('body.put("task_id", taskId)');
    expect(receiver).toContain('body.put("role"');
    // The per-card capability is preferred; the install-scoped one is the
    // fallback for a card that was drawn while the app was closed.
    expect(receiver).toContain('if (store.canAct(key))');
    expect(receiver).toContain('else if (store.canActAsInstall())');
    // With neither, the tap opens the task instead of posting a dead token.
    expect(receiver).toContain('openTask(appContext, taskId);');
  });

  it('handles a killed app: a data message is drawn natively', () => {
    const service = source('JobaLiveUpdateMessagingService.java');
    expect(service).toContain('extends MessagingService');
    expect(service).toContain('data.get(JobaLiveUpdatePayload.DATA_KEY)');
    expect(service).toContain('JobaLiveUpdateEngine.apply(getApplicationContext(), payload)');
    // Everything that is NOT a Live Update keeps the app's existing push path.
    expect(service).toContain('super.onMessageReceived(remoteMessage)');
  });

  it('corrects the card from the server\'s answer, as the App Intent does', () => {
    const receiver = source('JobaLiveUpdateActionReceiver.java');
    // iOS writes the response's own snapshot into the card; Android must too.
    expect(receiver).toContain('applyOutcome(context, response, taskId, role)');
    expect(receiver).toContain('body.optBoolean("terminal", false)');
    expect(receiver).toContain('JobaLiveUpdateEngine.cancel(context, taskId, role)');
    expect(receiver).toContain('JSONObject snapshot = body.optJSONObject("snapshot")');
    // …through the ONE engine, so a stale answer can never move the card back.
    expect(receiver).toContain('JobaLiveUpdateEngine.apply(context, payload)');
    // ── AND IT IS NOT ONLY FOR SUCCESS ───────────────────────────────────────
    // A refused tap (409 not_eligible / action_mismatch) changes no Task, so no
    // entity event follows and no push would ever correct the card. Without this
    // the button stayed on screen offering an action that could never work.
    expect(receiver).toContain('if (status < 500)');
    expect(receiver).not.toContain('The server has already moved the task');
  });

  it('acts on a card that was created while the app was closed', () => {
    // Android has no Push-to-Start gate: any dispatch can create the card, so no
    // session existed to mint its per-card capability. The install-scoped one
    // (the same capability iOS uses for a Push-to-Start card) is the fallback.
    const store = source('JobaLiveUpdateStore.java');
    expect(store).toContain('public void putInstallAuth(');
    expect(store).toContain('public boolean canActAsInstall()');
    const plugin = source('JobaLiveUpdatePlugin.java');
    expect(plugin).toContain('public void setInstallAuth(PluginCall call)');
    expect(LIVE_UPDATE_METHODS).toContain('setInstallAuth');
    expect(ANDROID_MODULE).toContain("scope: 'user'");
    expect(ANDROID_MODULE).toContain('export async function ensureInstallActionCapability');
    // Minted where iOS already mints its own, so one effect prepares both.
    const realTask = read(join(ROOT, 'src/components/RealTaskActivityBridge.jsx'));
    expect(realTask).toContain('ensureInstallActionCapability()');
  });

  it('files a device report under the platform that made it', () => {
    const fn = read(join(ROOT, 'base44/functions/liveActivityRealTask/entry.ts'));
    expect(fn).not.toContain("platform: 'ios',");
    expect(fn).toContain("body?.platform === 'android' ? 'android' : 'ios'");
    const realTask = read(join(ROOT, 'src/components/RealTaskActivityBridge.jsx'));
    expect(realTask).toContain('platform: liveUpdatePlatform()');
  });

  it('exposes exactly the plugin methods the web layer calls', () => {
    const plugin = source('JobaLiveUpdatePlugin.java');
    const declared = [...plugin.matchAll(/@PluginMethod\s+public void (\w+)/g)].map((m) => m[1]).sort();
    expect(declared).toEqual([...LIVE_UPDATE_METHODS].sort());
    expect(plugin).toContain('@CapacitorPlugin(name = "JobaLiveUpdate")');
    // A tap that resumes the app is announced, not polled forever.
    expect(plugin).toContain('notifyListeners("openTask"');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. THE WIRING THE BUILD STEP PRODUCES
   ══════════════════════════════════════════════════════════════════════════ */
describe('Android Live Update — build wiring', () => {
  it('installs the sources, the drawable and one FCM service', () => {
    const p = project();
    const patched = run(PATCHER, ['--root', p.root]);
    expect(patched.code, patched.stderr).toBe(0);

    for (const name of JAVA_FILES) {
      const file = join(p.javaDir, name);
      expect(existsSync(file), `${name} was not installed`).toBe(true);
      const body = read(file);
      expect(body).toContain(`package ${PACKAGE};`);
      expect(body).not.toContain('__PKG__');
    }
    expect(existsSync(join(p.root, 'android/app/src/main/res/drawable/ic_joba_live.xml'))).toBe(true);

    const manifest = read(p.manifest);
    // Our service owns the FCM event…
    expect(manifest).toContain(`${PACKAGE}.JobaLiveUpdateMessagingService`);
    expect(manifest).toContain('com.google.firebase.MESSAGING_EVENT');
    // …and the plugin's declaration is removed, so exactly one service claims it.
    expect(manifest).toContain(CLIP_SERVICE);
    expect(manifest).toContain('tools:node="remove"');
    expect(manifest).toContain('xmlns:tools="http://schemas.android.com/tools"');
    // Exactly ONE declaration of the filter, so FCM has a single destination.
    expect([...manifest.matchAll(/<action android:name="com\.google\.firebase\.MESSAGING_EVENT"/g)]).toHaveLength(1);

    expect(manifest).toContain(`${PACKAGE}.JobaLiveUpdateActionReceiver`);
    expect(manifest).toContain(`${PACKAGE}.JobaLiveUpdateOpenReceiver`);
    expect(manifest).toContain('POST_PROMOTED_NOTIFICATIONS');
    expect(manifest).toContain('android:exported="false"');
  });

  it('is idempotent, registers the plugin, and fails --check when it is missing', () => {
    const p = project();
    expect(run(PATCHER, ['--root', p.root]).code).toBe(0);
    const once = read(p.manifest);
    expect(run(PATCHER, ['--root', p.root]).code).toBe(0);
    expect(read(p.manifest)).toBe(once);

    const activity = read(p.mainActivity);
    expect(activity).toContain('registerPlugin(JobaLiveUpdatePlugin.class);');
    // Capacitor consumes the registration in onCreate, so it must be BEFORE it.
    expect(activity.indexOf('registerPlugin(JobaLiveUpdatePlugin.class);'))
      .toBeLessThan(activity.indexOf('super.onCreate('));
    expect(run(PATCHER, ['--root', p.root, '--check']).code).toBe(0);

    // A registration that went missing is a FAILURE, not a warning: without it the
    // web layer's calls reach no native plugin and the card silently never appears.
    writeFileSync(p.mainActivity, MAIN_ACTIVITY);
    expect(run(PATCHER, ['--root', p.root, '--check']).code).not.toBe(0);
  });

  it('fails loudly where there is no Android project yet', () => {
    const empty = mkdtempSync(join(tmpdir(), 'joba-android-empty-'));
    const result = run(PATCHER, ['--root', empty]);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain('npx cap add android');
  });

  /* ── REGRESSION: THE SHAPE THAT FAILED THE FIRST REAL ANDROID BUILD ──────
     Step 9 died with "AndroidManifest.xml declares no package attribute" on a
     perfectly standard project. Since AGP 8 the identifier is not in the
     manifest at all — it is `namespace` + `defaultConfig.applicationId` in
     app/build.gradle — so the patcher has to read Gradle, not the manifest. */
  it('resolves the app id from Gradle when the manifest has no package attribute', () => {
    const p = project({ manifestPackage: false });
    expect(read(p.manifest)).not.toContain('package=');

    const patched = run(PATCHER, ['--root', p.root]);
    expect(patched.code, patched.stderr).toBe(0);
    expect(patched.stdout).toContain(PACKAGE);

    // The sources land in the namespace's package folder, fully substituted.
    for (const name of JAVA_FILES) {
      const body = read(join(p.javaDir, name));
      expect(body, `${name} is not in the app package`).toContain(`package ${PACKAGE};`);
      expect(body).not.toContain('__PKG__');
    }

    const manifest = read(p.manifest);
    expect(manifest).toContain(`${PACKAGE}.JobaLiveUpdateMessagingService`);
    expect(manifest).toContain(`${PACKAGE}.JobaLiveUpdateActionReceiver`);
    expect(manifest).toContain(`${PACKAGE}.JobaLiveUpdateOpenReceiver`);
    // The identifier is READ from Gradle, never written back into the manifest.
    expect(manifest).not.toContain('package="');
    expect(read(p.mainActivity)).toContain('registerPlugin(JobaLiveUpdatePlugin.class);');

    expect(run(PATCHER, ['--root', p.root, '--check']).code, 'check after patch').toBe(0);

    // …and a second run is still a no-op.
    const once = read(p.manifest);
    expect(run(PATCHER, ['--root', p.root]).code).toBe(0);
    expect(read(p.manifest)).toBe(once);
  });

  it('reads applicationId when no namespace is declared', () => {
    const p = project({
      manifestPackage: false,
      gradle: `android {\n    defaultConfig {\n        applicationId "${PACKAGE}"\n    }\n}\n\ndependencies {\n}\n`,
    });
    const patched = run(PATCHER, ['--root', p.root]);
    expect(patched.code, patched.stderr).toBe(0);
    expect(read(join(p.javaDir, 'JobaLiveUpdatePlugin.java'))).toContain(`package ${PACKAGE};`);
  });

  it('fails with a clear message when nothing declares the package', () => {
    const p = project({ manifestPackage: false, gradle: null });
    const result = run(PATCHER, ['--root', p.root]);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("cannot resolve the app's package");
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   3. THE CONTRACT THE SERVER SENDS
   ══════════════════════════════════════════════════════════════════════════ */
describe('Android Live Update — payload contract', () => {
  const snapshot = {
    id: 'task_1',
    role: 'worker',
    phase: 'on_the_way',
    title: 'אתה בדרך למשימה',
    subtitle: 'לחץ/י "הגעתי" כשתגיע',
    revision: 4,
    updatedAt: '2026-11-09T12:00:00.000Z',
    deepLink: 'https://joba24.com/?open_task=task_1',
  };

  it('carries the snapshot itself, not a summary of it', () => {
    const data = buildLiveUpdateData({ snapshot, event: 'update' });
    expect(data[LIVE_UPDATE_KEY]).toBe('1');
    expect(data.joba_event).toBe('update');
    expect(data.joba_revision).toBe('4');
    expect(data.joba_task_id).toBe('task_1');
    expect(data.joba_role).toBe('worker');
    // Every field the card draws comes from the SAME object iOS decodes.
    expect(JSON.parse(data.joba_snapshot)).toEqual(snapshot);
  });

  it('is data-only, so the device draws the card itself', () => {
    const data = buildLiveUpdateData({ snapshot, event: 'update' });
    // A `notification` block would make the FCM SDK draw a plain notification
    // that can be neither ongoing nor promoted. The message must carry data only.
    expect(Object.keys(data)).not.toContain('notification');
    for (const value of Object.values(data)) expect(typeof value).toBe('string');
  });

  it('marks an end as an end, never as an update', () => {
    expect(buildLiveUpdateData({ snapshot, event: 'end' }).joba_event).toBe('end');
    expect(buildLiveUpdateData({ snapshot, event: undefined }).joba_event).toBe('update');
  });

  it('addresses device tokens only — a web subscription is not a device', () => {
    expect(looksLikeAndroidToken('eXaMpLeT0kenValueThatIsLongEnoughToBeReal1234567890')).toBe(true);
    expect(looksLikeAndroidToken('https://fcm.googleapis.com/fcm/send/abc:def')).toBe(false);
    expect(looksLikeAndroidToken('short')).toBe(false);
    expect(looksLikeAndroidToken('')).toBe(false);
  });

  it('is armed by its own switch, and only for allowlisted users', () => {
    const off = { android_delivery: false, enabled: true, dry_run: false };
    expect(mayContactFcmFor(off, 'user_1')).toBe(false);

    const testUser = { android_delivery: true, enabled: false, dry_run: true, test_user_ids: ['user_1'] };
    expect(mayContactFcmFor(testUser, 'user_1')).toBe(true);
    // The allowlist never widens: somebody else still needs the global locks open.
    expect(mayContactFcmFor(testUser, 'user_2')).toBe(false);

    const global = { android_delivery: true, enabled: true, dry_run: false };
    expect(mayContactFcmFor(global, 'user_2')).toBe(true);
    expect(mayContactFcmFor({ ...global, dry_run: true }, 'user_2')).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4. ONE BRIDGE, NO iOS REGRESSION
   ══════════════════════════════════════════════════════════════════════════ */
describe('Android Live Update — the shared bridge', () => {
  it('drives both platforms through the neutral module', () => {
    const bridge = read(join(ROOT, 'src/components/RealTaskActivityBridge.jsx'));
    expect(bridge).toContain("from '@/lib/liveUpdateNative'");
    expect(bridge).toContain('isLiveUpdateNative()');
    expect(bridge).not.toContain('isLiveActivityNative()');
    // The iOS-only extras are still imported from their own module and untouched.
    expect(bridge).toContain('syncPushToStartToken');
    expect(bridge).toContain('attachActivityTokenListener');
  });

  it('keeps the iOS surface exactly as it was', () => {
    const ios = read(join(ROOT, 'src/lib/liveActivityNative.js'));
    expect(ios).toContain("export const LIVE_ACTIVITY_PLUGIN = 'JobaActivity'");
    expect(ios).toContain('export async function startTaskActivity');
    expect(ios).toContain('export async function updateTaskActivity');
    expect(ios).toContain('export async function endTaskActivity');
    // The action endpoint is defined ONCE and shared with Android, so the two
    // platforms can never post a card's tap to two different origins.
    expect(ios).toContain("export { actionEndpoint } from '@/lib/activityActionEndpoint';");
    const endpoint = read(join(ROOT, 'src/lib/activityActionEndpoint.js'));
    expect(endpoint).toContain('export function actionEndpoint()');
    expect(read(join(ROOT, 'src/lib/androidLiveUpdate.js')))
      .toContain("from '@/lib/activityActionEndpoint'");
  });

  it('delivers the same revision to Android inside the existing dispatch', () => {
    const send = read(join(ROOT, 'base44/shared/liveActivitySend.ts'));
    expect(send).toContain("from './liveActivityFcm.ts'");
    expect(send).toContain('mayContactFcmFor(config, recipientId)');
    expect(send).toContain('sendLiveUpdateToAndroid({');
    // The revision is only committed when SOMETHING was delivered, both carriers
    // counted — so a dry run or a failure still releases the claim.
    expect(send).toMatch(/const sent = results\.filter\(\(r\) => r\.result\.ok && !r\.result\.dryRun\)\.length\s*\n\s*\+ androidResults\.filter/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   5. THE REAL CAPACITOR MANIFEST — THE SHAPE THAT FAILED THE AAB BUILD
   ──────────────────────────────────────────────────────────────────────────
   Step 25 ("Build signed AAB") refused to link the release with:
       Unexpected <service> inside <manifest><application><activity>
       Unexpected <receiver> inside <manifest><application><activity>   (x2)

   The patcher had anchored on the string "FCM_PLUGIN_ACTIVITY" and inserted
   after the nearest </intent-filter> — but that filter lives INSIDE <activity>,
   so the block landed in the activity. These tests use the manifest Capacitor
   actually generates (nested activity with several filters and a meta-data, a
   file provider, <queries> after </application>, no package attribute) and
   assert the placement rule itself, not the patcher's opinion of it.
   ══════════════════════════════════════════════════════════════════════════ */

const BLOCK_BEGIN = '<!-- >>> joba24-live-update (generated - do not edit by hand) -->';
const BLOCK_END = '<!-- <<< joba24-live-update -->';

const CAPACITOR_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name="${PACKAGE}.MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <intent-filter>
                <action android:name="FCM_PLUGIN_ACTIVITY" />
                <category android:name="android.intent.category.DEFAULT" />
            </intent-filter>

            <meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/file_paths" />

        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>

    </application>

    <queries>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="https" />
        </intent>
    </queries>

</manifest>
`;

/** Every <service>/<receiver> that sits anywhere INSIDE an <activity>. Must be []. */
const componentsInsideActivities = (manifest) => [...manifest.matchAll(/<activity\b[\s\S]*?<\/activity>/g)]
  .flatMap((block) => [...block[0].matchAll(/<(service|receiver)\b/g)].map((m) => m[1]));

/** The text between <application …> and </application> — where our block belongs. */
const applicationInner = (manifest) => {
  const open = manifest.indexOf('<application');
  const close = manifest.lastIndexOf('</application>');
  return manifest.slice(open, close);
};

describe('Android Live Update — real Capacitor manifest', () => {
  it('keeps the service and both receivers as direct children of <application>', () => {
    const p = project({ manifestPackage: false, manifest: CAPACITOR_MANIFEST });
    const patched = run(PATCHER, ['--root', p.root]);
    expect(patched.code, patched.stderr).toBe(0);

    const manifest = read(p.manifest);

    // THE release failure, asserted at its source.
    expect(componentsInsideActivities(manifest)).toEqual([]);

    // …and the components really are inside <application>, not beside it.
    const inner = applicationInner(manifest);
    expect(inner.match(/<service\b/g)).toHaveLength(2); // ours + the removal marker
    expect(inner.match(/<receiver\b/g)).toHaveLength(2);

    // The block sits after the activity closed and before the application does.
    const blockAt = manifest.indexOf(BLOCK_BEGIN);
    expect(blockAt).toBeGreaterThan(manifest.lastIndexOf('</activity>'));
    expect(blockAt).toBeLessThan(manifest.lastIndexOf('</application>'));
    expect(manifest).toContain(BLOCK_END);
  });

  it('preserves MainActivity, the Firebase filter and every unrelated entry', () => {
    const p = project({ manifestPackage: false, manifest: CAPACITOR_MANIFEST });
    expect(run(PATCHER, ['--root', p.root]).code).toBe(0);
    const manifest = read(p.manifest);

    // The activity is untouched: same name, same attributes, same two filters,
    // same meta-data, still a direct child of <application>.
    expect(manifest).toContain(`android:name="${PACKAGE}.MainActivity"`);
    expect(manifest).toContain('android:launchMode="singleTask"');
    expect(manifest).toMatch(/<activity\b[\s\S]*android.intent.category.LAUNCHER[\s\S]*<\/activity>/);
    expect(manifest).toMatch(/<activity\b[\s\S]*FCM_PLUGIN_ACTIVITY[\s\S]*<\/activity>/);
    expect(manifest).toMatch(/<activity\b[\s\S]*android.support.FILE_PROVIDER_PATHS[\s\S]*<\/activity>/);
    expect(manifest).toContain('androidx.core.content.FileProvider');
    expect(manifest).toContain('${applicationId}.fileprovider');
    expect(manifest).toContain('<queries>');
    expect(manifest).toContain('android.intent.action.VIEW');

    // Exactly one FCM event filter claims delivery.
    expect([...manifest.matchAll(/<action android:name="com\.google\.firebase\.MESSAGING_EVENT"/g)]).toHaveLength(1);
    // The permission belongs to <manifest>, never inside <application>.
    expect(applicationInner(manifest)).not.toContain('POST_PROMOTED_NOTIFICATIONS');
    expect(manifest).toContain('android.permission.POST_PROMOTED_NOTIFICATIONS');
  });

  it('is idempotent — repeated runs never duplicate a component', () => {
    const p = project({ manifestPackage: false, manifest: CAPACITOR_MANIFEST });
    expect(run(PATCHER, ['--root', p.root]).code).toBe(0);
    const once = read(p.manifest);

    expect(run(PATCHER, ['--root', p.root]).code).toBe(0);
    const twice = read(p.manifest);
    expect(twice).toBe(once);

    expect([...twice.matchAll(/POST_PROMOTED_NOTIFICATIONS/g)]).toHaveLength(1);
    expect([...twice.matchAll(new RegExp(`${PACKAGE}\\.JobaLiveUpdateMessagingService`, 'g'))]).toHaveLength(1);
    expect([...twice.matchAll(new RegExp(`${PACKAGE}\\.JobaLiveUpdateActionReceiver`, 'g'))]).toHaveLength(1);
    expect([...twice.matchAll(new RegExp(`${PACKAGE}\\.JobaLiveUpdateOpenReceiver`, 'g'))]).toHaveLength(1);

    expect(run(PATCHER, ['--root', p.root, '--check']).code).toBe(0);
  });

  it('refuses a manifest whose components sit inside <activity> — and repairs it', () => {
    const p = project({ manifestPackage: false, manifest: CAPACITOR_MANIFEST });
    // Install the sources first, so --check fails on PLACEMENT, not on missing files.
    expect(run(PATCHER, ['--root', p.root]).code).toBe(0);

    // The exact shape the old patcher produced: the block written after the FCM
    // intent-filter, which is still inside the activity element.
    const stray = `<service android:name="${PACKAGE}.JobaLiveUpdateMessagingService" android:exported="false">`
      + '<intent-filter><action android:name="com.google.firebase.MESSAGING_EVENT" /></intent-filter></service>';
    const broken = CAPACITOR_MANIFEST.replace(
      '            <meta-data android:name="android.support.FILE_PROVIDER_PATHS"',
      `            ${BLOCK_BEGIN}\n            ${stray}\n            ${BLOCK_END}\n\n`
        + '            <meta-data android:name="android.support.FILE_PROVIDER_PATHS"',
    );
    writeFileSync(p.manifest, broken);

    const checked = run(PATCHER, ['--root', p.root, '--check']);
    expect(checked.code).not.toBe(0);
    expect(checked.stderr).toContain('inside <activity>');

    // Patching it re-places the block instead of keeping the nested copy.
    expect(run(PATCHER, ['--root', p.root]).code).toBe(0);
    const repaired = read(p.manifest);
    expect(componentsInsideActivities(repaired)).toEqual([]);
    expect([...repaired.matchAll(/<service\b/g)]).toHaveLength(2);
    expect(run(PATCHER, ['--root', p.root, '--check']).code).toBe(0);
  });

  it('fails loudly on a manifest that is not well-formed XML', () => {
    const p = project({ manifestPackage: false, manifest: CAPACITOR_MANIFEST.replace('</application>', '') });
    const result = run(PATCHER, ['--root', p.root]);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain('not well-formed');
  });

  it('reports a clean structure in its JSON report', () => {
    const p = project({ manifestPackage: false, manifest: CAPACITOR_MANIFEST });
    const result = run(PATCHER, ['--root', p.root, '--json']);
    expect(result.code, result.stderr).toBe(0);

    const report = JSON.parse(result.stdout);
    expect(report.structure).toEqual([]);
    expect(report.checks.components_direct_children).toBe(true);
    expect(report.checks.structure_valid).toBe(true);
    expect(report.checks.receivers).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   6. THE COMPILE-TIME DEPENDENCY
   ──────────────────────────────────────────────────────────────────────────
   The service extends the messaging plugin's own service, and that plugin
   declares firebase-messaging as `implementation` — which does NOT put it on the
   app module's compile classpath. The plugin compiled; the app did not, at
   :app:compileReleaseJavaWithJavac:

       package com.google.firebase.messaging does not exist
       cannot find symbol: class FirebaseMessagingService
       cannot find symbol: class RemoteMessage
       cannot find symbol: getApplicationContext()   (a cascade of the above:
                                                      an unresolvable superclass
                                                      hides Service's own methods)

   These tests pin the two facts that fix it: the dependency is declared on the
   app module, and it is declared at the version the plugin itself resolves, so
   the resolved graph is unchanged.
   ══════════════════════════════════════════════════════════════════════════ */
describe('Android Live Update — compile-time dependency', () => {
  it('declares firebase-messaging in the app module, inside dependencies', () => {
    const p = project();
    expect(run(PATCHER, ['--root', p.root]).code).toBe(0);

    const gradle = read(p.gradle);
    expect(gradle).toContain(`implementation "${FIREBASE_MESSAGING}:${FIREBASE_MESSAGING_FALLBACK}"`);
    expect([...gradle.matchAll(new RegExp(FIREBASE_MESSAGING, 'g'))]).toHaveLength(1);

    // Inside the module's own dependencies block — a dependency anywhere else in
    // the file is ignored by Gradle and fails the same way.
    const block = gradle.slice(gradle.indexOf('dependencies {'), gradle.lastIndexOf('}'));
    expect(block).toContain(FIREBASE_MESSAGING);
  });

  it('uses the version the installed messaging plugin resolves', () => {
    // The version is READ, never hard-coded, so an npm update of the plugin cannot
    // leave this pinned behind it.
    const p = project();
    const pluginDir = join(p.root, 'node_modules/@capacitor-firebase/messaging/android');
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, 'build.gradle'),
      "ext {\n    firebaseMessagingVersion = project.hasProperty('firebaseMessagingVersion')"
        + " ? rootProject.ext.firebaseMessagingVersion : '25.9.9'\n}\n",
    );

    expect(run(PATCHER, ['--root', p.root]).code).toBe(0);
    const gradle = read(p.gradle);
    expect(gradle).toContain(`implementation "${FIREBASE_MESSAGING}:25.9.9"`);
    // The property NAME in that same line must never be mistaken for a version.
    expect(gradle).not.toContain(`${FIREBASE_MESSAGING}:firebaseMessagingVersion`);
  });

  it('is idempotent and fails --check when the dependency goes missing', () => {
    const p = project();
    expect(run(PATCHER, ['--root', p.root]).code).toBe(0);
    const once = read(p.gradle);

    expect(run(PATCHER, ['--root', p.root]).code).toBe(0);
    expect(read(p.gradle)).toBe(once);
    expect(run(PATCHER, ['--root', p.root, '--check']).code).toBe(0);

    writeFileSync(
      p.gradle,
      once.replace(`    implementation "${FIREBASE_MESSAGING}:${FIREBASE_MESSAGING_FALLBACK}"\n`, ''),
    );
    const result = run(PATCHER, ['--root', p.root, '--check']);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain('does not compile the Live Update');
  });

  it('refuses a Gradle file with no dependencies block', () => {
    const p = project({ gradle: `android {\n    namespace "${PACKAGE}"\n}\n` });
    const result = run(PATCHER, ['--root', p.root]);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain('declares no dependencies block');
  });

  it('reports the dependency and the version it chose', () => {
    const p = project();
    const result = run(PATCHER, ['--root', p.root, '--json']);
    expect(result.code, result.stderr).toBe(0);

    const report = JSON.parse(result.stdout);
    expect(report.firebase_messaging_version).toBe(FIREBASE_MESSAGING_FALLBACK);
    expect(report.checks.firebase_messaging).toBe(true);
  });
});