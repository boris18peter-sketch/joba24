import Foundation
import ActivityKit

/**
 JobaTaskActivity — the Stage 3 native contract.
 
 ── ONE FILE, TWO TARGETS ────────────────────────────────────────────────────
 This file is compiled into BOTH the app target (where an activity is started and
 its push token is observed) and into the widget extension (where it is drawn).
 ActivityKit requires exactly that: the attributes type that appears in the widget
 configuration must be the same type the app requests, so it cannot live in only
 one of the two.
 
 ── WHY THE DECODER IS TOLERANT ──────────────────────────────────────────────
 `ContentState` is decoded from `aps.content-state`, which the backend builds from
 the Stage 0 presentation contract (base44/shared/taskActivitySnapshot.ts). A
 strict decoder has one failure mode that matters: if the server ever adds or
 renames a field, or sends a number as a string, the DECODE throws and ActivityKit
 silently drops the whole update — the Lock Screen then keeps showing stale text
 with no error anywhere. So every field is decoded defensively and falls back to
 an empty value / zero. A missing subtitle must never cost the user their update.
 
 The field names below are the contract's own camelCase names; CodingKeys maps
 them explicitly so the Swift property names are free to differ (stepProgress
 carries the JSON key `progress`, which would otherwise shadow Swift's `Progress`).
 */
@available(iOS 16.1, *)
public struct JobaTaskActivity: ActivityAttributes {

    // ── Static, per-activity attributes (never change during the activity) ──
    public var taskId: String
    public var role: String

    public init(taskId: String, role: String) {
        self.taskId = taskId
        self.role = role
    }

    // ── The mutable half, replaced by every content update ──
    public struct ContentState: Codable, Hashable {

        public var title: String
        public var subtitle: String
        /// open | scheduled | awaiting_start | on_the_way | arrived | done | terminal
        public var phase: String
        /// publisher | worker
        public var role: String
        public var revision: Int
        public var contractVersion: Int
        public var iconKey: String?
        public var colorKey: String?
        public var categoryLabel: String?
        public var deepLink: String?
        public var updatedAt: String?
        public var stepProgress: StepProgress?
        public var counters: Counters?
        /// The ONE action this role may take right now (contract v2), or nil.
        public var action: Action?
        /// idle | pending | failed — owned by the App Intent, never by the server.
        public var actionState: String?

        /// `progress` in the contract: which flow step the work is on.
        public struct StepProgress: Codable, Hashable {
            public var step: Int
            public var total: Int
            public var steps: [Step]

            public struct Step: Codable, Hashable {
                public var key: String
                public var label: String
                public var icon: String?

                public init(key: String, label: String, icon: String? = nil) {
                    self.key = key
                    self.label = label
                    self.icon = icon
                }

                public init(from decoder: Decoder) throws {
                    let c = try decoder.container(keyedBy: CodingKeys.self)
                    key = (try? c.decode(String.self, forKey: .key)) ?? ""
                    label = (try? c.decode(String.self, forKey: .label)) ?? ""
                    icon = try? c.decodeIfPresent(String.self, forKey: .icon)
                }
            }

            public init(step: Int, total: Int, steps: [Step] = []) {
                self.step = step
                self.total = total
                self.steps = steps
            }

            public init(from decoder: Decoder) throws {
                let c = try decoder.container(keyedBy: CodingKeys.self)
                step = (try? c.decode(Int.self, forKey: .step)) ?? -1
                total = (try? c.decode(Int.self, forKey: .total)) ?? 0
                steps = (try? c.decode([Step].self, forKey: .steps)) ?? []
            }
        }

        /// ── The interactive action ────────────────────────────────────────────
        /// `id` is the machine-readable operation (`worker_step` /
        /// `publisher_approve`) and the ONLY thing authorization is keyed on.
        /// `label` and `confirm` are display copy the SERVER supplies, from the
        /// app's own translation — the widget invents no wording of its own, so a
        /// category that renames its steps renames its button too.
        ///
        /// Nothing here is trusted for authorization: the executor re-derives
        /// eligibility from the task. A stale label can only ever be a stale look.
        public struct Action: Codable, Hashable {
            public var id: String
            public var step: String
            public var label: String
            public var style: String?
            public var confirm: String?

            public init(id: String, step: String, label: String, style: String? = nil, confirm: String? = nil) {
                self.id = id
                self.step = step
                self.label = label
                self.style = style
                self.confirm = confirm
            }

            public init(from decoder: Decoder) throws {
                let c = try decoder.container(keyedBy: CodingKeys.self)
                id = (try? c.decode(String.self, forKey: .id)) ?? ""
                step = (try? c.decode(String.self, forKey: .step)) ?? ""
                label = (try? c.decode(String.self, forKey: .label)) ?? ""
                style = try? c.decodeIfPresent(String.self, forKey: .style)
                confirm = try? c.decodeIfPresent(String.self, forKey: .confirm)
            }
        }

        public struct Counters: Codable, Hashable {
            public var applicants: Int?
            public var views: Int?
            public var clicks: Int?

            public init(applicants: Int? = nil, views: Int? = nil, clicks: Int? = nil) {
                self.applicants = applicants
                self.views = views
                self.clicks = clicks
            }

            public init(from decoder: Decoder) throws {
                let c = try decoder.container(keyedBy: CodingKeys.self)
                applicants = try? c.decodeIfPresent(Int.self, forKey: .applicants)
                views = try? c.decodeIfPresent(Int.self, forKey: .views)
                clicks = try? c.decodeIfPresent(Int.self, forKey: .clicks)
            }
        }

        public init(
            title: String,
            subtitle: String,
            phase: String,
            role: String,
            revision: Int = 0,
            contractVersion: Int = 1,
            iconKey: String? = nil,
            colorKey: String? = nil,
            categoryLabel: String? = nil,
            deepLink: String? = nil,
            updatedAt: String? = nil,
            stepProgress: StepProgress? = nil,
            counters: Counters? = nil,
            action: Action? = nil,
            actionState: String? = nil
        ) {
            self.title = title
            self.subtitle = subtitle
            self.phase = phase
            self.role = role
            self.revision = revision
            self.contractVersion = contractVersion
            self.iconKey = iconKey
            self.colorKey = colorKey
            self.categoryLabel = categoryLabel
            self.deepLink = deepLink
            self.updatedAt = updatedAt
            self.stepProgress = stepProgress
            self.counters = counters
            self.action = action
            self.actionState = actionState
        }

        /// A copy with only the action state changed — how the intent shows
        /// "sending" and "not sent" WITHOUT the server inventing a revision for a
        /// local, unsaved state. Every other field is carried through untouched,
        /// so a pending card still says exactly what the last confirmed one said.
        public func withActionState(_ state: String?) -> ContentState {
            ContentState(
                title: title,
                subtitle: subtitle,
                phase: phase,
                role: role,
                revision: revision,
                contractVersion: contractVersion,
                iconKey: iconKey,
                colorKey: colorKey,
                categoryLabel: categoryLabel,
                deepLink: deepLink,
                updatedAt: updatedAt,
                stepProgress: stepProgress,
                counters: counters,
                action: action,
                actionState: state
            )
        }

        private enum CodingKeys: String, CodingKey {
            case title, subtitle, phase, role, revision, contractVersion
            case iconKey, colorKey, categoryLabel, deepLink, updatedAt
            case stepProgress = "progress"
            case counters
            case action, actionState
        }

        public init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            title = (try? c.decode(String.self, forKey: .title)) ?? ""
            subtitle = (try? c.decode(String.self, forKey: .subtitle)) ?? ""
            phase = (try? c.decode(String.self, forKey: .phase)) ?? ""
            role = (try? c.decode(String.self, forKey: .role)) ?? ""
            revision = (try? c.decode(Int.self, forKey: .revision)) ?? 0
            contractVersion = (try? c.decode(Int.self, forKey: .contractVersion)) ?? 1
            iconKey = try? c.decodeIfPresent(String.self, forKey: .iconKey)
            colorKey = try? c.decodeIfPresent(String.self, forKey: .colorKey)
            categoryLabel = try? c.decodeIfPresent(String.self, forKey: .categoryLabel)
            deepLink = try? c.decodeIfPresent(String.self, forKey: .deepLink)
            updatedAt = try? c.decodeIfPresent(String.self, forKey: .updatedAt)
            stepProgress = try? c.decodeIfPresent(StepProgress.self, forKey: .stepProgress)
            counters = try? c.decodeIfPresent(Counters.self, forKey: .counters)
            action = try? c.decodeIfPresent(Action.self, forKey: .action)
            actionState = try? c.decodeIfPresent(String.self, forKey: .actionState)
        }
    }
}