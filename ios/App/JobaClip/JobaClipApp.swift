import SwiftUI

/// Joba24 — the App Clip.
///
/// ── WHY THIS IS NATIVE AND NOT THE WEB APP ─────────────────────────────────
/// An App Clip must stay under Apple's 15 MB limit for the CLIP target alone.
/// The Joba24 app is Capacitor: its web bundle, plugins and native modules are
/// far past that on their own, so a clip that loaded the app would be rejected
/// before it ever reached a phone.
///
/// So the clip is what a clip is for: one small, fast, focused moment that shows
/// what Joba24 does in a few seconds and offers the real app. It is pure SwiftUI,
/// links nothing but SwiftUI / AVFoundation / StoreKit, and carries no video of
/// its own — the film is streamed (a bundled copy alone would be half the
/// budget).
@main
struct JobaClipApp: App {
    var body: some Scene {
        WindowGroup {
            ClipRootView()
                // The product is Hebrew, so the whole clip is laid out right to
                // left — independent of the device's own language, exactly like
                // the app's own RTL surface.
                .environment(\.layoutDirection, .rightToLeft)
                .preferredColorScheme(.dark)
        }
    }
}