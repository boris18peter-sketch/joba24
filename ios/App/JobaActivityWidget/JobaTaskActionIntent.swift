import Foundation
import ActivityKit
import AppIntents

/**
 JobaTaskActionIntent — the Lock Screen button, as an Apple App Intent.

 ── THE CONSTRAINT THAT SHAPES THIS FILE ─────────────────────────────────────
 The intent runs in the WIDGET EXTENSION: no WebView, no Capacitor bridge, no user
 session, and possibly while the app is not running at all. It therefore cannot
 "call the app", and it must not carry a user's session token.

 It carries a NARROW CAPABILITY instead, minted by the app while it still had a
 session and stored in the shared App Group (JobaActivityAuthStore): bound to one
 user, one task and one role, listing only the actions that role may perform,
 expiring on its own. The server re-derives eligibility from the task before doing
 anything, so this token can never approve a cancelled task or step a task twice.

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

 ── HONEST STATES ────────────────────────────────────────────────────────────
 `actionState` is owned by this intent, not the server, and it is what the card
 draws: "pending" while the request is in flight, "failed" (with a retry glyph)
 when it did not land. Success shows the server's confirmed snapshot. Nothing is
 ever reported as done before the backend has said so.
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
        guard let activity = Activity<JobaTaskActivity>.activities.first(where: {
            $0.attributes.taskId == taskId && $0.attributes.role == role
        }) else {
            return .result()
        }

        let current = activity.content.state
        guard let action = current.action, action.id == actionId else {
            return .result()
        }

        // ── Irreversible action: the first tap only asks to confirm ───────────
        // The sentence shown is the server's (`action.confirm`), never ours.
        let isApproval = action.id == "publisher_approve"
        let awaitingConfirmation = (current.actionState == "confirm")
        if isApproval && !awaitingConfirmation {
            await activity.update(
                ActivityContent(state: current.withActionState("confirm"), staleDate: nil)
            )
            return .result()
        }

        // ── In flight ────────────────────────────────────────────────────────
        await activity.update(
            ActivityContent(state: current.withActionState("pending"), staleDate: nil)
        )

        guard let endpoint = JobaActivityAuthStore.endpoint(),
              let token = JobaActivityAuthStore.token(taskId: taskId, role: role) else {
            // No capability means no verified identity: report the failure on the
            // card instead of acting on an unauthenticated request.
            await activity.update(
                ActivityContent(state: current.withActionState("failed"), staleDate: nil)
            )
            return .result()
        }

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 20
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "token": token,
            "action_id": actionId,
            "expected_step": expectedStep,
        ])

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            let decoded = try? JSONDecoder().decode(JobaActionResponse.self, from: data)

            if let snapshot = decoded?.snapshot {
                // The SERVER's confirmed state — the card never shows a state the
                // backend has not agreed to.
                await activity.update(ActivityContent(state: snapshot, staleDate: nil))
            }

            if decoded?.ok == true {
                // A completed task has no live card left to show.
                if decoded?.terminal == true || decoded?.snapshot == nil {
                    await activity.end(nil, dismissalPolicy: .immediate)
                    JobaActivityAuthStore.clear(taskId: taskId, role: role)
                }
                return .result()
            }

            // A refusal is a state, not a crash: the card keeps the last confirmed
            // content and shows that this tap did not land.
            await activity.update(
                ActivityContent(state: (decoded?.snapshot ?? current).withActionState("failed"), staleDate: nil)
            )
            return .result()
        } catch {
            await activity.update(
                ActivityContent(state: current.withActionState("failed"), staleDate: nil)
            )
            return .result()
        }
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