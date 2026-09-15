import Foundation
import Capacitor
import FacebookCore
import AppTrackingTransparency

// MARK: - Meta App Events Plugin
//
// Bridges JS → Meta's FacebookCore SDK for App Events logging.
// Used for Meta App Ads attribution and optimization.
// Registered in JobaBridgeViewController.capacitorDidLoad().
@objc(MetaAppEventsPlugin)
public class MetaAppEventsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MetaAppEventsPlugin"
    public let jsName = "MetaAppEvents"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "logEvent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setUserId", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestATT", returnType: CAPPluginReturnPromise),
    ]

    // Log a Meta App Event (standard or custom).
    // JS: logEvent({ name: "CompleteRegistration", params: {...}, valueToSum: 0 })
    @objc public func logEvent(_ call: CAPPluginCall) {
        guard let eventName = call.getString("name") else {
            call.reject("name is required")
            return
        }
        let params = call.getObject("params") ?? [:]
        let valueToSum = call.getDouble("valueToSum")

        var appParams: [AppEvents.ParameterName: Any] = [:]
        for (key, value) in params {
            appParams[AppEvents.ParameterName(key)] = value
        }

        let event = AppEvents.Name(eventName)
        if let value = valueToSum {
            AppEvents.shared.logEvent(event, valueToSum: value, parameters: appParams)
        } else {
            AppEvents.shared.logEvent(event, parameters: appParams)
        }
        call.resolve()
    }

    // Set user ID for attribution (call after login, clear on logout).
    @objc public func setUserId(_ call: CAPPluginCall) {
        let userId = call.getString("userId") ?? ""
        AppEvents.shared.userID = userId.isEmpty ? nil : userId
        call.resolve()
    }

    // Request App Tracking Transparency permission (iOS 14+).
    // Returns { status: 0=notDetermined, 1=restricted, 2=denied, 3=authorized }
    @objc public func requestATT(_ call: CAPPluginCall) {
        if #available(iOS 14, *) {
            let current = ATTrackingManager.trackingAuthorizationStatus
            if current == .notDetermined {
                ATTrackingManager.requestTrackingAuthorization { status in
                    Settings.shared.isAdvertiserTrackingEnabled = (status == .authorized)
                    call.resolve(["status": status.rawValue])
                }
            } else {
                Settings.shared.isAdvertiserTrackingEnabled = (current == .authorized)
                call.resolve(["status": current.rawValue])
            }
        } else {
            call.resolve(["status": 3])
        }
    }
}