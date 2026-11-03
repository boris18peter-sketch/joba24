import WidgetKit
import SwiftUI
import ActivityKit

/**
 The widget extension entry point. One widget: the task Live Activity.

 ── WHAT IT DRAWS, AND WHAT IT DOES NOT ─────────────────────────────────────
 It draws exactly what the payload already decided. There is NO logic here that
 reads a task status, resolves a category flow, or picks a Hebrew string — every
 word on the Lock Screen comes from `state.title` / `state.subtitle` /
 `state.stepProgress`, which the backend produced from the same contract the
 in-app banner renders (base44/shared/taskActivitySnapshot.ts). That is what
 keeps the Lock Screen and the app from ever disagreeing.

 ── DESIGN SYSTEM ───────────────────────────────────────────────────────────
 Blue and white, the app's own brand blue (#1a6fd4) as the single accent, on the
 system Live Activity material. Nothing is force-tinted, so light and dark
 appearances both keep full contrast; text uses `.primary` / `.secondary`, which
 adapt automatically, and the blue stays legible on both.

 Type uses system text styles only (.headline / .caption / .caption2), so the card
 follows Dynamic Type, bounded to a range that still fits the Lock Screen.

 ── RTL ────────────────────────────────────────────────────────────────────
 Joba24 is a Hebrew app, so the whole activity is laid out right-to-left. iOS does
 not inherit the app's direction into an extension, so it is set explicitly on
 both surfaces. Under RTL, `.leading` IS the right edge — that is what the Hebrew
 text is aligned to.
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
                .activitySystemActionForegroundColor(JobaPalette.brand)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    IconBubble(state: context.state, size: 28)
                        .padding(.leading, 2)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    StatusChip(state: context.state)
                        .padding(.trailing, 2)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text(context.state.title)
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(.primary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                        if !context.state.subtitle.isEmpty {
                            Text(context.state.subtitle)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                        }
                        if let progress = context.state.stepProgress, progress.step >= 0 {
                            StepRail(progress: progress, showsCounter: false)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } compactLeading: {
                IconBubble(state: context.state, size: 26)
            } compactTrailing: {
                // Numbers only — never a phase name. The compact slot is a few
                // points wide, and a raw contract phase would truncate there.
                CompactStatus(state: context.state)
            } minimal: {
                IconBubble(state: context.state, size: 24)
            }
            .keylineTint(JobaPalette.brand)
            .environment(\.layoutDirection, .rightToLeft)
        }
    }

    /// The tap target: the contract's own deep link, or the app's task link.
    static func deepLink(for context: ActivityViewContext<JobaTaskActivity>) -> URL? {
        if let raw = context.state.deepLink, !raw.isEmpty, let url = URL(string: raw) { return url }
        return URL(string: "https://joba24.com/?open_task=\(context.attributes.taskId)")
    }
}

// MARK: - Lock Screen

struct LockScreenCard: View {
    let state: JobaTaskActivity.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(alignment: .center, spacing: 11) {
                IconBubble(state: state, size: 34)
                VStack(alignment: .leading, spacing: 2) {
                    Text(state.title)
                        .font(.headline.weight(.bold))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                    if !state.subtitle.isEmpty {
                        Text(state.subtitle)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                            .minimumScaleFactor(0.8)
                    }
                }
                Spacer(minLength: 6)
                StatusChip(state: state)
            }

            // A rail with no current step is a row of empty dashes — the OPEN
            // phase has none, so it is omitted rather than drawn blank.
            if let progress = state.stepProgress, progress.step >= 0 {
                StepRail(progress: progress, showsCounter: true)
            }
        }
        .padding(.horizontal, 15)
        .padding(.vertical, 13)
        .frame(maxWidth: .infinity, alignment: .leading)
        .environment(\.layoutDirection, .rightToLeft)
        .dynamicTypeSize(.xSmall ... .accessibility1)
    }
}

// MARK: - Progress

/**
 The app's own flow, compressed for a Lock Screen: one capsule per canonical step,
 the current step's real label beside them.

 Deliberately NOT a percentage bar: the flow has three named steps and the user
 needs to know WHICH one, not how far along an abstract line they are.
 */
struct StepRail: View {
    let progress: JobaTaskActivity.ContentState.StepProgress
    var showsCounter: Bool = true

    private var currentLabel: String {
        guard progress.steps.indices.contains(progress.step) else { return "" }
        return progress.steps[progress.step].label
    }

    private var counter: String {
        "\(min(progress.step + 1, progress.total))/\(progress.total)"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 5) {
                ForEach(Array(progress.steps.enumerated()), id: \.offset) { index, _ in
                    Capsule(style: .continuous)
                        .fill(index <= progress.step
                              ? JobaPalette.brand
                              : Color.primary.opacity(0.12))
                        .frame(height: 4)
                }
            }
            HStack(spacing: 6) {
                if !currentLabel.isEmpty {
                    Text(currentLabel)
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(JobaPalette.brand)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                Spacer(minLength: 0)
                if showsCounter {
                    Text(counter)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(Text(currentLabel))
        .accessibilityValue(Text(counter))
    }
}

// MARK: - Pieces

/// The brand bubble: the step's own icon on a soft wash of its own colour.
struct IconBubble: View {
    let state: JobaTaskActivity.ContentState
    var size: CGFloat = 30

    /// Success green once the work is finished; brand blue everywhere else. The
    /// contract's `colorKey` already carries that decision for a live step.
    private var tint: Color {
        if state.colorKey == "success" { return JobaPalette.success }
        if state.phase == "done" || state.phase == "terminal" { return JobaPalette.success }
        return JobaPalette.brand
    }

    /// The contract's icon keys, mapped to SF Symbols. Every key the catalogue
    /// can emit is covered, and an unknown one falls back to a glyph rather than
    /// to nothing, so the bubble is never empty.
    private var symbol: String {
        switch state.iconKey {
        case "calendar": return "calendar"
        case "check": return "checkmark.circle.fill"
        case "navigation": return state.phase == "open" ? "dot.radiowaves.left.and.right" : "location.north.fill"
        case "map_pin": return "mappin.and.ellipse"
        case "truck": return "shippingbox.fill"
        case "heart": return "heart.fill"
        case "clock": return "clock.fill"
        case "star": return "star.fill"
        case "person": return "person.fill"
        default: return state.phase == "open" ? "dot.radiowaves.left.and.right" : "clock.fill"
        }
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(tint.opacity(0.14))
                .frame(width: size, height: size)
            Image(systemName: symbol)
                .font(.system(size: size * 0.45, weight: .bold))
                .foregroundStyle(tint)
        }
        .accessibilityHidden(true)
    }
}

/// The one number that matters beside the status: applicants while the task is
/// open, otherwise the flow position.
struct StatusChip: View {
    let state: JobaTaskActivity.ContentState

    var body: some View {
        if let count = state.counters?.applicants, count > 0, state.phase == "open" {
            ApplicantPill(count: count)
        } else if let progress = state.stepProgress, progress.step >= 0, progress.total > 0 {
            Text("\(min(progress.step + 1, progress.total))/\(progress.total)")
                .font(.caption.weight(.heavy))
                .monospacedDigit()
                .foregroundStyle(JobaPalette.brand)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Capsule(style: .continuous).fill(JobaPalette.brand.opacity(0.12)))
        }
    }
}

/// The compact slot: digits only, so nothing can truncate or read as a status.
struct CompactStatus: View {
    let state: JobaTaskActivity.ContentState

    var body: some View {
        if let count = state.counters?.applicants, count > 0, state.phase == "open" {
            Text("\(count)")
                .font(.caption2.weight(.heavy))
                .monospacedDigit()
                .foregroundStyle(JobaPalette.gold)
        } else if let progress = state.stepProgress, progress.step >= 0, progress.total > 0 {
            Text("\(min(progress.step + 1, progress.total))/\(progress.total)")
                .font(.caption2.weight(.heavy))
                .monospacedDigit()
                .foregroundStyle(JobaPalette.brand)
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
                .monospacedDigit()
        }
        .foregroundStyle(JobaPalette.gold)
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(Capsule(style: .continuous).fill(JobaPalette.gold.opacity(0.16)))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text("\(count)"))
    }
}

// MARK: - Palette

/// The app's own brand values as plain sRGB, so the extension needs no asset
/// catalog and no shared bundle — it stays a self-contained target. Text colours
/// are NOT here on purpose: they use SwiftUI's semantic `.primary` / `.secondary`
/// so they stay correct in light and dark.
enum JobaPalette {
    static let brand = Color(red: 0.10, green: 0.44, blue: 0.83)     // #1a6fd4
    static let success = Color(red: 0.02, green: 0.59, blue: 0.41)   // #059669
    static let gold = Color(red: 0.72, green: 0.47, blue: 0.02)      // #b87805
}