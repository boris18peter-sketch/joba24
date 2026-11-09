import AVFoundation
import SwiftUI
import UIKit

/// A muted, endlessly looping film inside a rounded card.
///
/// `AVPlayerLayer` rather than SwiftUI's `VideoPlayer`: the latter ships a full
/// transport bar (play, scrub, volume, fullscreen) that is wrong for a brand
/// film in a clip, and cannot be removed. Here there are no controls at all,
/// because there is nothing for the viewer to operate.
///
/// ── WHAT THIS DELIBERATELY DOES NOT DO ──────────────────────────────────────
/// It does not ask the server in advance whether the film is reachable. The clip
/// used to send a `HEAD` request first and replace the whole player with the
/// fallback whenever that request did not answer 200. That endpoint answers
/// `HEAD` with a 404 on roughly half of all requests, so on those opens the
/// player was never created at all: a perfectly good film and a working player,
/// both discarded by the check itself.
///
/// Only the player can say whether the film can play. It is created immediately,
/// it starts as soon as the item is ready, and the fallback is shown for ONE
/// reason: the item genuinely failed.
///
/// A stall is not a failure, and there is no timeout of our own. On a slow
/// cellular connection AVPlayer simply takes longer, which is the correct
/// behaviour for the element that carries the whole clip.
struct ClipVideoPlayer: UIViewRepresentable {
    let url: URL
    /// Called on the main queue, once, only when the film cannot be played.
    let onFailure: () -> Void

    func makeUIView(context: Context) -> ClipVideoView {
        let view = ClipVideoView()
        view.onFailure = onFailure
        view.load(url)
        return view
    }

    func updateUIView(_ uiView: ClipVideoView, context: Context) {}

    static func dismantleUIView(_ uiView: ClipVideoView, coordinator: ()) {
        // Release the player and its observations when the fallback replaces it.
        uiView.stop()
    }
}

/// The layer host. It owns the player for its own lifetime, so the film starts
/// when the clip opens and stops when the clip goes away.
final class ClipVideoView: UIView {
    var onFailure: (() -> Void)?

    private let player = AVPlayer()
    private let playerLayer = AVPlayerLayer()
    private var statusObservation: NSKeyValueObservation?
    private var tokens: [NSObjectProtocol] = []
    private var reportedFailure = false

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        playerLayer.videoGravity = .resizeAspect
        playerLayer.player = player
        layer.addSublayer(playerLayer)
        // A clip is opened for a moment and often while someone is walking, so
        // the film is silent: sound that starts by itself is the one thing an
        // App Clip must never do.
        player.isMuted = true
        // Let AVPlayer decide when enough is buffered. Turning this off would
        // start the film on the first frame and then stall in the middle of it,
        // which on cellular is exactly how a card looks broken.
        player.automaticallyWaitsToMinimizeStalling = true
        observeNotifications()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }

    deinit { stop() }

    // MARK: - Load

    func load(_ url: URL) {
        let item = AVPlayerItem(url: url)
        observeStatus(of: item)
        player.replaceCurrentItem(with: item)
        // Playing before the item is ready is not a mistake: AVPlayer holds the
        // request and starts the moment it is ready, so the film begins at the
        // earliest possible moment with no poll, delay or timeout of our own.
        player.play()
    }

    func stop() {
        statusObservation?.invalidate()
        statusObservation = nil
        // Explicit closure: `removeObserver` is overloaded, and a bare function
        // reference would be ambiguous here.
        tokens.forEach { NotificationCenter.default.removeObserver($0) }
        tokens.removeAll()
        player.pause()
        player.replaceCurrentItem(with: nil)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        // No implicit animation: the layer is resized on every rotation and a
        // fading frame here would show as a flicker of black.
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        playerLayer.frame = bounds
        CATransaction.commit()
    }

    // MARK: - Watching the film

    /// `status` is the whole truth about the asset: `.unknown` still loading,
    /// `.readyToPlay` playable, `.failed` genuinely broken. Only the last one
    /// is a fallback, which is what keeps a slow network from being mistaken for
    /// a missing film.
    private func observeStatus(of item: AVPlayerItem) {
        statusObservation?.invalidate()
        statusObservation = item.observe(\.status, options: [.initial, .new]) { [weak self] item, _ in
            switch item.status {
            case .readyToPlay:
                DispatchQueue.main.async { self?.player.play() }
            case .failed:
                self?.reportFailure()
            default:
                break // still loading — AVPlayer is doing its job
            }
        }
    }

    private func observeNotifications() {
        let center = NotificationCenter.default

        // Loop: a brand film frozen on its last frame reads as a broken card.
        tokens.append(center.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime, object: nil, queue: .main
        ) { [weak self] _ in
            guard let self else { return }
            self.player.seek(to: .zero)
            self.player.play()
        })

        // A stall is the network catching up, not a broken film. AVPlayer
        // resumes on its own; asking again costs nothing. Never a fallback.
        tokens.append(center.addObserver(
            forName: .AVPlayerItemPlaybackStalled, object: nil, queue: .main
        ) { [weak self] _ in
            self?.player.play()
        })

        // A genuine mid-stream failure — the one way a stall can end for good.
        tokens.append(center.addObserver(
            forName: .AVPlayerItemFailedToPlayToEndTime, object: nil, queue: .main
        ) { [weak self] _ in
            self?.reportFailure()
        })

        // The system can interrupt a clip at any moment. Returning to a frozen
        // card reads as broken, so a ready item is simply played again.
        tokens.append(center.addObserver(
            forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main
        ) { [weak self] _ in
            guard let self, self.player.currentItem?.status == .readyToPlay else { return }
            self.player.play()
        })
    }

    /// Reported at most once: a failing item can emit several of these and the
    /// fallback must not be assigned repeatedly.
    private func reportFailure() {
        guard !reportedFailure else { return }
        reportedFailure = true
        DispatchQueue.main.async { [weak self] in self?.onFailure?() }
    }
}