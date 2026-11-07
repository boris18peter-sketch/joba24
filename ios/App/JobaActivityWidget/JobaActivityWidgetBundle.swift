import WidgetKit
import SwiftUI
import ActivityKit
import UIKit

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
        // Spacing trimmed by three points in total, which is exactly the height
        // the larger rail adds: the card grew where readability needed it and
        // nowhere else, so it still fits the height iOS gives a Lock Screen card
        // on the smallest iPhone.
        VStack(alignment: .leading, spacing: 9) {
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
                // ── THE BRAND'S OWN MARK, AT THE CARD'S FAR EDGE ────────────
                // A small, rounded rendition of the app icon — the same artwork
                // the phone's home screen shows, so the card is recognisably
                // Joba24 at a glance. Deliberately small and quiet: it signs the
                // card, it does not compete with the status or the action.
                HStack(spacing: 8) {
                    StatusChip(state: state, onDark: false)
                    // The official mark, sized so it reads as the app's own
                    // signature at arm's length rather than as a detail.
                    JobaBrandMark(size: 24)
                }
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
        .padding(.vertical, 11)
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

    // ── SIZED FOR AN iPHONE, NOT FOR A SCREENSHOT ───────────────────────────
    // The first version was drawn at 26pt circles holding 12pt glyphs under
    // 10pt labels. At tile size on a Mac it looked right; held in the hand, at
    // arm's length, in Hebrew, the three steps read as one grey smear — on the
    // single element the card exists to show. These are the smallest values
    // that stay legible at that distance: a 30pt circle, an 18pt glyph (75% of
    // lucide's 24pt box, where the shapes still hold), and an 11.5pt semibold
    // label, the size iOS uses for its own Lock Screen detail text.
    //
    // The island keeps its compressed rail on purpose: it is a fixed box, read
    // as a position counter rather than as a flow, and its own counter line
    // carries the wording there.
    private var baseDiameter: CGFloat { compact ? 20 : 30 }
    private var glyphSize: CGFloat { compact ? 10 : 18 }
    /// The label under a step — iOS' own weight for detail text.
    private var labelSize: CGFloat { 11.5 }

    private var currentLabel: String {
        guard progress.steps.indices.contains(progress.step) else { return "" }
        return progress.steps[progress.step].label
    }

    private var counter: String {
        "\(min(progress.step + 1, progress.total))/\(progress.total)"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            // ── THE RAIL IS SIZED FROM ITS OWN BOX, SO IT CANNOT BREAK ───────
            // Each step owns an equal slot and the circle is derived FROM that
            // slot instead of being a fixed 30pt. A flow with four or five steps,
            // a long category label, or a large Dynamic Type setting could each
            // push a fixed-width row past the card's edge — the circles then
            // overlapped, the connector was cut and the last step fell outside the
            // card. Bounded by its slot, the widest thing in the rail is always
            // something that fits in it, whatever the step count.
            GeometryReader { geo in
                let count = max(progress.steps.count, 1)
                let slot = geo.size.width / CGFloat(count)
                // 0.52 keeps a visible gap between two neighbouring circles;
                // 16pt is the floor at which the glyph is still recognisable.
                let circle = min(baseDiameter, max(16, slot * 0.52))
                HStack(spacing: 0) {
                    ForEach(Array(progress.steps.enumerated()), id: \.offset) { index, step in
                        column(
                            index: index,
                            step: step,
                            circle: circle,
                            glyphSide: min(glyphSize, circle * 0.6)
                        )
                    }
                }
            }
            // Declared here so the GeometryReader never takes height from the
            // label row or the button below it.
            .frame(height: baseDiameter + 6)
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
    private func column(
        index: Int,
        step: JobaTaskActivity.ContentState.StepProgress.Step,
        circle: CGFloat,
        glyphSide: CGFloat
    ) -> some View {
        let reached = index <= progress.step
        let active = index == progress.step
        // More air between a circle and its label than before: the label is
        // bigger now, and a hairline gap made the two fight each other.
        VStack(spacing: compact ? 0 : 5) {
            HStack(spacing: 0) {
                halfLine(filled: index > 0 && reached, hidden: index == 0)
                ZStack {
                    Circle()
                        .fill(reached ? JobaPalette.brand : JobaPalette.surface)
                    Circle()
                        .strokeBorder(reached ? JobaPalette.brand : theme.idleBorder, lineWidth: 2)
                    JobaGlyphView(
                        glyph: JobaGlyph.forIconKey(step.icon),
                        size: glyphSide,
                        color: reached ? .white : theme.idleGlyph
                    )
                }
                .frame(width: circle, height: circle)
                // The banner's `0 0 0 4px --brand-primary-light` halo: a ring just
                // OUTSIDE the circle, never a 1.34 scale. Scaling made the halo
                // reach into the neighbouring slot, where it sat on top of the next
                // circle's connector and read as a broken rail.
                .overlay {
                    if active {
                        Circle()
                            .strokeBorder(JobaPalette.brandLight, lineWidth: 3)
                            .padding(-3)
                    }
                }
                halfLine(filled: index < progress.step, hidden: index == progress.steps.count - 1)
            }
            if !compact {
                // ── THREE STATES THE EYE CAN TELL APART WITHOUT READING ─────
                //  • current  — brand blue and the heaviest weight, and the only
                //    label that is not grey, so the eye lands where the work is
                //    now (the banner's own brand blue, --brand-primary);
                //  • reached  — the card's primary text colour: done;
                //  • upcoming — muted, plainly still ahead.
                // One line, scaling to 80% only as a last resort, so a long
                // category label never wraps into the row below it.
                Text(step.label)
                    .font(.system(size: labelSize, weight: active ? .heavy : .semibold))
                    .foregroundStyle(active ? JobaPalette.brand : (reached ? theme.activeLabel : theme.label))
                    // ── ONE LINE, ENDING IN DOTS ────────────────────────────────
                    // A long label must never wrap (a second line pushes the button
                    // out of the card) and must never widen its column (that is what
                    // broke the rail). It scales down a little, then truncates with
                    // an ellipsis — the app's own "there is more text here" cue.
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .allowsTightening(true)
                    .minimumScaleFactor(0.65)
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

 ── IT DRAWS FIVE STATES, AND INVENTS NONE OF THEIR WORDS ───────────────────
  • idle / confirm — the contract's own label; `confirm` adds the contract's own
    confirmation sentence above it when the action is irreversible.
  • pending — the same label with a spinner, and the button disabled, so a second
    tap cannot be queued behind the first.
  • failed — a retry glyph. No sentence is invented: the card still carries the
    last confirmed content, and the glyph says this tap did not land.
    (`arrow.clockwise` is a STATE glyph; the app has no icon of its own for it.)
  • expired capability — the SAME button and the SAME label, but it is a link that
    opens the task in the app. A capability the app can no longer renew (it has not
    run for longer than the capability's life) cannot perform anything from the
    widget, so the card routes the tap somewhere it CAN be completed instead of
    offering a button whose only outcome is "failed".

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

    /// Where the fallback goes: the task, in the app — the same destination the
    /// card's own tap already uses (`widgetURL`), never a new route.
    private var openInAppURL: URL? {
        if let raw = state.deepLink, !raw.isEmpty, let url = URL(string: raw) { return url }
        return URL(string: "https://joba24.com/?open_task=\(taskId)")
    }

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
                    // ── CAN THIS TAP WORK AT ALL? ────────────────────────────
                    // The capability the intent would send expires on the server's
                    // clock, and it can only be renewed by the app. When it has
                    // already expired — the app has not been opened for a while —
                    // a Button could do nothing but fail after a round trip. So the
                    // SAME button becomes a link to the task in the app, which mints
                    // a fresh capability and offers the action there. The label is
                    // unchanged: the card never invents wording, it only changes
                    // where the tap goes.
                    if JobaActivityAuthStore.canAct(taskId: taskId, role: role) {
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
                    } else if let url = openInAppURL {
                        Link(destination: url) {
                            label(for: action)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(Text(action.label))
                    }
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

// MARK: - Brand mark

/**
 The official Joba24 logo, drawn on the card.

 ── WHY THE BYTES ARE BAKED IN ──────────────────────────────────────────────
 A widget extension cannot read the app's asset catalog, and adding a second
 catalog to a project whose widget target is generated at build time would have
 meant hand-surgery on the Xcode project for a 20pt mark. Instead the icon's own
 PNG is encoded into this file by `scripts/patch-ios-live-activity.py` — the same
 script that builds the widget target — from the COMMITTED app icon, so there is
 one source of truth for the artwork and nothing is re-drawn by hand.

 The block below is regenerated on every iOS build; it is empty in a checkout
 that has not been patched (a plain Xcode run, a preview), which is why the view
 has a quiet fallback instead of a hole.
 */
enum JobaBrandMarkSource {
    // >>> joba24-widget-logo (generated from the app icon — do not edit)
    static let pngBase64 = """
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
z3sQrzeBcwvxyZlwZlNiw3DyyhLmjw2WR7tsjzarHnzJiPvM4h5B3MGJu1lxMyHuIsXdlPiTTPyFR4fU4hGbeNyFziaJp1Mf7gq6
86Gi7E36zyWEuJNEx43oUiK6ni8NMEuLUGnXY2tbmC2+J2Y8azXZT16zi8JqqSJrVzWwW2UM+3pp59Kdjcq2pV/5h+LSUvrUXLh9
FFzQHO6bn3rmw6Ttw4lZ2WBgIj6zOfXjZO7mCuWDdfyfK+gHXzPidk7cJhO30+IGQtxCittIcRcl7qal1P2LrmKX8cEm3clZ8nMT
yYcbVeJRp7hXjnbT/sI7DV1tIHVOZZ3R9Q5nvi80mYKfqLdqQfUGai+yRr35GPjZKeInaLnqLs4TFh7143fdfvmswaS+Cd+PwE+9
S33/mmZIvj4zypqeFu8L8zmCzA6LyWk2BVtMmRGm11vr904kr8/H739M/vENK+7g0TZWXItXbMAr1uLiWlxcBytW4w+/I04u4ua8
pB6dbZn2sm/i6Jyp43PmTqmzcm7kjlWZxUcLUVkrVNrizt7UazszrmxvqTV4nxvPT3VRvPdpYFrqez0vZA5ge3He069r40s7i76b
4WnWa2RaYqTTHQxZAyFTqzkuSMN51KRLAU0sUFI4TZA4yTK8LjwsakB++E/jubJ5+J+rZOJGQtyAi1uIijXw4Uq8eAkxtbMiymeS
yY0sI9iVXIxR1rqOY0Db9HS30qOVC3K9XOOISwyfOSFx5ZSoD2Y3Rzf6DilKwmr68ezwpoaqi02sRrp6MW1lycGpgycOL7i+p/Wu
OdairkW03CBXGnFaFaaFwUqgkAtqhVIhIxUUVFNAQQIGBySEFI5TtBAaHDL9JePQFkLzDHWzTPOgzhFzh9k/Hq4NsuhpmYLGCYHA
PHIQrwUpBklxOhiqggk60D4EJJhlBKvXGJyC2vaPdzPR9Ze+mpXJqp5v8pND2urCC6uKZ+8zg97ageW6kC8WF5VszTq33Lpllo3i
tIDWCgwbrsG8SkyhNmnNHl6hJSgOEBwOCY6mKAhICGgICJkKyjQsK28QxrVOlaeGKWheT7AGSqaUE4DFgZwAPAntJoNKocQh7jBp
E8McmXa6nQ8UuADPCpzCJOP1137NQVdyf/02V2+sTtRP2Rv87Mk/Bn48MOJegFq5hmB1Rvyytvu19QlX1yQencdvHIcHWdR6OROi
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
"""
    // <<< joba24-widget-logo
}

/// The app icon as a small rounded badge: the card's signature.
struct JobaBrandMark: View {
    var size: CGFloat = 20

    /// Decoded once per process — the payload is a constant.
    private static let image: UIImage? = {
        let encoded = JobaBrandMarkSource.pngBase64.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !encoded.isEmpty,
              let data = Data(base64Encoded: encoded, options: .ignoreUnknownCharacters)
        else { return nil }
        return UIImage(data: data)
    }()

    var body: some View {
        ZStack {
            if let image = Self.image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                // Unpatched build: the brand's own navy and its initial, so the
                // corner still reads as a mark rather than an empty box.
                JobaPalette.text1
                Text("J")
                    .font(.system(size: size * 0.56, weight: .black))
                    .foregroundStyle(.white)
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.28, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                .strokeBorder(JobaPalette.border2, lineWidth: 0.5)
        )
        .accessibilityHidden(true)
    }
}