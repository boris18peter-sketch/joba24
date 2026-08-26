# Support Request: Automatic return to app after OAuth on Android (Capacitor + Base44)

## Goal

We built a Capacitor app (iOS + Android) on top of Base44. The desired login experience:

**User taps "Continue with Google/Apple/Facebook" → system browser opens → user authenticates → app returns AUTOMATICALLY and INSTANTLY, with NO extra tap from the user** — exactly like any native app.

## Current status

- ✅ **iOS — fully solved.** We registered the `joba24://` custom scheme in `Info.plist` (we build iOS ourselves via Codemagic, and `Info.plist` is editable). After OAuth, the backend does `window.location.replace('joba24://auth-callback?access_token=...')` and the app returns instantly via `appUrlOpen`.
- ❌ **Android — not working.** This is what we need your help to solve.

## The Android problem — root cause

**Base44 builds the Android app, and the `AndroidManifest.xml` is NOT under our control.** We cannot register the `joba24://` scheme via an intent-filter manually.

We wrote a script (`scripts/patch-android-manifest.py`) that injects an intent-filter into the manifest as part of the Codemagic build, but even with it, automatic return is unreliable.

What we tried and failed:
1. **Embedded WebView for OAuth** — Google blocks login in an embedded WebView (`disallowed_useragent`). We switched to the system browser (`@capacitor/browser`).
2. **Bare `joba24://` scheme** — Chrome Custom Tab usually ignores it.
3. **`intent://...#Intent;scheme=joba24;end`** — if no matching intent-filter exists, Chrome does nothing (silent).
4. **`intent://...#Intent;...;package=com.base69e6bdb4986a04a256653a23.app;end`** — when the intent fails to resolve, Chrome **redirects to the Google Play Store** instead of staying on the page. We removed `package=`.
5. **`window.close()`** inside the Custom Tab — does not work (known limitation).
6. **`history.back()`** — navigates back to the Google sign-in page instead of closing the tab (and then login is never completed).

## Current fallback (and why it's not enough)

Because we have no reliable way to auto-return the user on Android, we built a fallback:
- Page `/auth-callback` (in the external browser) stores the `access_token` in an `OAuthHandshake` entity on the backend (keyed by a `sid`).
- The native app (`NativeAuthListener`) polls that handshake.
- When the user **manually closes** the Custom Tab (✕ button or back), `browserFinished` fires → polling finds the token → app reloads authenticated.
- We trap the system "back" button with `pushState`/`popstate` so it can't navigate back to Google.

**Why this isn't good enough:** it requires a manual user action (tapping ✕), and even that is inconsistent. Far from the desired **automatic, instant return**.

## What we need from Base44

Goal: **automatic, instant return to the app after OAuth on Android, with no manual tap — exactly like iOS.**

The core blocker: **Base44 builds the Android app and the `AndroidManifest.xml` is not in our control.** We need one of the following (or your recommendation):

1. **Built-in deep-link scheme support for Android** — Base44 automatically registers `joba24://` (or a shared Base44 scheme) in the `AndroidManifest.xml` of every Android app it builds, exactly as we do manually in `Info.plist` on iOS. This would let `intent://...#Intent;scheme=joba24;end` open the app instantly.
2. **Ability to add/edit an intent-filter in `AndroidManifest.xml`** persistently through Base44 app settings (so we don't depend on a CI patch script that isn't always picked up).
3. **Official OAuth-return mechanism for Capacitor from Base44** — if there's an official/recommended way to return a user from the external browser to a Capacitor-Android app after OAuth (e.g. App Links / `https` deep-link with `autoVerify`, or Universal-Links-style support for Android), we'd appreciate precise guidance on how to configure it against your backend.

## Technical details (for the developer)

- **Capacitor**: `@capacitor/browser` to open OAuth in the system browser; `@capacitor/app` for `appUrlOpen`/`appStateChange`.
- **capacitor.config.json**: `"server": { "url": "https://joba24.com/" }`, `androidScheme: "https"`, `allowNavigation` includes OAuth provider domains.
- **LoginPromptModal** opens `https://joba24.com/api/apps/auth/{provider}/login?app_id=...&from_url=https://joba24.com/auth-callback?sid=...`.
- **Backend**: `OAuthHandshake` entity with `sid` + `token`. `nativeAuthHandshake` function (actions: `store`/`poll`, single-use, TTL 300s).
- **NativeAuthListener**: pollBurst (80 attempts × 200ms = 16s) + interval 1s + `browserFinished` + `visibilitychange` + `appStateChange`.
- **iOS Info.plist**: `CFBundleURLTypes` with `joba24` scheme — works great.
- **Android**: `scripts/patch-android-manifest.py` injects an intent-filter into `AndroidManifest.xml` in Codemagic — but return is still unreliable.

## TL;DR

We need the return of the user from the external browser to the Android app to happen **automatically and instantly** after OAuth, without relying on a manual tap. On iOS we solved this with a custom scheme in `Info.plist`. The Android blocker is that `AndroidManifest.xml` is built by Base44 and not in our control. We'd appreciate an official solution from you — registering the scheme in the manifest, or a supported deep-link mechanism.