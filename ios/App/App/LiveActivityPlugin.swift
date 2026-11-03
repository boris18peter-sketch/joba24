import Foundation
import Capacitor
import ActivityKit

/**
 JobaActivity — the Capacitor bridge to ActivityKit (Stage 3).

 ── WHAT IT IS ALLOWED TO DO ────────────────────────────────────────────────
 Start, update and end ONE Live Activity for ONE (task, role) pair on this
 device, and report the ActivityKit push token when iOS issues or rotates it.
 That is the whole surface. It does not read tasks, decide what an activity should
 say, or send anything: the CONTENT always arrives from the app, which receives it
 from the same backend contract the in-app banner uses.

 ── WHY IT IS NOT WIRED INTO ANY SCREEN YET ─────────────────────────────────
 Production delivery stays disabled (`enabled=false`, `dry_run=true`), so nothing
 in the app calls this plugin. The bridge, the widget and the build pipeline are
 finished and verifiable; activation is a single, explicit step taken only after
 the Apple-side identifiers exist and the change is approved.

 ── AVAILABILITY ────────────────────────────────────────────────────────────
 Live Activities that can be updated by a push need iOS 16.2 (`ActivityContent`).
 On anything older the plugin reports `available:false` and every call resolves
 with a reason instead of failing — the web layer never has to crash, and nothing
 about the rest of the app depends on it.
 */
@objc(JobaActivityPlugin)
public class JobaActivityPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "JobaActivityPlugin"
    public let jsName = "JobaActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "activeActivities", returnType: CAPPluginReturnPromise),
    ]

    /// One token listener per (task, role), so a rotation replaces the old one.
    private var tokenListeners: [String: Task<Void, Never>] = [:]

    private func listenerKey(_ taskId: String, _ role: String) -> String {
        "\(taskId)|\(role)"
    }

    // MARK: - Queries

    @objc public func isAvailable(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["available": false, "reason": "unsupported_ios", "platform": "ios"])
            return
        }
        call.resolve([
            "available": ActivityAuthorizationInfo().areActivitiesEnabled,
            "reason": ActivityAuthorizationInfo().areActivitiesEnabled ? "" : "activities_disabled",
            "platform": "ios",
        ])
    }

    @objc public func activeActivities(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["activities": []])
            return
        }
        Task { @MainActor in
            var items: [[String: Any]] = []
            for activity in Activity<JobaTaskActivity>.activities {
                items.append([
                    "activityId": activity.id,
                    "taskId": activity.attributes.taskId,
                    "role": activity.attributes.role,
                    "phase": activity.content.state.phase,
                    "revision": activity.content.state.revision,
                    // The ActivityKit lifecycle value (active / stale / ended /
                    // dismissed). Without it a caller cannot tell a running
                    // activity from one iOS is still showing after it ended.
                    "activityState": Self.describe(activity.activityState),
                ])
                // Re-arm the token listener: after a relaunch the app must learn
                // the current token again, or a rotated token is never registered.
                self.observePushToken(activity)
            }
            call.resolve(["activities": items])
        }
    }

    // MARK: - Lifecycle

    @objc public func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["started": false, "reason": "unsupported_ios"])
            return
        }
        guard let taskId = call.getString("taskId"), !taskId.isEmpty else {
            call.reject("taskId is required")
            return
        }
        let role = call.getString("role") ?? "publisher"
        guard let state = Self.decodeState(call.getObject("state")) else {
            call.reject("state is required and must match the Live Activity contract")
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve(["started": false, "reason": "activities_disabled"])
            return
        }

        Task { @MainActor in
            // A device shows at most one activity per (task, role): replace it.
            for existing in Activity<JobaTaskActivity>.activities
            where existing.attributes.taskId == taskId && existing.attributes.role == role {
                await existing.end(nil, dismissalPolicy: .immediate)
            }
            do {
                let activity = try Activity.request(
                    attributes: JobaTaskActivity(taskId: taskId, role: role),
                    content: ActivityContent(state: state, staleDate: Self.staleDate(from: state)),
                    pushType: .token
                )
                self.observePushToken(activity)
                call.resolve(["started": true, "activityId": activity.id])
            } catch {
                call.resolve(["started": false, "reason": error.localizedDescription])
            }
        }
    }

    @objc public func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["updated": false, "reason": "unsupported_ios"])
            return
        }
        guard let taskId = call.getString("taskId"), !taskId.isEmpty else {
            call.reject("taskId is required")
            return
        }
        let role = call.getString("role") ?? "publisher"
        guard let state = Self.decodeState(call.getObject("state")) else {
            call.reject("state is required and must match the Live Activity contract")
            return
        }

        Task { @MainActor in
            let targets = Activity<JobaTaskActivity>.activities.filter {
                $0.attributes.taskId == taskId && $0.attributes.role == role
            }
            guard !targets.isEmpty else {
                call.resolve(["updated": false, "reason": "no_activity", "count": 0, "skipped": 0])
                return
            }
            var applied = 0
            var skipped = 0
            for activity in targets {
                // Never move backwards: an out-of-order update is refused here as
                // well as on the server, because a stale Lock Screen is worse than
                // a slightly late one.
                if state.revision < activity.content.state.revision {
                    skipped += 1
                    continue
                }
                await activity.update(ActivityContent(state: state, staleDate: Self.staleDate(from: state)))
                applied += 1
            }
            // Honest, like `end` below: an update that changed nothing on screen
            // must not report success, or a refused revision is indistinguishable
            // from a live refresh.
            call.resolve([
                "updated": applied > 0,
                "count": applied,
                "skipped": skipped,
                "reason": targets.isEmpty ? "no_activity" : (applied == 0 ? "stale_revision" : ""),
            ])
        }
    }

    @objc public func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["ended": false, "reason": "unsupported_ios"])
            return
        }
        guard let taskId = call.getString("taskId"), !taskId.isEmpty else {
            call.reject("taskId is required")
            return
        }
        let role = call.getString("role") ?? "publisher"
        let finalState = Self.decodeState(call.getObject("state"))

        Task { @MainActor in
            let targets = Activity<JobaTaskActivity>.activities.filter {
                $0.attributes.taskId == taskId && $0.attributes.role == role
            }
            for activity in targets {
                if let finalState = finalState {
                    // A finished task keeps a short, calm farewell on the Lock
                    // Screen instead of vanishing mid-glance.
                    await activity.end(
                        ActivityContent(state: finalState, staleDate: nil),
                        dismissalPolicy: .after(Date().addingTimeInterval(60))
                    )
                } else {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }
            }
            self.tokenListeners[self.listenerKey(taskId, role)]?.cancel()
            self.tokenListeners.removeValue(forKey: self.listenerKey(taskId, role))
            call.resolve(["ended": true, "count": targets.count])
        }
    }

    // MARK: - Push token

    @available(iOS 16.2, *)
    private func observePushToken(_ activity: Activity<JobaTaskActivity>) {
        let key = listenerKey(activity.attributes.taskId, activity.attributes.role)
        tokenListeners[key]?.cancel()
        let taskId = activity.attributes.taskId
        let role = activity.attributes.role
        tokenListeners[key] = Task { [weak self] in
            for await tokenData in activity.pushTokenUpdates {
                let hex = tokenData.map { String(format: "%02x", $0) }.joined()
                guard !hex.isEmpty else { continue }
                self?.notifyListeners("activityToken", data: [
                    "taskId": taskId,
                    "role": role,
                    "token": hex,
                    "environment": Self.pushEnvironment,
                    "bundleId": Bundle.main.bundleIdentifier ?? "",
                ])
            }
        }
    }

    /// Which APNs host this build's tokens belong to.
    ///
    /// A DEBUG build (Xcode) is signed for development and its tokens are sandbox
    /// tokens; a RELEASE build — TestFlight and the App Store alike — is signed
    /// for distribution and its tokens are production tokens. Sending a token to
    /// the wrong host is rejected by Apple, so this mapping matters and is why the
    /// receipt file is NOT used here: TestFlight has a sandbox receipt but
    /// production push.
    private static var pushEnvironment: String {
        #if DEBUG
        return "development"
        #else
        return "production"
        #endif
    }

    // MARK: - Contract

    @available(iOS 16.2, *)
    private static func staleDate(from state: JobaTaskActivity.ContentState) -> Date? {
        // A terminal snapshot never goes stale; a live one is marked stale after
        // the same 30 minutes the server uses for its own pushes.
        state.phase == "terminal" ? nil : Date().addingTimeInterval(30 * 60)
    }

    @available(iOS 16.2, *)
    private static func decodeState(_ dict: [String: Any]?) -> JobaTaskActivity.ContentState? {
        guard let dict = dict, JSONSerialization.isValidJSONObject(dict) else { return nil }
        guard let data = try? JSONSerialization.data(withJSONObject: dict) else { return nil }
        return try? JSONDecoder().decode(JobaTaskActivity.ContentState.self, from: data)
    }
}