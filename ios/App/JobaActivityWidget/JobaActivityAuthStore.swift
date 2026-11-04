import Foundation

/**
 JobaActivityAuthStore — where a Lock Screen action's capability lives.

 ── WHY THIS FILE IS IN BOTH TARGETS ────────────────────────────────────────
 The token is WRITTEN by the app (the Capacitor plugin, which is the only process
 that ever has a user session) and READ by the widget's App Intent. Two processes,
 one storage location — the App Group container — so the key format must be
 identical on both sides. It is compiled into both targets, like the attributes
 type, rather than duplicated.

 ── WHAT IS STORED ──────────────────────────────────────────────────────────
  • the action endpoint (not secret — the app's own function URL), and
  • per (role, task): the capability token the server minted for that pair.

 A capability is deliberately narrow: one user, one task, one role, only the
 actions that role may perform, and a short server-set expiry. It is not a
 session, it reads no data, and every use is re-authorized against the task.

 It is never written to the Live Activity content state, a push payload or a URL:
 Live Activity content is displayed on the Lock Screen.
 */
enum JobaActivityAuthStore {

    /// Must match the App Group entitlement on BOTH targets. A mismatch is not a
    /// crash: `UserDefaults(suiteName:)` returns nil, and the intent then reports
    /// the action as unavailable instead of running unauthenticated.
    static let appGroup = "group.com.base69e6bdb4986a04a256653a23.app"
    static let endpointKey = "joba24.liveactivity.actionEndpoint"

    /// The action endpoint COMPILED into the app.
    ///
    /// ── WHY THIS EXISTS AT ALL ───────────────────────────────────────────────
    /// The endpoint used to be known only through the stored value, so a stale
    /// write — the `capacitor://localhost/...` one the old bridge produced — left
    /// the button permanently dead until the app happened to re-mint it. A
    /// compiled https default means the intent can always reach the app's own
    /// function, even on a launch where nothing has been stored yet, and a
    /// scheme URL can never be used by accident.
    static let defaultActionEndpoint = "https://joba24.com/functions/liveActivityAction"

    /// The install-scoped capability key (see `storeUserCapability`).
    static let userTokenKey = "joba24.liveactivity.actionToken.user"

    static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroup)
    }

    static func tokenKey(taskId: String, role: String) -> String {
        "joba24.liveactivity.actionToken.\(role).\(taskId)"
    }

    static func endpoint() -> URL? {
        guard let raw = defaults?.string(forKey: endpointKey), !raw.isEmpty else { return nil }
        return URL(string: raw)
    }

    /// The endpoint the App Intent posts to. ALWAYS https.
    ///
    /// A stored value is used only when it is an https URL; anything else (an
    /// empty store, a stale `capacitor://localhost` write from an older build)
    /// falls back to the compiled default rather than being attempted.
    static func actionEndpoint() -> URL? {
        if let raw = defaults?.string(forKey: endpointKey),
           raw.hasPrefix("https://"),
           let url = URL(string: raw) {
            return url
        }
        return URL(string: defaultActionEndpoint)
    }

    /// The install-scoped capability, or nil when the app has not minted one.
    ///
    /// Stored apart from the per-card tokens on purpose: it names no task, so it
    /// is the one a card that appeared while the app was closed can still use.
    static func userToken() -> String? {
        guard let value = defaults?.string(forKey: userTokenKey), !value.isEmpty else { return nil }
        return value
    }

    /// Store (or, when `token` is nil/empty, CLEAR) the install-scoped capability.
    static func storeUserCapability(endpoint: String?, token: String?) {
        guard let defaults = defaults else { return }
        if let endpoint = endpoint, endpoint.hasPrefix("https://") {
            defaults.set(endpoint, forKey: endpointKey)
        }
        if let token = token, !token.isEmpty {
            defaults.set(token, forKey: userTokenKey)
        } else {
            // A cleared capability must never be reused by a later tap.
            defaults.removeObject(forKey: userTokenKey)
        }
    }

    static func token(taskId: String, role: String) -> String? {
        guard let value = defaults?.string(forKey: tokenKey(taskId: taskId, role: role)),
              !value.isEmpty else { return nil }
        return value
    }

    /// Store (or, when `token` is nil/empty, CLEAR) this pair's capability.
    static func store(endpoint: String?, token: String?, taskId: String, role: String) {
        guard let defaults = defaults else { return }
        // Only an https endpoint is ever persisted. A scheme URL (the
        // `capacitor://localhost` one the old bridge wrote) cannot be requested by
        // URLSession at all, so storing it would silently break every tap.
        if let endpoint = endpoint, endpoint.hasPrefix("https://") {
            defaults.set(endpoint, forKey: endpointKey)
        }
        let key = tokenKey(taskId: taskId, role: role)
        if let token = token, !token.isEmpty {
            defaults.set(token, forKey: key)
        } else {
            // A cleared capability must never be reused by a later tap.
            defaults.removeObject(forKey: key)
        }
    }

    static func clear(taskId: String, role: String) {
        defaults?.removeObject(forKey: tokenKey(taskId: taskId, role: role))
    }

    // ══════════════════════════════════════════════════════════════════════════
    // THE DEVICE SIDE OF THE DIAGNOSTIC TRAIL
    // ══════════════════════════════════════════════════════════════════════════
    //
    // ── WHY THE INTENT CANNOT JUST POST ITS OWN LOG ─────────────────────────
    // The intent has no session, so it has no endpoint it may call to record
    // what happened. Any endpoint it could call anonymously would be one an
    // attacker could also call to write whatever they liked into the operator's
    // diagnostics — so it writes to the App Group instead, and the APP (which
    // does have a session, and whose server call is authorized) forwards these
    // entries to the diagnostic table. Nothing new is exposed, and a failure on
    // the Lock Screen finally leaves evidence instead of silence.
    //
    // ── WHAT AN ENTRY MAY CONTAIN ───────────────────────────────────────────
    // A stage name, the task id, the role, a short machine detail and a
    // timestamp. NEVER the capability token, never a response body, never
    // anything a person typed. The detail is a code (`http_409_stale_step`),
    // not a sentence, precisely so no secret can leak into it by accident.
    static let stagesKey = "joba24.liveactivity.actionStages"

    /// Bounded: a device that taps a hundred times must not grow the container.
    static let maxStageEntries = 20

    /// Record one stage of an action attempt. Best effort — a logging failure
    /// must never be the reason a tap does nothing.
    static func record(stage: String, taskId: String, role: String, detail: String = "") {
        guard let defaults = defaults, !stage.isEmpty else { return }
        var entries = defaults.array(forKey: stagesKey) as? [[String: String]] ?? []
        entries.append([
            "at": ISO8601DateFormatter().string(from: Date()),
            "stage": stage,
            "task": taskId,
            "role": role,
            "detail": String(detail.prefix(80)),
        ])
        if entries.count > maxStageEntries {
            entries = Array(entries.suffix(maxStageEntries))
        }
        defaults.set(entries, forKey: stagesKey)
    }

    /// Take the recorded stages and clear them, so each one is forwarded once.
    static func drainStages() -> [[String: String]] {
        guard let defaults = defaults else { return [] }
        let entries = defaults.array(forKey: stagesKey) as? [[String: String]] ?? []
        defaults.removeObject(forKey: stagesKey)
        return entries
    }
}