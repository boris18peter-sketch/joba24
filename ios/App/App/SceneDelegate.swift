import UIKit
import Capacitor
import StoreKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = JobaBridgeViewController()
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

// MARK: - Local plugin registration

// Registers the app's local (non-podspec) native plugins with the Capacitor
// bridge. capacitorDidLoad() is the documented hook for registering local iOS
// plugins (Capacitor docs: "Custom Native Code").
class JobaBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(IosIapPlugin())
    }
}

// MARK: - Apple In-App Purchase plugin (StoreKit 2)
//
// On iOS, purchases of Joba24 credits MUST use Apple In-App Purchase (App
// Store Guideline 3.1.1). The website and Android keep the Tranzila flow —
// this plugin only runs inside the native iOS app.
//
//   getProducts    — loads localized prices for the app's consumable IAP products
//   purchase       — opens the StoreKit purchase sheet, returns a signed JWS receipt
//   finish         — marks a transaction as finished. Called ONLY after the backend
//                    verified the JWS and granted the credits.
//   getUnfinished  — recovery: purchased-but-never-finished transactions (the app
//                    was killed before the backend verification could run).
@objc(IosIapPlugin)
public class IosIapPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IosIapPlugin"
    public let jsName = "IosIap"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getUnfinished", returnType: CAPPluginReturnPromise),
    ]

    // StoreKit products fetched from the App Store (keyed by product id)
    private var products: [String: Product] = [:]
    // Purchased-but-not-yet-finished transactions, keyed by transaction id
    private var pendingTransactions: [UInt64: Transaction] = [:]

    @objc public func getProducts(_ call: CAPPluginCall) {
        let ids = call.getArray("productIds", String.self) ?? []
        guard !ids.isEmpty else { call.reject("Missing productIds"); return }
        Task {
            do {
                let fetched = try await Product.products(for: Set(ids))
                self.products = Dictionary(uniqueKeysWithValues: fetched.map { ($0.id, $0) })
                let list = fetched.map { (p: Product) -> [String: Any] in
                    [
                        "productId": p.id,
                        "displayPrice": p.displayPrice,
                        "title": p.displayName,
                        "description": p.description,
                    ]
                }
                call.resolve(["products": list])
            } catch {
                call.reject("Failed to load products: \(error.localizedDescription)")
            }
        }
    }

    @objc public func purchase(_ call: CAPPluginCall) {
        let productId = call.getString("productId") ?? ""
        guard let product = products[productId] else {
            call.reject("Product not loaded — call getProducts first")
            return
        }
        Task { @MainActor in
            do {
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    guard case .verified(let transaction) = verification else {
                        call.reject("Purchase could not be verified by StoreKit")
                        return
                    }
                    self.pendingTransactions[transaction.id] = transaction
                    call.resolve([
                        "jws": verification.jwsRepresentation,
                        "transactionId": String(transaction.id),
                        "productId": transaction.productID,
                    ])
                case .userCancelled:
                    call.reject("userCancelled")
                case .pending:
                    call.reject("pendingApproval")
                @unknown default:
                    call.reject("unknownPurchaseResult")
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    // Finish the transaction so StoreKit stops re-delivering it. Called by the
    // web layer ONLY after the backend verified the JWS and granted credits.
    @objc public func finish(_ call: CAPPluginCall) {
        let tidString = call.getString("transactionId") ?? ""
        guard let tid = UInt64(tidString), let tx = pendingTransactions[tid] else {
            call.resolve(["finished": false])
            return
        }
        Task {
            await tx.finish()
            pendingTransactions.removeValue(forKey: tid)
            call.resolve(["finished": true])
        }
    }

    // Recovery — transactions purchased but never finished/verified.
    @objc public func getUnfinished(_ call: CAPPluginCall) {
        Task {
            var items: [[String: Any]] = []
            if #available(iOS 15.4, *) {
                for await result in Transaction.unfinished {
                    guard case .verified(let tx) = result else { continue }
                    pendingTransactions[tx.id] = tx
                    items.append([
                        "jws": result.jwsRepresentation,
                        "transactionId": String(tx.id),
                        "productId": tx.productID,
                    ])
                }
            }
            call.resolve(["transactions": items])
        }
    }
}