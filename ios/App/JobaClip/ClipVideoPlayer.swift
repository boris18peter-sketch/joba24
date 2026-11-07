import AVFoundation
import SwiftUI
import UIKit

/// A muted, endlessly looping film inside a rounded card.
///
/// `AVPlayerLayer` rather than SwiftUI's `VideoPlayer`: the latter ships a full
/// transport bar (play, scrub, volume, fullscreen) that is wrong for a 15-second
/// brand film in a clip, and cannot be removed. Here there are no controls at
/// all, because there is nothing for the viewer to operate.
struct ClipVideoPlayer: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> ClipVideoView {
        let view = ClipVideoView()
        view.load(url)
        return view
    }

    func updateUIView(_ uiView: ClipVideoView, context: Context) {}
}

/// The layer host. It owns the player for its own lifetime, so the film starts
/// when the clip opens and stops when the clip goes away.
final class ClipVideoView: UIView {
    private let player = AVQueuePlayer()
    private var looper: AVPlayerLooper?
    private let playerLayer = AVPlayerLayer()

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
        player.actionAtItemEnd = .advance
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }

    func load(_ url: URL) {
        let item = AVPlayerItem(url: url)
        looper = AVPlayerLooper(player: player, templateItem: item)
        player.play()
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
}