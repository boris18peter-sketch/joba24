import WidgetKit
import SwiftUI
import ActivityKit

/**
 The widget extension entry point. One widget: the task Live Activity.

 ── WHAT IT DRAWS, AND WHAT IT DOES NOT ─────────────────────────────────────
 It draws exactly what the payload already decided. There is NO logic here that
 reads a task status, resolves a category flow, or picks a Hebrew string — every
 word on the Lock Screen comes from `state.title` / `state.subtitle` /
 `state.stepProgress`, which the backend produced from the same contract the in-app
 banner renders (base44/shared/taskActivitySnapshot.ts). That is what keeps the
 Lock Screen and the app from ever disagreeing.

 ── THE DESIGN IS ActiveTaskBanner's, NOT A SECOND ONE ──────────────────────
 The reference is `src/components/ActiveTaskBanner.jsx`, and this file copies its
 three signature pieces rather than inventing native equivalents:

  1. THE HERO. A rounded square (not a circle), filled with the brand's light
     wash and outlined with its second border, holding the step's own icon in
     brand blue — the banner's `44×44 / radius 14 / --brand-primary-light /
     --border-2` block, scaled to the Lock Screen.
  2. THE 3-STEP RAIL. One circle per flow step, each holding THAT STEP'S icon;
     reached steps are filled brand blue with a white glyph, the current one
     carries the light-blue halo, unreached ones are a plain surface with a hair
     border. The connector fills from the first circle to the current one, which
     is exactly the banner's 16% / 50% / 84% fill.
  3. THE ACTION. One full-width rounded button in the approved green gradient,
     with the SAME icon the in-app button shows for that step.

 ── THE ICONS ARE THE APP'S OWN, PORTED — NOT SF SYMBOLS ────────────────────
 The app draws its icons with lucide (24×24, stroke 2, round caps and joins).
 Those path data are reproduced below (`JobaGlyph`) and stroked with the same
 weight, so the Lock Screen shows the identical shape at any size. No SF Symbol
 stands in for an icon the app already has. A widget extension cannot import the
 web bundle, and an asset catalog would have needed PDF/SVG resources plus a
 Resources phase in a generated project — path data is exact, vector at every
 size, and adds no build plumbing.

 The one SF Symbol left is `arrow.clockwise`, used only to say "this tap did not
 land". It is a state, not an action, and the app has no icon of its own for it.

 ── TWO CONTRAST CONTEXTS, ON PURPOSE ───────────────────────────────────────
  • Lock Screen — a WHITE card with the app's own dark text tokens
    (`--text-1` #0d1e40 / `--text-2` #4b6083), so it reads like the in-app card.
  • Dynamic Island — the system's black surface, so it uses `.primary` /
    `.secondary`, which are light there. Same components, same glyphs, correct
    contrast on each surface. Nothing about the content differs.

 ── RTL ────────────────────────────────────────────────────────────────────
 Joba24 is a Hebrew app, so the whole activity is laid out right-to-left. iOS does
 not inherit the app's direction into an extension, so it is set explicitly on
 both surfaces. Under RTL, `.leading` IS the right edge — that is what the Hebrew
 text is aligned to, and the rail runs right-to-left like the banner's.
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
            LockScreenCard(
                state: context.state,
                taskId: context.attributes.taskId,
                role: context.attributes.role
            )
                .widgetURL(Self.deepLink(for: context))
                // The app's card is white with dark type. Pinned explicitly so
                // the Lock Screen matches that card in BOTH appearances instead
                // of turning into a dark system surface with our dark text on it.
                .environment(\.colorScheme, .light)
                .activityBackgroundTint(JobaPalette.surface)
                .activitySystemActionForegroundColor(JobaPalette.brand)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    IconBubble(state: context.state, size: 34)
                        .padding(.leading, 2)
                        .environment(\.layoutDirection, .rightToLeft)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    StatusChip(state: context.state, onDark: true)
                        .padding(.trailing, 2)
                        .environment(\.layoutDirection, .rightToLeft)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 6) {
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
                            // The same rail, compressed: no per-step labels in the
                            // island (there is no room for them), so the counter
                            // carries the position instead.
                            StepRail(progress: progress, theme: .island, compact: true, showsCounter: false)
                        }
                        // The same button the Lock Screen offers, so the island
                        // can complete the task without opening it — at the
                        // height the expanded island's own fixed bottom region
                        // allows, not the Lock Screen's 56pt, and on one line.
                        TaskActionRow(
                            state: context.state,
                            taskId: context.attributes.taskId,
                            role: context.attributes.role,
                            minHeight: 46,
                            maxLines: 1
                        )
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    // Direction is set on the CONTENT, never on the DynamicIsland
                    // container itself: the `dynamicIsland:` builder must return
                    // the concrete dynamic-island view, so a generic modifier
                    // there would not compile.
                    .environment(\.layoutDirection, .rightToLeft)
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
        }
    }

    /// The tap target: the contract's own deep link, or the app's task link.
    static func deepLink(for context: ActivityViewContext<JobaTaskActivity>) -> URL? {
        if let raw = context.state.deepLink, !raw.isEmpty, let url = URL(string: raw) { return url }
        return URL(string: "https://joba24.com/?open_task=\(context.attributes.taskId)")
    }
}

// MARK: - Lock Screen

/**
 The card itself: the banner's own blocks, stacked for a Lock Screen.

  hero block  →  progress rail  →  the one action. Nothing else, because nothing
  else fits and nothing else is agreed.
 */
struct LockScreenCard: View {
    let state: JobaTaskActivity.ContentState
    /// Only needed to address the action intent at the right activity.
    let taskId: String
    let role: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // ── The banner's status hero ──────────────────────────────────────
            HStack(alignment: .center, spacing: 11) {
                IconBubble(state: state, size: 40)
                VStack(alignment: .leading, spacing: 2) {
                    Text(state.title)
                        .font(.headline.weight(.bold))
                        .foregroundStyle(JobaPalette.text1)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                    if !state.subtitle.isEmpty {
                        Text(state.subtitle)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(JobaPalette.text2)
                            .lineLimit(2)
                            .minimumScaleFactor(0.8)
                    }
                }
                Spacer(minLength: 6)
                StatusChip(state: state, onDark: false)
            }

            // A rail with no current step is a row of empty dashes — the OPEN
            // phase has none, so it is omitted rather than drawn blank.
            if let progress = state.stepProgress, progress.step >= 0 {
                StepRail(progress: progress, theme: .card, compact: false, showsCounter: true)
            }

            // ── The one action this role may take ────────────────────────────
            // Its label is the server's, so it is the same words the banner uses
            // for this category. Absent when the contract offers no action, in
            // which case the card is purely informational.
            TaskActionRow(state: state, taskId: taskId, role: role)
        }
        .padding(.horizontal, 15)
        .padding(.vertical, 13)
        .frame(maxWidth: .infinity, alignment: .leading)
        .environment(\.layoutDirection, .rightToLeft)
        .dynamicTypeSize(.xSmall ... .accessibility1)
    }
}

// MARK: - Progress

/// The colour context a rail is drawn in: the white card, or the black island.
struct RailTheme {
    var track: Color
    var idleBorder: Color
    var idleGlyph: Color
    var label: Color
    var activeLabel: Color

    static let card = RailTheme(
        track: JobaPalette.border2,
        idleBorder: JobaPalette.border,
        idleGlyph: JobaPalette.text3,
        label: JobaPalette.text3,
        activeLabel: JobaPalette.text1
    )

    static let island = RailTheme(
        track: Color.primary.opacity(0.12),
        idleBorder: Color.primary.opacity(0.22),
        idleGlyph: Color.secondary,
        label: Color.secondary,
        activeLabel: Color.primary
    )
}

/**
 The app's own 3-step progress indicator, adapted to the Lock Screen.

 ── WHAT IS COPIED, AND WHAT IS DROPPED ─────────────────────────────────────
 Copied from the banner, unchanged in meaning:
   • one circle per flow step, each holding THAT STEP'S icon (not a dot);
   • reached = filled brand blue with a white glyph and a 2pt brand border;
   • current = the light-blue halo the banner draws with a 4px box-shadow;
   • unreached = plain surface, hair border, muted glyph;
   • the connector fills from the FIRST circle to the CURRENT one (the banner's
     16% / 50% / 84%), so an untouched task shows no line at all;
   • a label under each circle, active heavy in --text-1, reached in --text-1,
     otherwise muted — the same three-state treatment as the banner's labels.

 Dropped: nothing. The labels are kept and allowed to scale down; only the
 Dynamic Island (which truly has no room) hides them and shows the 1/3 counter.

 The connector lives INSIDE each column (a leading and a trailing half-line), so
 every column is the same width by construction — the labels line up under their
 circles without a single magic offset, and the whole thing mirrors correctly
 under RTL because it is an HStack.
 */
struct StepRail: View {
    let progress: JobaTaskActivity.ContentState.StepProgress
    var theme: RailTheme = .card
    var compact: Bool = false
    var showsCounter: Bool = true

    private var diameter: CGFloat { compact ? 20 : 26 }
    private var glyphSize: CGFloat { compact ? 10 : 12 }

    private var currentLabel: String {
        guard progress.steps.indices.contains(progress.step) else { return "" }
        return progress.steps[progress.step].label
    }

    private var counter: String {
        "\(min(progress.step + 1, progress.total))/\(progress.total)"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 0) {
                ForEach(Array(progress.steps.enumerated()), id: \.offset) { index, step in
                    column(index: index, step: step)
                }
            }
            if compact {
                HStack(spacing: 6) {
                    if !currentLabel.isEmpty {
                        Text(currentLabel)
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(JobaPalette.brand)
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                    }
                    Spacer(minLength: 0)
                    if showsCounter {
                        Text(counter)
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(theme.label)
                            .monospacedDigit()
                    }
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(Text(currentLabel))
        .accessibilityValue(Text(counter))
    }

    @ViewBuilder
    private func column(index: Int, step: JobaTaskActivity.ContentState.StepProgress.Step) -> some View {
        let reached = index <= progress.step
        let active = index == progress.step
        VStack(spacing: compact ? 0 : 4) {
            HStack(spacing: 0) {
                halfLine(filled: index > 0 && reached, hidden: index == 0)
                ZStack {
                    Circle()
                        .fill(reached ? JobaPalette.brand : JobaPalette.surface)
                    Circle()
                        .strokeBorder(reached ? JobaPalette.brand : theme.idleBorder, lineWidth: 2)
                    JobaGlyphView(
                        glyph: JobaGlyph.forIconKey(step.icon),
                        size: glyphSize,
                        color: reached ? .white : theme.idleGlyph
                    )
                }
                .frame(width: diameter, height: diameter)
                // The banner's `0 0 0 4px --brand-primary-light` halo. Drawn as an
                // overlay so it never changes the column's width.
                .overlay {
                    if active {
                        Circle()
                            .strokeBorder(JobaPalette.brandLight, lineWidth: 3)
                            .scaleEffect(1.34)
                    }
                }
                halfLine(filled: index < progress.step, hidden: index == progress.steps.count - 1)
            }
            if !compact {
                Text(step.label)
                    .font(.system(size: 10, weight: active ? .heavy : .semibold))
                    .foregroundStyle(reached ? theme.activeLabel : theme.label)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .frame(maxWidth: .infinity)
            }
        }
        .frame(maxWidth: .infinity)
    }

    /// Half of the connector, from the circle's edge towards its neighbour.
    @ViewBuilder
    private func halfLine(filled: Bool, hidden: Bool) -> some View {
        Rectangle()
            .fill(hidden ? Color.clear : (filled ? JobaPalette.brand : theme.track))
            .frame(height: 2)
            .frame(maxWidth: .infinity)
    }
}

// MARK: - Pieces

/**
 The banner's status hero: a rounded square, not a circle.

 `44×44 / border-radius 14 / --brand-primary-light / 1px --border-2` in the app —
 the same proportions here at any size, holding the step's own icon in brand blue,
 or in success green once the work is finished (`colorKey`/`phase` carry that
 decision from the contract; the widget does not re-derive it).
 */
struct IconBubble: View {
    let state: JobaTaskActivity.ContentState
    var size: CGFloat = 40

    private var tint: Color {
        if state.colorKey == "success" { return JobaPalette.success }
        if state.phase == "done" || state.phase == "terminal" { return JobaPalette.success }
        return JobaPalette.brand
    }

    var body: some View {
        let radius = size * (14.0 / 44.0)
        ZStack {
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .fill(JobaPalette.brandLight)
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .strokeBorder(JobaPalette.border2, lineWidth: 1)
            JobaGlyphView(
                glyph: JobaGlyph.forIconKey(state.iconKey),
                // 22px icon in a 44px bubble in the app, proportionally here.
                size: size * 0.5,
                color: tint
            )
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

/// The one number that matters beside the status: applicants while the task is
/// open, otherwise the flow position. Same two pills the banner's header shows.
struct StatusChip: View {
    let state: JobaTaskActivity.ContentState
    var onDark: Bool = false

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
                .background(
                    Capsule(style: .continuous)
                        .fill(onDark ? JobaPalette.brand.opacity(0.22) : JobaPalette.brandLight)
                )
                .overlay(
                    Capsule(style: .continuous)
                        .strokeBorder(JobaPalette.brand.opacity(onDark ? 0 : 0.18), lineWidth: 1)
                )
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
                .foregroundStyle(JobaPalette.accent)
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
            JobaGlyphView(glyph: .person, size: 10, color: JobaPalette.accent)
            Text("\(count)")
                .font(.caption2.weight(.heavy))
                .monospacedDigit()
                .foregroundStyle(JobaPalette.accent)
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(Capsule(style: .continuous).fill(JobaPalette.accent.opacity(0.16)))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text("\(count)"))
    }
}

// MARK: - Action

/**
 The Lock Screen action: the banner's primary button, moved onto the Lock Screen.

 ── IT IS THE APP'S BUTTON ──────────────────────────────────────────────────
 Full width, 14pt radius, and the approved green gradient
 (`linear-gradient(135deg,#059669,#047857)`), with the icon the in-app button
 shows for the same step — Navigation to set out, MapPin on arrival, CheckCircle
 to finish and to approve (`getQuickAction` in ActiveTaskBanner). The glyph is the
 real lucide shape, not an SF Symbol. It is deliberately the largest thing on the
 card — a 56pt floor on the Lock Screen — because it is the one thing the user
 came to the Lock Screen to press. The expanded Dynamic Island is a fixed, much
 tighter box, so it passes its own height instead of inheriting 56pt.

 ── IT DRAWS FOUR STATES, AND INVENTS NONE OF THEIR WORDS ───────────────────
  • idle / confirm — the contract's own label; `confirm` adds the contract's own
    confirmation sentence above it when the action is irreversible.
  • pending — the same label with a spinner, and the button disabled, so a second
    tap cannot be queued behind the first.
  • failed — a retry glyph. No sentence is invented: the card still carries the
    last confirmed content, and the glyph says this tap did not land.
    (`arrow.clockwise` is a STATE glyph; the app has no icon of its own for it.)

 Below iOS 17 a Live Activity has no interactive controls, so nothing is drawn:
 a button that did nothing would be worse than no button. The card's own tap
 (widgetURL) still opens the task, which is where the action lives in the app.
 */
struct TaskActionRow: View {
    let state: JobaTaskActivity.ContentState
    let taskId: String
    let role: String
    /// The height floor this surface can give the button. The Lock Screen gives
    /// it a generous 56pt; the expanded Dynamic Island passes its own tighter
    /// value rather than forcing the Lock Screen's height into a fixed box.
    /// It is a FLOOR, never a cap — see `label(for:)`.
    var minHeight: CGFloat = 56
    /// One line in the island (there is no room for two), up to two on the Lock
    /// Screen, so a long category-specific label wraps instead of truncating.
    var maxLines: Int = 2

    private var action: JobaTaskActivity.ContentState.Action? {
        guard let value = state.action, !value.id.isEmpty, !value.label.isEmpty else { return nil }
        return value
    }

    private var isPending: Bool { state.actionState == "pending" }
    private var isFailed: Bool { state.actionState == "failed" }

    var body: some View {
        if let action = action {
            VStack(alignment: .leading, spacing: 6) {
                if state.actionState == "confirm", let confirm = action.confirm, !confirm.isEmpty {
                    Text(confirm)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(JobaPalette.text2)
                        .lineLimit(2)
                        .minimumScaleFactor(0.85)
                }
                if #available(iOS 17.0, *) {
                    Button(intent: JobaTaskActionIntent(
                        taskId: taskId,
                        role: role,
                        actionId: action.id,
                        expectedStep: action.step
                    )) {
                        label(for: action)
                    }
                    .buttonStyle(.plain)
                    .disabled(isPending)
                    .accessibilityLabel(Text(action.label))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    @ViewBuilder
    private func label(for action: JobaTaskActivity.ContentState.Action) -> some View {
        HStack(spacing: 8) {
            if isPending {
                ProgressView()
                    .controlSize(.small)
                    .tint(.white)
            } else if isFailed {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
            } else {
                JobaGlyphView(
                    glyph: JobaGlyph.forActionStep(action.step),
                    size: 18,
                    color: .white
                )
            }
            Text(action.label)
                .font(.subheadline.weight(.heavy))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .lineLimit(maxLines)
                .minimumScaleFactor(0.7)
                // Take the height the words actually need, so a wrapped label is
                // drawn in full rather than squeezed into one clipped line.
                .fixedSize(horizontal: false, vertical: true)
        }
        // Inset FIRST, then apply the height floor: the words never reach the
        // rounded edge, and `minHeight` stays a minimum — a two-line label makes
        // the button taller instead of overflowing it.
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, minHeight: minHeight)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [JobaPalette.success, JobaPalette.successDark],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .opacity(isPending ? 0.55 : 1)
        )
        .shadow(color: JobaPalette.success.opacity(isPending ? 0 : 0.28), radius: 8, x: 0, y: 4)
        .contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

// MARK: - Palette

/**
 The app's own tokens, copied from `src/index.css` — not new brand colours.

 Text colours are here (unlike before) because the card is pinned WHITE: semantic
 `.primary` / `.secondary` would turn white-on-white in dark appearance. The
 Dynamic Island keeps the semantic colours, since its own surface is black.
 */
enum JobaPalette {
    static let surface = Color(red: 1.00, green: 1.00, blue: 1.00)          // --surface-2
    static let brand = Color(red: 0.10, green: 0.44, blue: 0.83)            // #1a6fd4
    static let brandLight = Color(red: 0.94, green: 0.96, blue: 1.00)       // #eff6ff
    static let success = Color(red: 0.02, green: 0.59, blue: 0.41)          // #059669
    static let successDark = Color(red: 0.02, green: 0.47, blue: 0.34)      // #047857
    static let accent = Color(red: 0.85, green: 0.47, blue: 0.02)           // #d97706
    static let text1 = Color(red: 0.05, green: 0.12, blue: 0.25)            // #0d1e40
    static let text2 = Color(red: 0.29, green: 0.38, blue: 0.51)            // #4b6083
    static let text3 = Color(red: 0.58, green: 0.64, blue: 0.72)            // #94a3b8
    static let border = Color(red: 0.89, green: 0.92, blue: 0.96)           // #e4eaf5
    static let border2 = Color(red: 0.83, green: 0.89, blue: 0.96)          // #d4e2f5
}

// MARK: - App glyphs (lucide, ported)
/*
 The icons the in-app task screens use, drawn from lucide's own path data:
 `Navigation`, `MapPin`, `CheckCircle`, `Package`, `Truck`, `Heart`, `BookOpen`,
 `Camera`, `Calendar` (see ICON_MAP in src/components/ActiveTaskBanner.jsx), plus
 the person glyph for the applicant count.

 Same 24×24 box, same stroke weight (2), same round caps and joins, so the shape
 on the Lock Screen IS the shape in the app at every size. Arcs and circles have
 been pre-flattened to cubics; coordinates are unchanged from the source.
 */
enum JobaGlyph {
    case navigation, map_pin, check, package, truck, heart, book, camera, calendar, person

    /// The step's own icon key, exactly as the banner resolves it:
    /// `ICON_MAP[step.icon] || Navigation`, plus `calendar` for an engagement.
    static func forIconKey(_ key: String?) -> JobaGlyph {
        // `?? ""` so the switch is over a plain String: an absent key falls to
        // `default`, which is the banner's own `|| Navigation`.
        switch key ?? "" {
        case "navigation": return .navigation
        case "map_pin": return .map_pin
        case "check": return .check
        case "package": return .package
        case "truck": return .truck
        case "heart": return .heart
        case "book": return .book
        case "camera": return .camera
        case "calendar": return .calendar
        case "person": return .person
        default: return .navigation
        }
    }

    /// The in-app button's icon, from `getQuickAction` in ActiveTaskBanner:
    /// on_the_way → Navigation, arrived → MapPin, everything else → CheckCircle.
    static func forActionStep(_ step: String) -> JobaGlyph {
        switch step {
        case "on_the_way": return .navigation
        case "arrived": return .map_pin
        default: return .check
        }
    }
}

fileprivate enum JobaGlyphCommand {
    case move(CGFloat, CGFloat)
    case line(CGFloat, CGFloat)
    case cubic(CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat)
    case close
}

fileprivate extension JobaGlyph {
    var commands: [JobaGlyphCommand] {
        switch self {
        case .navigation:
            return [
                .move(3, 11),
                .line(22, 2),
                .line(13, 21),
                .line(11, 13),
                .line(3, 11),
                .close,
            ]
        case .map_pin:
            return [
                .move(20, 10),
                .cubic(20, 14.993, 14.461, 20.193, 12.601, 21.799),
                .cubic(12.245, 22.067, 11.755, 22.067, 11.399, 21.799),
                .cubic(9.539, 20.193, 4, 14.993, 4, 10),
                .cubic(4, 5.582, 7.582, 2, 12, 2),
                .cubic(16.418, 2, 20, 5.582, 20, 10),
                .move(15, 10),
                .cubic(15, 11.657, 13.657, 13, 12, 13),
                .cubic(10.343, 13, 9, 11.657, 9, 10),
                .cubic(9, 8.343, 10.343, 7, 12, 7),
                .cubic(13.657, 7, 15, 8.343, 15, 10),
                .close,
            ]
        case .check:
            return [
                .move(21.801, 10),
                .cubic(22.742, 14.619, 20.33, 19.267, 16.013, 21.157),
                .cubic(11.695, 23.047, 6.643, 21.666, 3.888, 17.841),
                .cubic(1.133, 14.017, 1.423, 8.788, 4.584, 5.291),
                .cubic(7.744, 1.794, 12.917, 0.979, 17, 3.335),
                .move(9, 11),
                .line(12, 14),
                .line(22, 4),
            ]
        case .package:
            return [
                .move(11, 21.73),
                .cubic(11.619, 22.087, 12.381, 22.087, 13, 21.73),
                .line(20, 17.73),
                .cubic(20.618, 17.373, 20.999, 16.714, 21, 16),
                .line(21, 8),
                .cubic(20.999, 7.286, 20.618, 6.627, 20, 6.27),
                .line(13, 2.27),
                .cubic(12.381, 1.913, 11.619, 1.913, 11, 2.27),
                .line(4, 6.27),
                .cubic(3.382, 6.627, 3.001, 7.286, 3, 8),
                .line(3, 16),
                .cubic(3.001, 16.714, 3.382, 17.373, 4, 17.73),
                .close,
                .move(12, 22),
                .line(12, 12),
                .move(3.29, 7),
                .line(12, 12),
                .line(20.71, 7),
                .move(7.5, 4.27),
                .line(16.5, 9.42),
            ]
        case .truck:
            return [
                .move(14, 18),
                .line(14, 6),
                .cubic(14, 4.895, 13.105, 4, 12, 4),
                .line(4, 4),
                .cubic(2.895, 4, 2, 4.895, 2, 6),
                .line(2, 17),
                .cubic(2, 17.552, 2.448, 18, 3, 18),
                .line(5, 18),
                .move(15, 18),
                .line(9, 18),
                .move(19, 18),
                .line(21, 18),
                .cubic(21.552, 18, 22, 17.552, 22, 17),
                .line(22, 13.35),
                .cubic(22, 13.123, 21.922, 12.903, 21.78, 12.726),
                .line(18.3, 8.376),
                .cubic(18.111, 8.139, 17.824, 8, 17.52, 8),
                .line(14, 8),
                .move(19, 18),
                .cubic(19, 19.105, 18.105, 20, 17, 20),
                .cubic(15.895, 20, 15, 19.105, 15, 18),
                .cubic(15, 16.895, 15.895, 16, 17, 16),
                .cubic(18.105, 16, 19, 16.895, 19, 18),
                .close,
                .move(9, 18),
                .cubic(9, 19.105, 8.105, 20, 7, 20),
                .cubic(5.895, 20, 5, 19.105, 5, 18),
                .cubic(5, 16.895, 5.895, 16, 7, 16),
                .cubic(8.105, 16, 9, 16.895, 9, 18),
                .close,
            ]
        case .heart:
            return [
                .move(19, 14),
                .cubic(20.49, 12.54, 22, 10.79, 22, 8.5),
                .cubic(22, 5.462, 19.538, 3, 16.5, 3),
                .cubic(14.74, 3, 13.5, 3.5, 12, 5),
                .cubic(10.5, 3.5, 9.26, 3, 7.5, 3),
                .cubic(4.462, 3, 2, 5.462, 2, 8.5),
                .cubic(2, 10.8, 3.5, 12.55, 5, 14),
                .line(12, 21),
                .close,
            ]
        case .book:
            return [
                .move(12, 7),
                .line(12, 21),
                .move(3, 18),
                .cubic(2.448, 18, 2, 17.552, 2, 17),
                .line(2, 4),
                .cubic(2, 3.448, 2.448, 3, 3, 3),
                .line(8, 3),
                .cubic(10.209, 3, 12, 4.791, 12, 7),
                .cubic(12, 4.791, 13.791, 3, 16, 3),
                .line(21, 3),
                .cubic(21.552, 3, 22, 3.448, 22, 4),
                .line(22, 17),
                .cubic(22, 17.552, 21.552, 18, 21, 18),
                .line(15, 18),
                .cubic(13.343, 18, 12, 19.343, 12, 21),
                .cubic(12, 19.343, 10.657, 18, 9, 18),
                .close,
            ]
        case .camera:
            return [
                .move(14.5, 4),
                .line(9.5, 4),
                .line(7, 7),
                .line(4, 7),
                .cubic(2.895, 7, 2, 7.895, 2, 9),
                .line(2, 18),
                .cubic(2, 19.105, 2.895, 20, 4, 20),
                .line(20, 20),
                .cubic(21.105, 20, 22, 19.105, 22, 18),
                .line(22, 9),
                .cubic(22, 7.895, 21.105, 7, 20, 7),
                .line(17, 7),
                .line(14.5, 4),
                .close,
                .move(15, 13),
                .cubic(15, 14.657, 13.657, 16, 12, 16),
                .cubic(10.343, 16, 9, 14.657, 9, 13),
                .cubic(9, 11.343, 10.343, 10, 12, 10),
                .cubic(13.657, 10, 15, 11.343, 15, 13),
                .close,
            ]
        case .calendar:
            return [
                .move(8, 2),
                .line(8, 6),
                .move(16, 2),
                .line(16, 6),
                .move(5, 4),
                .line(19, 4),
                .cubic(20.105, 4, 21, 4.895, 21, 6),
                .line(21, 20),
                .cubic(21, 21.105, 20.105, 22, 19, 22),
                .line(5, 22),
                .cubic(3.895, 22, 3, 21.105, 3, 20),
                .line(3, 6),
                .cubic(3, 4.895, 3.895, 4, 5, 4),
                .close,
                .move(3, 10),
                .line(21, 10),
            ]
        // lucide `user-round`, for the applicant count.
        case .person:
            return [
                .move(12, 8),
                .cubic(12, 10.209, 10.209, 12, 8, 12),
                .cubic(5.791, 12, 4, 10.209, 4, 8),
                .cubic(4, 5.791, 5.791, 4, 8, 4),
                .cubic(10.209, 4, 12, 5.791, 12, 8),
                .close,
                .move(4, 20),
                .cubic(4, 17.239, 6.239, 15, 9, 15),
                .cubic(11.761, 15, 14, 17.239, 14, 20),
            ]
        }
    }
}

/// Draws a glyph in its native 24×24 space, centred and scaled into `rect`.
struct JobaGlyphShape: Shape {
    let glyph: JobaGlyph

    func path(in rect: CGRect) -> Path {
        var path = Path()
        for command in glyph.commands {
            switch command {
            case let .move(x, y):
                path.move(to: CGPoint(x: x, y: y))
            case let .line(x, y):
                path.addLine(to: CGPoint(x: x, y: y))
            case let .cubic(x1, y1, x2, y2, x, y):
                path.addCurve(
                    to: CGPoint(x: x, y: y),
                    control1: CGPoint(x: x1, y: y1),
                    control2: CGPoint(x: x2, y: y2)
                )
            case .close:
                path.closeSubpath()
            }
        }
        let side = min(rect.width, rect.height)
        let scale = side / 24
        let transform = CGAffineTransform(scaleX: scale, y: scale)
            .concatenating(
                CGAffineTransform(
                    translationX: rect.midX - 12 * scale,
                    y: rect.midY - 12 * scale
                )
            )
        return path.applying(transform)
    }
}

/// One app glyph, stroked with lucide's own weight (2 in a 24pt box).
struct JobaGlyphView: View {
    let glyph: JobaGlyph
    var size: CGFloat
    var color: Color

    var body: some View {
        JobaGlyphShape(glyph: glyph)
            .stroke(
                color,
                style: StrokeStyle(
                    lineWidth: max(0.9, size * 2 / 24),
                    lineCap: .round,
                    lineJoin: .round
                )
            )
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}