import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        // Handle Universal Links (e.g. returning from Safari after Google/Apple/Facebook sign-in)
        // by loading the URL directly into the app's webview — this works regardless of
        // whether the live website's own JS listens for Capacitor's appUrlOpen event.
        if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
           let url = userActivity.webpageURL,
           let bridgeVC = window?.rootViewController as? CAPBridgeViewController {
            bridgeVC.bridge?.webView?.load(URLRequest(url: url))
        }
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
