import Foundation
import ActivityKit
import AppIntents

/**
 JobaTaskActionIntent — the Lock Screen button, as an Apple App Intent.

 ── THE CONSTRAINT THAT SHAPES THIS FILE ─────────────────────────────────────
 The intent runs with NO WebView, NO Capacitor bridge and NO user session, and
 possibly while the app is not in the foreground at all. It therefore cannot
 "call the app", and it must not carry a user's session token.

 It carries a NARROW CAPABILITY instead, minted by the app while it still had a
 session and stored in the shared App Group (JobaActivityAuthStore): bound to one
 user, one task and one role, listing only the actions that role may perform,
 expiring on its own. The server re-derives eligibility from the task before doing
 anything, so this token can never approve a cancelled task or step a task twice.

 ── THIS FILE MUST BE COMPILED INTO BOTH TARGETS ─────────────────────────────
 `LiveActivityIntent` is performed by the system **in the app's process** — that
 is the whole point of the protocol: it can reach ActivityKit to update and end
 the activity, which the extension cannot do for it. The widget extension needs
 the type only to CONSTRUCT the intent for `Button(intent:)`.

 Compiling it into the extension alone produced a button that was drawn
 perfectly, tapped, and did absolutely nothing: the process that had to run it
 had no such intent, so no request was ever made and no state ever changed. The
 build gate in `scripts/patch-ios-live-activity.py` now requires both targets,
 and `test/liveActivity/intentExecution.test.js` pins it.

 ── NO WORDING IS INVENTED HERE ──────────────────────────────────────────────
 Every visible string — the button label, the confirmation sentence — arrives in
 the activity's content state, from the same server contract the in-app banner
 renders. A category whose steps are called something else gets a button called
 something else, with no app release. This file adds no product copy of its own.

 ── TWO TAPS FOR AN IRREVERSIBLE ACTION ─────────────────────────────────────
 A worker's progress step is forward-only, idempotent and easily re-stated, so it
 submits on one tap. Completion is irreversible — it pays the worker, rejects the
 remaining applicants and refunds their credits — so its first tap only moves the
 card into a confirm state, showing the server's own confirmation sentence, and the
 second tap submits. Nothing else in the app is bypassed: the submit runs the real
 `completeTask` workflow.

 ── HONEST STATES, AND NEVER A SILENT NO-OP ─────────────────────────────────
 `actionState` is owned by this intent, not the server, and it is what the card
 draws: "pending" while the request is in flight, "failed" (with a retry glyph)
 when it did not land. Success shows the server's confirmed snapshot.

 EVERY exit records a stage in the App Group (`JobaActivityAuthStore.record`),
 which the app forwards to the operator's diagnostic table. A tap that cannot
 proceed is therefore never invisible: the stage names the reason
 (`activity_missing`, `no_capability`, `http_409_stale_step`, `network_error`, …).
 A stage entry never contains the capability token or a response body.

 ── A STALE CARD IS REPAIRED, NOT BLAMED ────────────────────────────────────
 A refusal carries the server's current snapshot. If that snapshot is in a
 different phase, or offers a different action, the card was simply out of date
 (another device moved the task on): the confirmed content is applied and the tap
 is NOT reported as a failure. Only a refusal against a card that already matches
 the server is drawn as failed.
 */
@available(iOS 17.0, *)
struct JobaTaskActionIntent: LiveActivityIntent {

    // Shown only in Shortcuts / the intents metadata — never on the Lock Screen.
    static var title: LocalizedStringResource = "Joba24 task action"

    /// The task whose card was tapped.
    @Parameter(title: "Task")
    var taskId: String

    /// Which side of the task the card belongs to.
    @Parameter(title: "Role")
    var role: String

    /// The contract action id (`worker_step` / `publisher_approve`) — the only
    /// value authorization is ever keyed on.
    @Parameter(title: "Action")
    var actionId: String

    /// The step the card believed it was submitting, so a tap queued behind a
    /// state change is refused as stale instead of applied out of order.
    @Parameter(title: "Step")
    var expectedStep: String

    init() {}

    init(taskId: String, role: String, actionId: String, expectedStep: String) {
        self.taskId = taskId
        self.role = role
        self.actionId = actionId
        self.expectedStep = expectedStep
    }

    func perform() async throws -> some IntentResult {
        // ── 1. The card this tap belongs to ──────────────────────────────────
        guard let activity = Activity<JobaTaskActivity>.activities.first(where: {
            $0.attributes.taskId == taskId && $0.attributes.role == role
        }) else {
            stage("activity_missing")
            return .result()
        }

        let current = activity.content.state

        // ── 2. The action the card is offering right now ─────────────────────
        // A card whose action changed between the tap and this line must not run
        // the old one. Nothing is sent; the stage says why.
        guard let action = current.action, action.id == actionId else {
            stage("action_missing", current.action?.id ?? "")
            return .result()
        }

        // ── 3. Irreversible action: the first tap only asks to confirm ───────
        // The sentence shown is the server's (`action.confirm`), never ours.
        let isApproval = action.id == "publisher_approve"
        let awaitingConfirmation = (current.actionState == "confirm")
        if isApproval && !awaitingConfirmation {
            await apply(activity, current.withActionState("confirm"))
            stage("confirm_requested")
            return .result()
        }

        // ── 4. In flight ─────────────────────────────────────────────────────
        await apply(activity, current.withActionState("pending"))

        guard let endpoint = JobaActivityAuthStore.actionEndpoint() else {
            stage("no_endpoint")
            await fail(activity, current)
            return .result()
        }
        // ── WHICH CAPABILITY ─────────────────────────────────────────────────
        // The card's own token first: it names this exact task and role, so it
        // can only ever do what this card offers. When there is none — a card
        // that appeared by Push-to-Start, created while the app was closed — the
        // install-scoped capability stands in, and the task and role below are
        // what let the server authorize it against the record.
        guard let token = JobaActivityAuthStore.token(taskId: taskId, role: role)
            ?? JobaActivityAuthStore.userToken() else {
            // No capability means no verified identity: report the failure on the
            // card instead of acting on an unauthenticated request.
            stage("no_capability")
            await fail(activity, current)
            return .result()
        }

        // ── 5. The request ───────────────────────────────────────────────────
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 20
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "token": token,
            "action_id": actionId,
            "expected_step": expectedStep,
            // Which card this tap belongs to. A per-card capability already
            // carries both and the server uses its own; an install-scoped one
            // carries neither, so these are what the server authorizes against
            // the stored task before anything is written.
            "task_id": taskId,
            "role": role,
        ])
        guard request.httpBody != nil else {
            stage("payload_error")
            await fail(activity, current)
            return .result()
        }

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            let decoded = try? JSONDecoder().decode(JobaActionResponse.self, from: data)

            // The SERVER's confirmed state — the card never shows a state the
            // backend has not agreed to.
            if let snapshot = decoded?.snapshot, status < 500 {
                await apply(activity, snapshot)
            }

            if decoded?.ok == true {
                stage(decoded?.terminal == true ? "applied_terminal" : "applied", decoded?.decision ?? "")
                // A completed task has no live card left to show.
                if decoded?.terminal == true || decoded?.snapshot == nil {
                    await activity.end(nil, dismissalPolicy: .immediate)
                    JobaActivityAuthStore.clear(taskId: taskId, role: role)
                }
                return .result()
            }

            // ── A refusal ────────────────────────────────────────────────────
            // If the server's snapshot moved on, THIS CARD was stale rather than
            // the request being wrong: show the truth and say so, instead of a
            // retry glyph that invites a pointless second tap.
            if let snapshot = decoded?.snapshot, Self.isStaleRefusal(against: current, server: snapshot) {
                // Its content was already applied above; the stage is what marks
                // this as "the card was behind", not "the tap failed".
                stage("stale_refreshed", decoded?.error ?? "")
                return .result()
            }

            // ── THE CAPABILITY, NOT THE ACTION, WAS REFUSED ──────────────────
            // Named apart from a generic refusal: this is the one failure a retry
            // cannot fix, and the one an operator must be able to see (a card whose
            // capability expired before anyone tapped it — the app has not run for
            // longer than the capability's life). The card is left as failed, which
            // is also what makes the widget re-draw this button as the open-in-app
            // link, because the store knows the same expiry.
            if Self.isCredentialRefusal(decoded?.error, status: status) {
                stage("capability_expired", decoded?.error ?? "")
                await fail(activity, current)
                return .result()
            }

            // A refusal against a card that already matched the server is a real
            // failure. The card keeps the last confirmed content and shows that
            // this tap did not land.
            stage("http_\(status)", decoded?.error ?? "unknown")
            await fail(activity, decoded?.snapshot ?? current)
            return .result()
        } catch {
            // No status code at all: the request never completed (offline, DNS,
            // timeout, redirect the OS refused). Named separately because it is
            // the one failure the user can fix by moving somewhere with signal.
            stage("network_error", String(describing: type(of: error)))
            await fail(activity, current)
            return .result()
        }
    }

    // MARK: - Helpers

    /// Record one stage of this attempt. Never contains the token or a body.
    private func stage(_ name: String, _ detail: String = "") {
        JobaActivityAuthStore.record(stage: name, taskId: taskId, role: role, detail: detail)
    }

    /// Did the endpoint refuse the CAPABILITY rather than the action?
    /// A retry cannot fix any of these; opening the app can.
    private static func isCredentialRefusal(_ error: String?, status: Int) -> Bool {
        let named = [
            "expired", "missing_token", "bad_signature", "malformed",
            "unsupported_version", "not_yet_valid", "no_secret",
        ]
        if let error = error, named.contains(error) { return true }
        return status == 401
    }

    /// Did the server's answer show that the card — not the tap — was out of date?
    private static func isStaleRefusal(
        against current: JobaTaskActivity.ContentState,
        server: JobaTaskActivity.ContentState
    ) -> Bool {
        if server.phase != current.phase { return true }
        if server.action?.id != current.action?.id { return true }
        if let serverStep = server.action?.step, let currentStep = current.action?.step, serverStep != currentStep {
            return true
        }
        return false
    }

    /// Present a state, and never lose the request over a failed presentation.
    private func apply(_ activity: Activity<JobaTaskActivity>, _ state: JobaTaskActivity.ContentState) async {
        await activity.update(ActivityContent(state: state, staleDate: nil))
    }

    /// Leave the card carrying the server's truth, marked as a failed tap.
    private func fail(_ activity: Activity<JobaTaskActivity>, _ state: JobaTaskActivity.ContentState) async {
        await apply(activity, state.withActionState("failed"))
    }
}

/// The action endpoint's answer. Optional everywhere: a refusal, a timeout and a
/// partial body must all be survivable without losing the card's content.
@available(iOS 17.0, *)
struct JobaActionResponse: Decodable {
    let ok: Bool?
    let decision: String?
    let error: String?
    let terminal: Bool?
    let snapshot: JobaTaskActivity.ContentState?
}