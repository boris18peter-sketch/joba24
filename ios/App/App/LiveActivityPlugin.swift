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
        CAPPluginMethod(name: "setActionAuth", returnType: CAPPluginReturnPromise),
        // Reads back what the App Intent recorded on the Lock Screen, so the app
        // can forward it to the diagnostic table with its own session. Draining
        // is deliberate: an entry is forwarded exactly once.
        CAPPluginMethod(name: "actionStages", returnType: CAPPluginReturnPromise),
        // ── PUSH-TO-START (iOS 17.2+) ────────────────────────────────────────
        // `pushToStartToken` reports the INSTALL's token — the one that can make
        // a card appear while the app is closed — and arms the rotation stream.
        // `setUserActionAuth` stores the install-scoped action capability, so the
        // button on such a card works before the app has ever been opened for it.
        CAPPluginMethod(name: "pushToStartToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setUserActionAuth", returnType: CAPPluginReturnPromise),
    ]

    /// One token listener per (task, role), so a rotation replaces the old one.
    private var tokenListeners: [String: Task<Void, Never>] = [:]

    /// The ONE observer of the install's Push-to-Start token. Attached on the
    /// first read and kept for the life of the process: Apple rotates this token
    /// on its own schedule, and a rotation that nobody is listening for means a
    /// card can no longer be started remotely until the app is relaunched.
    private var pushToStartTask: Task<Void, Never>?

    private func listenerKey(_ taskId: String, _ role: String) -> String {
        "\(taskId)|\(role)"
    }

    // ── WHICH CARDS THIS APP ITSELF CREATED ──────────────────────────────────
    // A card iOS created from a Push-to-Start push appears in `Activity.activities`
    // exactly like one the app requested, so the app cannot tell them apart — and
    // therefore could never answer the only question that matters when a remote
    // start seems to fail: did iOS create a card, or did the app?
    //
    // The ids of the activities THIS app requested are remembered here, so every
    // card can be labelled "local" or "remote". Only ids are stored: no token, no
    // capability, no user data.
    private static let ownedIdsKey = "joba.liveactivity.owned.activity.ids.v1"

    private static func ownedActivityIds() -> Set<String> {
        Set(UserDefaults.standard.stringArray(forKey: ownedIdsKey) ?? [])
    }

    private static func rememberOwned(_ id: String) {
        var ids = ownedActivityIds()
        ids.insert(id)
        // Bounded: the ids of cards that are long gone carry no information.
        UserDefaults.standard.set(Array(ids.suffix(40)), forKey: ownedIdsKey)
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
            // ── ONE CARD PER (TASK, ROLE), ALWAYS ────────────────────────────
            // A device can end up showing the SAME card twice: two start pushes
            // that both reached a rotated token, or a card the system created
            // remotely while the app was also starting one. iOS keeps both, and
            // the user sees a doubled widget. The list read is the one moment
            // the app can see all of them at once, so duplicates are closed here
            // — keeping the most advanced revision (the freshest card) and
            // ending the rest immediately. Nothing else about a card changes.
            let all = Activity<JobaTaskActivity>.activities
            var newest: [String: Activity<JobaTaskActivity>] = [:]
            for activity in all {
                let key = "\(activity.attributes.taskId)|\(activity.attributes.role)"
                if let current = newest[key] {
                    if activity.content.state.revision > current.content.state.revision {
                        newest[key] = activity
                    }
                } else {
                    newest[key] = activity
                }
            }
            for activity in all {
                let key = "\(activity.attributes.taskId)|\(activity.attributes.role)"
                guard let winner = newest[key], winner.id != activity.id else { continue }
                NSLog("[JobaActivity] closing duplicate card %@ for %@", activity.id, key)
                await activity.end(nil, dismissalPolicy: .immediate)
            }

            var items: [[String: Any]] = []
            for activity in newest.values {
                items.append([
                    "activityId": activity.id,
                    // "local" = this app requested it; "remote" = the system
                    // created it from a Push-to-Start push while the app was
                    // closed. This one word is the ONLY reliable evidence that
                    // remote start worked: an accepted push and a registered
                    // start token are equally true of a start that never
                    // happened.
                    "createdBy": Self.ownedActivityIds().contains(activity.id) ? "local" : "remote",
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

    // MARK: - Push-to-Start

    /**
     The install's Push-to-Start token (iOS 17.2+), plus a `supported` flag.

     ── WHAT THIS TOKEN IS ───────────────────────────────────────────────────
     A DIFFERENT token from the per-activity ones (`activityToken` events): this
     one belongs to the install and lets the server make a card APPEAR while the
     app is closed. Calling this method also arms the rotation stream, so the web
     layer learns about a replacement without the user doing anything.

     On iOS 16.x it resolves `supported: false` and no token is ever registered:
     the app keeps starting cards itself, which is the existing fallback and is
     untouched by this feature.
     */
    @objc public func pushToStartToken(_ call: CAPPluginCall) {
        guard #available(iOS 17.2, *) else {
            call.resolve([
                "supported": false,
                "token": "",
                "reason": "unsupported_ios",
                "environment": Self.pushEnvironment,
            ])
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve([
                "supported": true,
                "token": "",
                "reason": "activities_disabled",
                "environment": Self.pushEnvironment,
            ])
            return
        }

        observePushToStartToken()
        // ── THE CORRECT API, AND WHY THE OLD ONE COULD NOT COMPILE ───────────
        // This read the token off a `pushType` member OF `Activity`, and the
        // Codemagic archive failed with "type 'Activity<JobaTaskActivity>' has
        // no member 'pushType'". `Activity` has no `pushType` member at all:
        // a `PushType` is only the ARGUMENT that opts one activity into push at
        // `Activity.request(attributes:content:pushType:)` (see `start` below).
        //
        // The Push-to-Start token is a STATIC member of `Activity` itself, iOS
        // 17.2+. That is not a detail of taste — it has to be static, because the
        // token belongs to the INSTALL and is readable BEFORE any activity
        // exists, which is precisely when it is needed.
        let data = Activity<JobaTaskActivity>.pushToStartToken
        let hex = data.map { $0.map { String(format: "%02x", $0) }.joined() } ?? ""
        call.resolve([
            "supported": true,
            "token": hex,
            // A token can take a moment to be issued on first launch. Reported as
            // a reason, never as an error: the caller simply registers later.
            "reason": hex.isEmpty ? "token_not_ready" : "",
            "environment": Self.pushEnvironment,
            "bundleId": Bundle.main.bundleIdentifier ?? "",
        ])
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
            // ── INSPECT THE CARD THAT IS ALREADY THERE, BEFORE REPLACING IT ──
            // A device shows at most one activity per (task, role), so anything
            // matching is about to be replaced. It is read first because it is
            // the answer to "did the push already work?": a matching card whose
            // id this app never requested was created by iOS from a remote start.
            // `origin` is returned to the web layer and logged, so the next build
            // can prove which process created the card instead of guessing.
            let owned = Self.ownedActivityIds()
            let prior = Activity<JobaTaskActivity>.activities.filter {
                $0.attributes.taskId == taskId && $0.attributes.role == role
            }
            let origin = prior.isEmpty
                ? "none"
                : (prior.contains(where: { owned.contains($0.id) }) ? "local" : "remote")
            NSLog("[JobaActivity] start origin=%@ prior=%d role=%@", origin, prior.count, role)
            for existing in prior {
                await existing.end(nil, dismissalPolicy: .immediate)
            }
            do {
                let activity = try Activity.request(
                    attributes: JobaTaskActivity(taskId: taskId, role: role),
                    content: ActivityContent(state: state, staleDate: Self.staleDate(from: state)),
                    pushType: .token
                )
                Self.rememberOwned(activity.id)
                self.observePushToken(activity)
                call.resolve([
                    "started": true,
                    "activityId": activity.id,
                    "origin": origin,
                    "priorCount": prior.count,
                ])
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
        let endsEverything = call.getBool("all") ?? false
        let taskId = call.getString("taskId") ?? ""
        if !endsEverything && taskId.isEmpty {
            call.reject("taskId is required (or pass all=true)")
            return
        }
        let role = call.getString("role") ?? "publisher"
        let finalState = Self.decodeState(call.getObject("state"))
        // ── HOW LONG THE CARD LINGERS ────────────────────────────────────────
        // This was hardcoded to 60 seconds whenever a farewell state was given,
        // so pressing "end" left the Lock Screen card up for a full minute and
        // looked as if nothing had happened. The default is now IMMEDIATE, and a
        // caller that genuinely wants a calm farewell asks for it explicitly.
        let dismissAfter = max(0, call.getInt("dismissAfter") ?? 0)

        Task { @MainActor in
            let targets = Activity<JobaTaskActivity>.activities.filter {
                endsEverything || ($0.attributes.taskId == taskId && $0.attributes.role == role)
            }
            let policy: ActivityUIDismissalPolicy = dismissAfter > 0
                ? .after(Date().addingTimeInterval(Double(dismissAfter)))
                : .immediate
            let farewell = finalState.map { ActivityContent(state: $0, staleDate: nil) }

            var endedIds: [String] = []
            for activity in targets {
                await activity.end(farewell, dismissalPolicy: policy)
                endedIds.append(activity.id)
                self.cancelTokenListener(taskId: activity.attributes.taskId, role: activity.attributes.role)
            }

            // ── REPORT WHAT iOS DID, NOT WHAT WAS INTENDED ────────────────────
            // `ended` used to be `true` even when nothing matched, so a no-op was
            // indistinguishable from a real close. It now means "this call ended
            // at least one activity"; `count` says how many, `remaining` re-reads
            // ActivityKit afterwards so a caller can prove no orphan survived,
            // and `reason` explains a no-op instead of leaving it blank.
            let remaining = Activity<JobaTaskActivity>.activities.count
            call.resolve([
                "ended": !endedIds.isEmpty,
                "count": endedIds.count,
                "activityIds": endedIds,
                "dismissAfter": dismissAfter,
                "remaining": remaining,
                "reason": endedIds.isEmpty ? "no_activity" : "",
            ])
        }
    }

    /// Stop observing a pair's push token — called when its activity ends.
    private func cancelTokenListener(taskId: String, role: String) {
        let key = listenerKey(taskId, role)
        tokenListeners[key]?.cancel()
        tokenListeners.removeValue(forKey: key)
    }

    // MARK: - Action capability

    /**
     Hand this activity's capability token and the action endpoint to the App
     Group, where the widget's App Intent can read them.

     ── WHY THE APP, AND NOT THE EXTENSION ───────────────────────────────────
     A token can only be minted while a user session exists, and the only process
     that ever has one is the app. The extension has no way to obtain a session of
     its own, and giving the Lock Screen a session token would hand far more
     authority to a widget than a single confirmed tap needs.

     The token is a capability: one user, one task, one role, one short expiry. It
     is written to the App Group container only — never to the content state, a
     push payload, a log line or a URL.
     */
    @objc public func setActionAuth(_ call: CAPPluginCall) {
        guard let taskId = call.getString("taskId"), !taskId.isEmpty else {
            call.reject("taskId is required")
            return
        }
        let role = call.getString("role") ?? "publisher"
        // A missing/blank token clears the stored one, so a revoked capability is
        // never left behind for a later tap to use.
        JobaActivityAuthStore.store(
            endpoint: call.getString("endpoint"),
            token: call.getString("token"),
            expiresAt: Self.expirySeconds(call),
            taskId: taskId,
            role: role
        )
        call.resolve(["stored": JobaActivityAuthStore.token(taskId: taskId, role: role) != nil])
    }

    /// Hand the app every stage the Lock Screen action recorded since the last
    /// call, and clear the buffer.
    ///
    /// The intent can only log into the App Group (it has no session), so this is
    /// how its evidence reaches the operator's diagnostic view. A tap that did
    /// nothing used to leave no trace anywhere; now the app reports which stage
    /// it stopped at.
    @objc public func actionStages(_ call: CAPPluginCall) {
        call.resolve(["stages": JobaActivityAuthStore.drainStages()])
    }

    /**
     Store the INSTALL-scoped action capability and the endpoint, for a card that
     was started remotely and therefore has no per-card capability yet.

     It is deliberately the wider of the two stored credentials, so it is stored
     under its own key and cannot be mistaken for a card's: it names no task, it
     carries only the action ids a card can offer, it lives twelve hours, and the
     server re-derives ownership of whichever task a tap names. The narrower
     per-(task, role) token is always preferred by the intent when it exists.

     Like `setActionAuth`, this only writes to the App Group: nothing is sent and
     nothing leaves the device.
     */
    @objc public func setUserActionAuth(_ call: CAPPluginCall) {
        JobaActivityAuthStore.storeUserCapability(
            endpoint: call.getString("endpoint"),
            token: call.getString("token"),
            expiresAt: Self.expirySeconds(call)
        )
        call.resolve(["stored": JobaActivityAuthStore.userToken() != nil])
    }

    /// The capability's expiry in epoch SECONDS, from the `expiresAtMs` the app
    /// sends. Absent or unparseable means "no recorded expiry", which the store
    /// treats as unusable — the card then offers the open-in-app fallback instead
    /// of a tap that could only fail.
    private static func expirySeconds(_ call: CAPPluginCall) -> Double? {
        guard let ms = call.getDouble("expiresAtMs"), ms > 0 else { return nil }
        return ms / 1000
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

    /// Observe the install's Push-to-Start token, once per launch.
    ///
    /// `pushToStartTokenUpdates` yields the current value immediately (when Apple
    /// has issued one) and then again whenever it rotates, which is exactly what
    /// `activityToken` does for a single card. A rotation the app never hears
    /// about is a card the server can no longer start, so this is armed as soon
    /// as the web layer asks for the token.
    @available(iOS 17.2, *)
    private func observePushToStartToken() {
        guard pushToStartTask == nil else { return }
        // Static as well (see `pushToStartToken(_:)` above): there is no
        // `pushType` object to obtain and no activity to obtain it from. This
        // yields the current token immediately, then every rotation.
        let updates = Activity<JobaTaskActivity>.pushToStartTokenUpdates
        pushToStartTask = Task { [weak self] in
            for await tokenData in updates {
                let hex = tokenData.map { String(format: "%02x", $0) }.joined()
                guard !hex.isEmpty else { continue }
                self?.notifyListeners("pushToStartToken", data: [
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

    /// The ActivityKit lifecycle value as a string the web layer can display.
    @available(iOS 16.2, *)
    private static func describe(_ state: ActivityState) -> String {
        switch state {
        case .active: return "active"
        case .stale: return "stale"
        case .ended: return "ended"
        case .dismissed: return "dismissed"
        // ── WHY THE UNKNOWN BRANCH RETURNS THE STATE'S OWN NAME ──────────────
        // Newer SDKs add `ActivityState` cases — `.pending` among them: a card
        // the system has accepted but not yet presented. Naming one here ties
        // this file to the exact SDK the runner happens to ship, and the cost is
        // asymmetric: on an SDK that lacks that case, spelling it out is a hard
        // ERROR, not a warning.
        //
        // Reporting the state by its own name handles `.pending` — and anything
        // added later — correctly on every SDK, and keeps the switch exhaustive.
        // This string is diagnostic output only (`activeActivities`); nothing in
        // the app branches on it, so an unfamiliar value can never mislead logic,
        // only a reader.
        @unknown default: return String(describing: state).lowercased()
        }
    }

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