import WidgetKit
import SwiftUI
import ActivityKit

/**
 The widget extension entry point. One widget: the task Live Activity.

 ── WHAT IT DRAWS, AND WHAT IT DOES NOT ─────────────────────────────────────
 It draws exactly what the push payload already decided. There is NO logic here
 that reads a task status, resolves a category flow, or picks a Hebrew string —
 every word on the Lock Screen comes from `state.title` / `state.subtitle`, which
 the backend produced from the same contract the in-app banner renders. That is
 what keeps the Lock Screen and the app from ever disagreeing.

 ── RTL ────────────────────────────────────────────────────────────────────
 Joba24 is a Hebrew app, so the whole activity is laid out right-to-left. iOS does
 not inherit the app's direction into an extension, so it is set explicitly on the
 root of both surfaces.
 */
@main
struct JobaActivityWidgetBundle: WidgetBundle {
    var body: some Widget {
        JobaTaskLiveActivity()
    }
}

struct JobaTaskLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: JobaTaskActivity.self) { context in
            LockScreenCard(state: context.state)
                .widgetURL(Self.deepLink(for: context))
                .activityBackgroundTint(JobaPalette.card)
                .activitySystemActionForegroundColor(JobaPalette.ink)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    IconBubble(iconKey: context.state.iconKey, colorKey: context.state.colorKey)
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if let count = context.state.counters?.applicants, count > 0 {
                        ApplicantPill(count: count)
                            .padding(.trailing, 4)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(context.state.title)
                            .font(.subheadline.weight(.bold))
                            .foregroundColor(JobaPalette.ink)
                            .lineLimit(1)
                        Text(context.state.subtitle)
                            .font(.caption2)
                            .foregroundColor(JobaPalette.muted)
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .environment(\.layoutDirection, .rightToLeft)
                }
            } compactLeading: {
                IconBubble(iconKey: context.state.iconKey, colorKey: context.state.colorKey)
                    .scaleEffect(0.78)
            } compactTrailing: {
                Text(Self.shortLabel(for: context.state))
                    .font(.caption2.weight(.bold))
                    .foregroundColor(JobaPalette.brand)
                    .lineLimit(1)
            } minimal: {
                IconBubble(iconKey: context.state.iconKey, colorKey: context.state.colorKey)
                    .scaleEffect(0.62)
            }
            .keylineTint(JobaPalette.brand)
        }
    }

    /// The tap target: the contract's own deep link, or the app's task link.
    static func deepLink(for context: ActivityViewContext<JobaTaskActivity>) -> URL? {
        if let raw = context.state.deepLink, let url = URL(string: raw) { return url }
        return URL(string: "https://joba24.com/?open_task=\(context.attributes.taskId)")
    }

    /// The compact trailing text: the flow position when there is one, else the phase.
    static func shortLabel(for state: JobaTaskActivity.ContentState) -> String {
        if let progress = state.stepProgress, progress.total > 0, progress.step >= 0 {
            return "\(min(progress.step + 1, progress.total))/\(progress.total)"
        }
        if let count = state.counters?.applicants, count > 0, state.phase == "open" {
            return "\(count)"
        }
        return state.phase.isEmpty ? "Joba24" : state.phase
    }
}

// MARK: - Lock Screen

struct LockScreenCard: View {
    let state: JobaTaskActivity.ContentState

    var body: some View {
        VStack(alignment: .trailing, spacing: 8) {
            HStack(spacing: 10) {
                IconBubble(iconKey: state.iconKey, colorKey: state.colorKey)
                VStack(alignment: .trailing, spacing: 2) {
                    Text(state.title)
                        .font(.subheadline.weight(.bold))
                        .foregroundColor(JobaPalette.ink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.85)
                    if !state.subtitle.isEmpty {
                        Text(state.subtitle)
                            .font(.caption)
                            .foregroundColor(JobaPalette.muted)
                            .lineLimit(1)
                            .minimumScaleFactor(0.85)
                    }
                }
                Spacer(minLength: 0)
                if let count = state.counters?.applicants, count > 0, state.phase == "open" {
                    ApplicantPill(count: count)
                }
            }

            if let progress = state.stepProgress, progress.total > 0 {
                StepRail(progress: progress)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .environment(\.layoutDirection, .rightToLeft)
    }
}

/// The flow's own step rail — same steps, same order, same labels as the app.
struct StepRail: View {
    let progress: JobaTaskActivity.ContentState.StepProgress

    var body: some View {
        HStack(spacing: 4) {
            ForEach(Array(progress.steps.enumerated()), id: \.offset) { index, step in
                Capsule()
                    .fill(index <= progress.step ? JobaPalette.brand : JobaPalette.track)
                    .frame(height: 3)
                    .overlay(alignment: .bottom) {
                        if index == progress.step {
                            Text(step.label)
                                .font(.system(size: 8))
                                .foregroundColor(JobaPalette.muted)
                                .fixedSize()
                                .offset(y: 9)
                        }
                    }
            }
        }
        .padding(.bottom, 10)
    }
}

// MARK: - Pieces

struct IconBubble: View {
    let iconKey: String?
    let colorKey: String?

    var body: some View {
        ZStack {
            Circle()
                .fill(tint.opacity(0.14))
                .frame(width: 30, height: 30)
            Image(systemName: symbol)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(tint)
        }
    }

    private var tint: Color {
        colorKey == "success" ? JobaPalette.success : JobaPalette.brand
    }

    /// The contract's icon keys, mapped to SF Symbols. An unknown key falls back
    /// to the clock rather than to nothing, so the bubble is never empty.
    private var symbol: String {
        switch iconKey {
        case "calendar": return "calendar"
        case "check": return "checkmark.circle.fill"
        case "navigation": return "location.north.fill"
        case "clock": return "clock.fill"
        case "chat": return "bubble.left.fill"
        case "person": return "person.fill"
        default: return "clock.fill"
        }
    }
}

struct ApplicantPill: View {
    let count: Int

    var body: some View {
        HStack(spacing: 3) {
            Image(systemName: "person.2.fill")
                .font(.system(size: 9, weight: .bold))
            Text("\(count)")
                .font(.caption2.weight(.heavy))
        }
        .foregroundColor(JobaPalette.gold)
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(
            Capsule().fill(JobaPalette.gold.opacity(0.16))
        )
    }
}

// MARK: - Palette

/// The app's own brand values, as plain sRGB so the extension needs no asset
/// catalog and no shared bundle — it stays a self-contained target.
enum JobaPalette {
    static let brand = Color(red: 0.10, green: 0.44, blue: 0.83)     // #1a6fd4
    static let ink = Color(red: 0.05, green: 0.12, blue: 0.25)       // #0d1e40
    static let muted = Color(red: 0.29, green: 0.38, blue: 0.51)     // #4b6083
    static let card = Color(red: 1.00, green: 1.00, blue: 1.00)      // #ffffff
    static let track = Color(red: 0.89, green: 0.92, blue: 0.96)     // #e4eaf5
    static let success = Color(red: 0.02, green: 0.59, blue: 0.41)   // #059669
    static let gold = Color(red: 0.72, green: 0.47, blue: 0.02)      // #b87805
}