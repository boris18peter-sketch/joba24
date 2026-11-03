# Stage 3 — native iOS Live Activities

Status: **implemented and buildable, deliberately inert.**

Production delivery stays off (`LiveActivityConfig.enabled = false`,
`dry_run = true`) and no screen imports the bridge, so no device shows an activity
and no push is sent until you take the two steps in "What I need from you".

---

## 1. What exists in the repository now

| Piece | File | Role |
| --- | --- | --- |
| Activity contract | `ios/App/JobaActivityWidget/JobaTaskActivityAttributes.swift` | `ActivityAttributes` + a tolerant `ContentState`. Compiled into **both** targets. |
| Widget extension | `ios/App/JobaActivityWidget/JobaActivityWidgetBundle.swift` | Lock Screen card, Dynamic Island, step rail. Draws only what the payload says. |
| Extension manifest | `ios/App/JobaActivityWidget/Info.plist` | `com.apple.widgetkit-extension`. |
| Capacitor bridge | `ios/App/App/LiveActivityPlugin.swift` | `JobaActivity` plugin: start / update / end / list + push-token stream. Registered in `SceneDelegate.capacitorDidLoad()`. |
| Project generator | `scripts/patch-ios-live-activity.py` | Creates the second target, its configurations, the embed phase and the dependency — no Xcode needed. Idempotent, with `--check --require` for CI. |
| Web bridge | `src/lib/liveActivityNative.js` | Thin, never-throwing wrapper. **Not imported by any screen yet.** |
| Tests | `test/liveActivity/stage3.test.js` | Structural proof of all of the above. |

The committed `project.pbxproj` is **unchanged**. The generator runs inside the
build, so the shipping app target is byte-identical until the flag is set.

## 2. What I could not run here, and why

This environment is Linux: there is no `xcodebuild`, no Xcode, no macOS
toolchain. A native archive can only run on Codemagic. What was verified locally:

* the generated `project.pbxproj` **parses** (OpenStep parser written for this),
* the widget target, its two Swift sources, its Info.plist, its bundle id, its
  iOS 16.1 deployment target, the `Embed Foundation Extensions` phase and the
  app→widget dependency are all present in the parsed result,
* a second run of the generator is a no-op (byte-identical output),
* every existing target, file and build setting is untouched (diff is purely additive).

Codemagic additionally runs `ruby -e 'require "xcodeproj"'` on the patched file
before archiving, which is real Xcode-grade validation — that is the first thing
that would fail if the generator were wrong.

## 3. What I need from you (Apple Developer + Codemagic)

### 3.1 Apple Developer — one new identifier (2 minutes)

1. developer.apple.com → **Certificates, Identifiers & Profiles → Identifiers**.
2. Press **＋**, choose **App IDs → App**, Continue.
3. Description: `Joba24 Live Activity`. Bundle ID: **Explicit**, exactly
   `com.base69e6bdb4986a04a256653a23.app.JobaActivityWidget`
   (the app's id + `.JobaActivityWidget`).
4. No capabilities need to be ticked for a Live Activity widget.
5. Register.

Nothing else is needed: `NSSupportsLiveActivities` is a plist key, not an
entitlement, and Live Activities need no App Group.

> Codemagic can also create this identifier for you: the signing step runs
> `app-store-connect fetch-signing-files "$WIDGET_BUNDLE_ID" --create`. Creating it
> by hand first is simply the safer order.

### 3.2 Codemagic — nothing to add by hand any more

`WIDGET_BUNDLE_ID` (the App ID from 3.1) is already in the workflow, and the
switch is now a **build input**: `Start new build` shows a checkbox
"Include the Live Activity widget extension", default **off**. Ticked, the
first step ("Resolve build flags") sets `ENABLE_LIVE_ACTIVITY_WIDGET=true`
through `$CM_ENV` for that build only — the workflow file is never edited and the
production default stays off. `BUNDLE_ID` and the `ios_signing` group are
untouched.

> The signing step fetches a second provisioning profile for the widget and the
> export step adds it to `provisioningProfiles`. Both are skipped unless
> `ENABLE_LIVE_ACTIVITY_WIDGET=true`, so today's release path is unchanged.

### 3.3 Run the verification build

1. Codemagic → **Start new build** → branch `main`.
2. Set `ENABLE_LIVE_ACTIVITY_WIDGET=true` for that build only.
3. Expect the log to show, in order:
   * `[live-activity] project.pbxproj updated`
   * `project.pbxproj is valid` (the ruby `xcodeproj` parse)
   * `OK: Live Activity widget extension is fully wired`
   * `OK: JobaActivityWidgetExtension.appex embedded`
   * archive + export succeed
4. The build lands in TestFlight (the existing publishing step), where the widget
   can be inspected on a real device.

If any of those lines is missing, the build is configured to fail rather than ship
a half-wired app.

## 4. Activation (after approval — not done)

Two changes, both small and reversible:

1. In the task screens that already render `ActiveTaskBanner`, call
   `startTaskActivity` / `updateTaskActivity` / `endTaskActivity` with the snapshot
   the banner renders, and call `attachActivityTokenListener()` once at launch.
2. Flip `LiveActivityConfig` to `enabled = true` with `dry_run = true` to watch the
   dispatch table fill with real Apple answers before any push is delivered, then
   `dry_run = false`.

## 5. Why this cannot disturb FCM, tasks or iOS 15

* The plugin is additive: it is registered next to the existing plugins, touches
  no notification code, and reports `available:false` below iOS 16.2.
* The widget extension has its own target, its own Info.plist and no shared state
  with the app target beyond one value type.
* The app's deployment target stays 15.0 — only the widget target is 16.1.
  Xcode prints a *warning* that the extension targets a newer iOS than its host;
  that is intended (Live Activities exist from 16.1) and is not an error.
* The shipping workflow builds the widget **only** when the flag is set.

## 5b. Seeing it on a device before activation

`/live-activity-test` (admin only, linked at the bottom of the side menu as
"Live Activity test") starts a **local** activity from a fixed example snapshot.
It reads no task, writes no task and triggers no push — the device creates the
activity itself — so the Lock Screen card can be verified while production
delivery stays off. The same screen can optionally listen for the ActivityKit
push token, which exercises the existing registration function.

## 5c. The two signing gates in CI

1. Before anything is fetched, the patched project's widget bundle id is compared
   with `WIDGET_BUNDLE_ID`. A profile is looked up *by bundle id*, so a mismatch
   would otherwise surface late and vaguely.
2. After `use-profiles`, both targets are inspected: each must carry a bundle id
   matching its profile request and a `PROVISIONING_PROFILE_SPECIFIER`. A target
   left unsigned fails here instead of at the end of the archive.

## 5d. Why the app target can never fail this way again

The first widget-enabled archive died in `SceneDelegate.swift` with

```
error: cannot find 'JobaActivityPlugin' in scope
```

The class and the file were both correct. They were simply not in the same
build: `LiveActivityPlugin.swift` is added to the app target by the generator,
and that build never ran the generator, so the target compiled a registration of
a class it did not contain. Requirements 1 and 4 of that report were both true
and both irrelevant — the file existed on disk, and the extension target was
absent from the archive exactly because no patch had run.

Two changes make the two states inseparable instead of merely "supposed to match":

1. **The registration is compiled conditionally.**
   `bridge?.registerPluginInstance(JobaActivityPlugin())` sits inside
   `#if LIVE_ACTIVITY_WIDGET`. A build that does not compile the file compiles an
   empty line, so the shipping (widget-disabled) build is byte-equivalent in
   behaviour and cannot break on a class it does not have.
2. **The generator defines that condition on the app target** — `"DEBUG
   LIVE_ACTIVITY_WIDGET"` in Debug, `"LIVE_ACTIVITY_WIDGET"` in Release — in the
   same run that adds the file to the target's Compile Sources. The flag and the
   class therefore travel together: whenever the reference is compiled, the class
   is compiled too.

CI proves it before archiving. `--check --require` now fails unless (a) the app
target compiles `SceneDelegate.swift`, `LiveActivityPlugin.swift` and
`JobaTaskActivityAttributes.swift` in the same target, and (b) both app
configurations define `LIVE_ACTIVITY_WIDGET`. The build-input step also refuses
to run at all when the flag does not resolve to a clean `true`/`false`, so a
build can never quietly fall back to the shipping app while looking like a widget
build.

`test/liveActivity/stage3.test.js` mirrors all of this, including a test that
strips the condition from a patched project and asserts the gate fails.

## 6. Residual risk, stated plainly

The Swift was written and reviewed here, but this environment has no Swift
compiler, so it has **not** been compiled. The first real compile happens in
Codemagic. If anything is wrong it will fail at `Archive the app` with the exact
file and line, and the build is configured to stop rather than ship — the web
app, the shipping iOS path and Android are untouched by that failure.