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

Codemagic hands a `type: boolean` input over as **`True` / `False`** (capitalised,
Python style), while every gate in the workflow reads lowercase `true` / `false`.
That mismatch stopped the first widget-enabled build at this step. The value is
now handed to `scripts/resolve-live-activity-flag.sh`, which case-folds and trims
it, so both formats work; anything that is not a real boolean (empty, missing, an
unresolved placeholder, `maybe`, `1`) exits non-zero and writes nothing to
`$CM_ENV`, so a half-resolved flag can never arm the widget. Covered by
`test/liveActivity/buildFlag.test.js`.

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

## 5e. Why the widget build failed with `Extra data: line 44 column 1`

The step "Wire the Live Activity widget extension" ran

```sh
python3 scripts/patch-ios-live-activity.py --check --require > "$CM_BUILD_DIR/widget-check.json"
```

and the next step did `json.load(open(...))`. The generator printed the JSON
report **and** the line `OK: Live Activity widget extension is fully wired` on
stdout, so the file held a complete 43-line document followed by a sentence:

```
line 43: }
line 44: OK: Live Activity widget extension is fully wired
```

That is the whole error. The project itself was fine — the log's own
`OK: … fully wired` proves the target, its sources, the embed phase, the
dependency and the compilation condition were all present.

The contract is now split by purpose, in the generator and in
`scripts/ios-export-options.py` alike:

| stream | carries |
| --- | --- |
| stdout (`--check`, unless `--quiet`) | the JSON document and nothing else |
| `--report FILE` | the same document, written atomically, **always** (even when the check fails, even with `--quiet`) |
| stderr | every diagnostic: `OK:`, `ERROR:`, `[live-activity] …` |

CI no longer redirects anything: it passes `--report` and reads that file.

## 5f. Export options are built by a tested script

The profile → export-options step used to be a `for` loop inside `codemagic.yaml`.
It had a fault that only appears with a **second** profile on disk — i.e. exactly
when the widget is enabled:

```sh
[ -z "$PROFILE_PATH" ] && PROFILE_PATH="$CANDIDATE"   # returns 1 after the first pass
```

Under `set -e` that aborts the step, so the export would have died before
`xcodebuild` was called. It was also untestable: it needed macOS, a keychain and
real profiles, so nothing could prove which profile a bundle id would receive.

`scripts/ios-export-options.py` replaces it: the mapping is a pure function over
decoded profiles, the team id is taken from the app profile itself instead of a
hardcoded string, a widget build fails loudly when the extension's profile is
missing, and a *single* profile on disk still works exactly as before (the
widget-disabled path is byte-identical in behaviour). Covered by
`test/liveActivity/pipeline.test.js`.

## 5g. Running the preflight locally

```sh
npx vitest run test/liveActivity        # the whole pipeline preflight
```

This executes the real scripts (flag resolver, project generator, report
consumer, export-options builder) — no mocks. What it cannot do is compile Swift
or run `xcodebuild`: that needs macOS and only happens on Codemagic.

## 5h. The workflow step itself is executed by the tests

The JSON fix is only proved if the step that failed is actually run, so
`test/liveActivity/pipeline.test.js` reads the `script:` block of *Wire the Live
Activity widget extension* out of `codemagic.yaml` and executes it with
`bash` under `set -e`, in a throwaway copy of the project:

| mode | asserted |
| --- | --- |
| `ENABLE_LIVE_ACTIVITY_WIDGET=true` | patches, writes the report, the next step's `json.load` succeeds, the widget bundle id matches `WIDGET_BUNDLE_ID` |
| `ENABLE_LIVE_ACTIVITY_WIDGET=false` | prints `SKIPPED`, exits 0, **and leaves `project.pbxproj` and `Info.plist` byte-identical** |

The step's final `PlistBuddy` block is skipped in the test because
`/usr/libexec/PlistBuddy` exists only on macOS; a separate assertion fails if
that block is ever deleted from the workflow, so skipping it cannot hide a
removed check.

Local preflight result (2026-11-03): **11 test files, 272 tests, all passing**;
`npx vite build` succeeds; `codemagic.yaml` parses with a YAML parser and has no
tabs. Reproducing the original failure by hand — `--check --require > out.json`
then `json.load` — now succeeds, which it did not before the fix.

## 6. Residual risk, stated plainly

The Swift was written and reviewed here, but this environment has no Swift
compiler, so it has **not** been compiled. The first real compile happens in
Codemagic. If anything is wrong it will fail at `Archive the app` with the exact
file and line, and the build is configured to stop rather than ship — the web
app, the shipping iOS path and Android are untouched by that failure.
## 7. UX stage - End behaviour, content parity and the redesign

### 7.1 Why `end` looked like it did nothing

Three separate causes, none of them "ActivityKit ignored the call":

1. **The dismissal policy.** With a farewell state the plugin ended the activity
   with `.after(Date() + 60)`, so iOS deliberately kept the ended card on the
   Lock Screen for a full minute. It was over; it was still drawn.
2. **The plugin lied about the result.** `ended: true` was returned even when no
   activity matched (`count: 0`), so a no-op was indistinguishable from a close.
3. **The screen kept its own state.** `step` and `revision` were local React
   values that nothing reset after an end, so it went on saying
   "Step 2 of 3 - revision 9" while no activity existed.

Now: the dismissal default is **immediate** (`dismissAfter` seconds, 0 by
default); `ended` is true only when something was actually closed; `count`,
`activityIds`, `remaining` and a `reason` are reported; and the screen resets and
re-reads the native list afterwards, treating it - not its own memory - as truth.
`all: true` closes every activity on the device (the deliberate cleanup), and
`activeActivities` now reports each activity's ActivityKit `activityState`
(active / stale / ended / dismissed).

### 7.2 Content parity

The local test no longer carries hand-written Hebrew. Every snapshot it sends is
produced by the app's own presentation contract over a real `GlobalCategory` flow
and the app's translator, for both roles and every canonical stage (OPEN ->
TAKEN -> on_the_way -> arrived -> done, plus the scheduled engagement). The only
wording on the Lock Screen is therefore wording the banner already shows.

The frontend cannot import `base44/shared/`, so the contract has a documented
mirror in `src/lib/liveActivityContract.js`, and
`test/liveActivity/testScreenParity.test.js` runs both implementations over the
full stage x role matrix and fails on any difference.

### 7.3 The widget

Rebuilt around one accent (brand blue) on the system material, so light and dark
both keep contrast: icon bubble, status title, secondary line, and a three-segment
rail carrying the current step's real label plus a numeric counter. System text
styles throughout (bounded Dynamic Type), RTL set on the content, and the compact
slot shows digits only - it used to fall back to a raw English phase name.

### 7.4 Still needs a device

Start, each update, end, and a repeated Start -> Update -> End loop are all
verifiable from `/live-activity-test`. The Lock Screen and Dynamic Island layouts
need a real iPhone with the widget-enabled TestFlight build. Production dispatch
remains disabled (`enabled=false`, `dry_run=true`).

## 8. Interactive Lock Screen actions (App Intents)

Status: **implemented end to end, still inert in production** (`enabled=false`,
`dry_run=true`), and **one Apple-side step away from buildable**: the App Group
below must exist in the Developer portal before the widget-enabled build is
signed.

### 8.1 The pieces

| Piece | File | Role |
| --- | --- | --- |
| Action rule | `base44/shared/taskActivitySnapshot.ts` → `deriveActivityAction` | The ONE place that decides which action a role gets, right now. Used by the snapshot (display), the token minter (capability) and the executor (authorization). |
| Capability | `base44/shared/liveActivityActionToken.ts` | HMAC-SHA256, task + user + role bound, action allow-list, 24h hard expiry. |
| Execution rules | `base44/shared/liveActivityActionGuard.ts` | Forward-only worker transitions, ownership, terminal/duplicate handling. |
| Mint | `base44/functions/issueLiveActivityActionToken` | Called by the app while a session exists. |
| Execute | `base44/functions/liveActivityAction` | The only endpoint the intent calls. Re-derives everything from the task. |
| Completion | `base44/shared/taskCompletion.ts` | `completeTask`'s real body, now shared — the Lock Screen approval runs the same workflow, not a copy. |
| Native | `ios/App/JobaActivityWidget/JobaTaskActionIntent.swift`, `JobaActivityAuthStore.swift` | The intent and the App Group store. |
| Widget | `JobaActivityWidgetBundle.swift` → `TaskActionRow` | Renders the four frames; invents no copy. |
| Bridge | `src/lib/liveActivityNative.js` → `syncActivityAction` | Mints and hands the capability to the native side. |

### 8.2 Authentication without a session

The intent runs in the widget extension: no WebView, no bridge, no session, and
possibly with the app not running. A session token in a widget would be far too
much authority, so the app asks for a **capability** instead:

* bound to one user, one task, one role;
* carrying only the action ids that role may perform;
* expiring after 24h, never renewable from the device;
* signed with `LIVE_ACTIVITY_ACTION_SECRET` (server only).

It is stored in the App Group container — never in the content state (which is
displayed on the Lock Screen), never in a push payload, never in a URL.

**Every tap is re-authorized from the database**: the task is re-read, the
category flow re-resolved, eligibility re-derived with the same function that drew
the button, and the transition re-guarded. A token minted an hour ago cannot
approve a cancelled task or step a task twice.

### 8.3 What actually runs

* `worker_step` → exactly the banner's write (`worker_status` + its timestamp).
  Notifications come from the existing entity-triggered workflows, unchanged.
* `publisher_approve` → `completeTaskCore`, i.e. `completeTask` itself: worker
  counter, refunds, credit ledger, applicant projection, idempotency guard.
  The in-app button is untouched and calls the same shared body through the
  function.

`publisher_approve` is irreversible, so its **first tap only asks to confirm**
(the card shows the contract's own confirmation sentence) and the second submits.
A worker step is forward-only and idempotent, so it submits on one tap.

### 8.4 Feedback states

`actionState` is owned by the intent (`idle → confirm → pending → failed`) and the
card draws it: spinner while in flight, retry glyph when it did not land, and the
server's confirmed snapshot on success. No wording is written in Swift — the
label, the confirmation sentence and the resulting status all come from the
contract, so a category that renames its steps renames its button.

### 8.5 The one external step

Create the App Group **`group.com.base69e6bdb4986a04a256653a23.app`** in
developer.apple.com → Identifiers → App Groups, then enable it on BOTH App IDs
(the app and `…JobaActivityWidget`) and let the signing step re-fetch the
profiles. Until then the widget-enabled build fails at signing — the app's own
build path is unaffected (`CODE_SIGN_ENTITLEMENTS` is only set on the widget target
by the generator).

### 8.6 Residual risk

The Swift is reviewed but cannot be compiled in this environment (no Xcode, no
Swift toolchain); the first real compile is the Codemagic archive. `npx vite build`
passes, the generator was verified on a copy of the project (widget target, both
new sources, widget entitlements, idempotent second run), and `npx vitest run
test/liveActivity` is green: **13 files, 331 tests**.

## 9. Final readiness check (2026-11-04)

### 9.1 App Group — one identifier, three places, verified identical

`group.<APP_BUNDLE_ID>` — i.e. `group.` + the app's bundle id (42 characters),
declared in exactly three files and compared byte-for-byte:

| File | Role |
| --- | --- |
| `ios/App/App/App.entitlements` | the app's capability (also carries `aps-environment`, associated-domains) |
| `ios/App/JobaActivityWidget/JobaActivityWidget.entitlements` | the extension's capability |
| `ios/App/JobaActivityWidget/JobaActivityAuthStore.swift` → `appGroup` | the runtime constant both processes read |

**Apple-side:** the App Group must be created once in
developer.apple.com → Identifiers → App Groups, and enabled on **both** App IDs —
the app's, and `<APP_BUNDLE_ID>.JobaActivityWidget`. **Both provisioning profiles
must be regenerated**: an App Group is an entitlement, so a profile minted before
it existed does not carry it and signing fails.

### 9.2 Dynamic content — server-side, no iOS build needed

Every visible string is produced by `buildBackendSnapshot` from the resolved
`GlobalCategory` flow and the app's own dictionary: title, subtitle, the step
labels (`flow.steps[i].label` / `owner_label`), the progress counter, and the
action label (`flow.cta[key].label` — or `confirm_done_work` for publisher
approval). Swift contains no Hebrew and no status mapping; it draws fields.

* **A newly started activity** reads the current wording the moment it starts —
  it is computed server-side per dispatch.
* **An already-running activity** refreshes on its next dispatch: the snapshot is
  rebuilt from the live `GlobalCategory` rows, so the new wording arrives as a new
  `content_key` and is pushed. No task transition is required, because the
  wording lives in neither the task nor the app.
* **The one rule that used to block it** was in the planner: an event whose
  revision was *not strictly newer* was refused as `stale_revision`, and a wording
  edit moves no revision (revision is derived from `Task.updated_date`). It is now
  strictly-older only; an equal revision falls through to the content comparison,
  so an unchanged picture is still `duplicate`, and a re-worded one sends with the
  revision advanced server-side so iOS accepts the update.
* **Gap, stated plainly:** nothing *triggers* a refresh when a category is edited.
  The only Live Activity workflow is a **Task** entity trigger, so a wording-only
  change reaches running cards when that task is next dispatched/reconciled, or
  immediately via `liveActivityDispatch` (admin, per recipient) /
  `liveActivityReconcile`. Adding a GlobalCategory-triggered refresh job is the
  remaining piece if wording edits should propagate with no operator action.

### 9.3 Category parity

`babysitting` (root) and `plumbing` (root) both carry their own `status_flow`, and
`plumbing`'s six child services (`plumbing_leak`, `plumbing_clog`, …) inherit it
through the generic → root → service merge. Verified different on all three steps
and all three CTAs, e.g. worker `done` = "סיימתי את השפירה" vs "סיימתי את התיקון",
publisher `arrived` = "השמירה החלה" vs "האינסטלטור הגיע". 26 of 60 categories
define a flow; the rest use the generic one, in the app and on the Lock Screen
alike. The action each role gets is derived by `deriveActivityAction` from that
same flow, so the difference is preserved end to end.

### 9.4 Token life — renewed by sizing, not by a second credential

A capability is now minted for **the task's own horizon** (`expires_at` /
`scheduled_time` plus a 12h margin), with a one-day floor and a seven-day ceiling
(`ttlForTask`). A task that outlives a day therefore keeps its buttons without the
app being reopened, which matters because only the app can mint and the extension
cannot renew anything. A task with no horizon keeps the plain 24h, and any request
above the ceiling is clamped. The authority is unchanged: one user, one task, one
role, that role's single action, and every tap still re-authorized against the
live record.

### 9.5 Publisher approval

`publisher_approve` → `completeTaskCore(base44, { id: claims.sub }, task.id)` —
the same body `completeTask` runs (worker counter, refunds, credit ledger,
applicant projection, idempotency guard), called with the token's own user id.
Nothing about the in-app path changed.

### 9.6 Build readiness

* Target membership (generator, verified by `--check --require` on a copy):
  `JobaTaskActivityAttributes.swift` + `JobaActivityAuthStore.swift` in **both**
  targets, `JobaTaskActionIntent.swift` in the **widget only**,
  `LiveActivityPlugin.swift` in the app, `LIVE_ACTIVITY_WIDGET` defined on both app
  configurations. The checker now also *requires* the intent and the store, so a
  build that lost the button fails at the check instead of on a device.
* Widget entitlements: `CODE_SIGN_ENTITLEMENTS` on both widget configurations; the
  app already pointed at `App/App.entitlements` in both.
* `NSSupportsLiveActivities` = true, deployment target 16.1 on the widget.
* Codemagic: `WIDGET_BUNDLE_ID` = `<APP_BUNDLE_ID>.JobaActivityWidget`, compared
  against the patched project before signing; widget profile fetched and added to
  export options only when the flag is on; the flag is a per-build input, default
  off.
* Production dispatch remains disabled (`enabled=false`, `dry_run=true`).

**Remaining blockers:** (1) the App Group must exist in the portal and be enabled
on both App IDs; (2) both profiles regenerated; (3) the Swift has still never been
compiled — no Xcode in this environment, so the first real compile is the Codemagic
archive.

Verification: `npx vitest run test/liveActivity` → 13 files, **335 tests** passing;
`npx vite build` → exit 0.
