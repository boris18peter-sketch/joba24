import StoreKit
import SwiftUI
import UIKit

/// The film the clip is built around. It is streamed from the app's public
/// storage rather than bundled: the clip must stay under Apple's 15 MB limit,
/// and the film alone is more than half of that.
///
/// THE CDN URL, NOT THE APP'S FILE ENDPOINT. These are the same file, but the
/// `/api/apps/.../files/mp/public/...` form answers with a 302 redirect on every
/// single request — and, for `HEAD`, with a 404 about half the time. Asking
/// AVPlayer to discover a film through a redirect hop it has to repeat for every
/// byte range is one more thing that can fail; the media host serves the file
/// directly, over https, with `accept-ranges`, an immutable cache and no
/// redirect at all. If the asset is ever re-uploaded, this is the one line to
/// update.
private let clipFilmURL = URL(string: "https://media.base44.com/videos/public/69e6bdb4986a04a256653a23/53c314145_joba24-app-clip.mp4")!

private let brandNavy = Color(red: 0.05, green: 0.12, blue: 0.25)
private let brandBlue = Color(red: 0.10, green: 0.44, blue: 0.83)
private let brandGold = Color(red: 0.98, green: 0.75, blue: 0.14)

/// What someone sees when they open the clip: the product in motion, one line of
/// what it is for, and one way forward.
///
/// Nothing here signs in, posts a task or reads a record. An App Clip is opened
/// by a stranger from a link, so it has to make sense in the fifteen seconds
/// before they decide — and the decision is what the button is for.
struct ClipRootView: View {
    @State private var videoFailed = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [brandNavy, brandNavy, brandBlue.opacity(0.55)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                brandMark
                    .padding(.bottom, 14)

                film
                    .frame(maxHeight: .infinity)

                headline
                    .padding(.top, 18)

                Spacer(minLength: 16)

                getAppButton

                Text("האפליקציה חינמית")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.white.opacity(0.55))
                    .padding(.top, 10)
            }
            .padding(.horizontal, 22)
            .padding(.top, 22)
            .padding(.bottom, 10)
        }
    }

    // MARK: - Brand

    private var brandMark: some View {
        HStack(spacing: 8) {
            Image(systemName: "sparkles")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(brandGold)
            Text("Joba24")
                .font(.system(size: 17, weight: .black))
                .foregroundColor(.white)
                .tracking(0.5)
        }
    }

    // MARK: - Film

    private var film: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(Color.white.opacity(0.06))

            if videoFailed {
                // A clip whose only content failed to load would be an empty
                // black screen — the one thing that reads as a broken app. The
                // brand mark carries it instead.
                Image(systemName: "sparkles")
                    .font(.system(size: 44, weight: .bold))
                    .foregroundColor(brandGold.opacity(0.7))
            } else {
                ClipVideoPlayer(url: clipFilmURL) {
                    // The player is the only judge of the film: this fires only
                    // when the item genuinely failed, never for a slow network.
                    videoFailed = true
                }
                .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .stroke(Color.white.opacity(0.10), lineWidth: 1)
        )
    }

    // MARK: - Copy

    private var headline: some View {
        VStack(spacing: 6) {
            Text("מוצאים בעל מקצוע תוך דקות")
                .font(.system(size: 23, weight: .black))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)

            Text("מפרסמים משימה, מקבלים פניות, ומשלמים רק כשהעבודה נעשית.")
                .font(.system(size: 13.5, weight: .medium))
                .foregroundColor(.white.opacity(0.68))
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    // MARK: - Action

    private var getAppButton: some View {
        Button(action: presentFullApp) {
            Text("המשך באפליקציה")
                .font(.system(size: 16.5, weight: .black))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(
                    LinearGradient(colors: [brandBlue, brandBlue.opacity(0.85)], startPoint: .top, endPoint: .bottom)
                )
                .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
                .shadow(color: brandBlue.opacity(0.45), radius: 14, y: 6)
        }
        .buttonStyle(.plain)
    }

    /// The App Clip card that offers the full app. `SKOverlay` is the sanctioned
    /// way out of a clip: it is drawn by the system, it needs no App Store id in
    /// the binary, and it cannot be mistaken for the app itself.
    private func presentFullApp() {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        guard let scene = scenes.first(where: { $0.activationState == .foregroundActive }) ?? scenes.first else {
            return
        }
        let overlay = SKOverlay(configuration: SKOverlay.AppClipConfiguration(position: .bottom))
        overlay.present(in: scene)
    }

}