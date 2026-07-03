/**
 * PLUMBING — Vertical Research Document
 * ───────────────────────────────────────────────────────────────────────────
 * The "operating manual" for the plumbing vertical.
 * Every product decision for plumbing should reference this document.
 *
 * This is internal knowledge — NOT shown to end users.
 * Used by the team and AI agents to make data-driven decisions.
 *
 * Researched: 2026-07-03
 */

export const PLUMBING_RESEARCH = {
  vertical_id: 'plumbing',
  vertical_name: 'אינסטלציה',
  status: 'published',

  research: {

    // ── Best Companies ──────────────────────────────────────────────────────
    best_companies: [
      { name: 'TaskRabbit', country: 'US/Global', model: 'On-demand marketplace', key_insight: 'Instant booking for emergency repairs; photo-first intake; background-checked pros' },
      { name: 'Thumbtack', country: 'US', model: 'Quote-based marketplace', key_insight: 'Customer describes issue → pros send quotes; strong in home services; license display upfront' },
      { name: 'Angi (formerly Angie\'s List)', country: 'US', model: 'Review-driven directory + marketplace', key_insight: 'Reviews are the core asset; "Angi Guaranteed" warranty builds trust; fixed-price options' },
      { name: 'HomeAdvisor', country: 'US', model: 'Lead generation + matching', key_insight: 'Merged with Angi; strong matching algorithm; pro screening is the differentiator' },
      { name: 'Porch', country: 'US', model: 'Home services network', key_insight: 'Focuses on maintenance & repair; integrates with home insurance' },
      { name: 'Housecall Pro', country: 'US', model: 'SaaS for plumbers + marketplace', key_insight: 'Gives plumbers scheduling/invoicing tools; marketplace is secondary but sticky' },
      { name: 'On The Go (OTG)', country: 'Israel', model: 'Local handyman app', key_insight: 'General home services; no plumbing specialization; pricing opacity is a pain point' },
    ],

    // ── Competitors ──────────────────────────────────────────────────────────
    competitors: [
      { type: 'direct', name: 'TaskRabbit / Thumbtack / Angi', note: 'Not in Israel yet, but the model is proven. Joba24 can be the Israeli equivalent.' },
      { type: 'direct', name: 'On The Go (OTG)', note: 'Closest Israeli competitor — general home services, weak in specialization' },
      { type: 'direct', name: 'Fix4U / Yad2 Handyman', note: 'Israeli classifieds turning into apps; low trust, no verification' },
      { type: 'indirect', name: 'Google Local Services / Google Guaranteed', note: 'Google\'s own plumber matching; strong for search intent' },
      { type: 'indirect', name: 'Yelp / Facebook Groups', note: 'Word of mouth on digital platforms; high friction, low trust' },
      { type: 'indirect', name: 'WhatsApp groups (neighborhood)', note: 'Most common in Israel today — "מכירים אינסטלטור?"; zero trust infrastructure' },
      { type: 'substitute', name: 'DIY (YouTube tutorials)', note: 'For minor clogs/faucet changes; customers try themselves first' },
    ],

    // ── UX Patterns ──────────────────────────────────────────────────────────
    ux_patterns: [
      { pattern: 'Photo-first intake', description: 'Customer uploads photo of the issue before anything else; plumbers need to see it', used_by: 'TaskRabbit, Thumbtack' },
      { pattern: 'Emergency toggle', description: 'One-tap "this is an emergency" button that switches to instant-dispatch mode', used_by: 'TaskRabbit' },
      { pattern: 'License badge upfront', description: 'Plumber\'s license number visible on every card and profile; clickable to verify', used_by: 'Angi, HomeAdvisor' },
      { pattern: 'Fixed vs. hourly toggle', description: 'Customer chooses pricing model; fixed for known issues, hourly for diagnostics', used_by: 'Thumbtack' },
      { pattern: 'Arrival ETA', description: 'Live ETA once plumber accepts; reduces anxiety for emergencies', used_by: 'TaskRabbit, Uber-style' },
      { pattern: 'Before/after photos', description: 'Plumber uploads completion photos showing the fix; builds trust for payment release', used_by: 'Angi, Housecall Pro' },
      { pattern: 'Issue-type quick select', description: 'Pre-defined issue categories with icons (leak, clog, toilet, boiler) for fast intake', used_by: 'HomeAdvisor' },
    ],

    // ── Trust Factors ────────────────────────────────────────────────────────
    trust_factors: [
      { rank: 1, factor: 'License verification', weight: 'critical', description: 'רישיון אינסטלטור מוסמך — without this, water damage risk is catastrophic' },
      { rank: 2, factor: 'Professional insurance', weight: 'high', description: 'ביטוח חבות מקצועית — covers damage caused during repair' },
      { rank: 3, factor: 'Reviews with photos', weight: 'high', description: 'Reviews that include before/after photos are 3x more trusted' },
      { rank: 4, factor: 'Response time metric', weight: 'high', description: 'Published avg response time for emergencies; fastest responder wins' },
      { rank: 5, factor: 'On-time guarantee', weight: 'medium', description: 'Promise to arrive within promised window; compensation if late' },
      { rank: 6, factor: 'First-visit fix rate', weight: 'medium', description: '% of jobs fixed on first visit; high rate = experienced pro' },
      { rank: 7, factor: 'Background check', weight: 'medium', description: 'Criminal record check — especially for in-home service' },
      { rank: 8, factor: 'Transparent pricing', weight: 'medium', description: 'Upfront pricing or clear hourly rate; no "surprise" charges' },
    ],

    // ── AI Questions ─────────────────────────────────────────────────────────
    ai_questions: [
      { question: 'מה הבעיה?', type: 'categorized_select', why: 'Routes to the right specialist (leak vs. boiler vs. installation)' },
      { question: 'האם מים זורמים כעת באופן פעיל?', type: 'emergency_boolean', why: 'Triggers emergency dispatch mode — different pricing, urgency, and matching radius' },
      { question: 'צילום הבעיה', type: 'photo', why: 'Plumber can assess before arriving; reduces wasted trips; enables price estimate' },
      { question: 'איפה בבית?', type: 'location_select', why: 'Determines accessibility (under sink, behind wall, roof for boiler)' },
      { question: 'מותג ודגם (לדודים/מכשירים)', type: 'text', why: 'Parts compatibility — arriving with the wrong part wastes a trip' },
      { question: 'מתי התחילה הבעיה?', type: 'text', why: 'Duration indicates severity; chronic leaks may indicate deeper issues' },
      { question: 'ניסית לפתור לבד?', type: 'boolean', why: 'If yes, the situation may be worse (e.g., chemicals poured into clog)' },
    ],

    // ── Matching Logic ───────────────────────────────────────────────────────
    matching_logic: {
      primary_factors: [
        { factor: 'distance', weight: 0.35, rationale: 'Emergencies need nearby plumbers; travel time = water damage' },
        { factor: 'certification_match', weight: 0.20, rationale: 'Boiler specialist for boiler issues; general plumber for faucet changes' },
        { factor: 'recent_activity', weight: 0.15, rationale: 'Online/recently active plumbers respond faster' },
        { factor: 'urgency', weight: 0.10, rationale: 'Emergency tasks boosted in feed for nearby plumbers' },
        { factor: 'reliability_fit', weight: 0.10, rationale: 'Funded tasks, verified clients, good client ratings' },
        { factor: 'personal_fit', weight: 0.10, rationale: 'Past experience with similar issue types' },
      ],
      emergency_mode: {
        trigger: "urgency_tag === 'immediate'",
        radius_km: 15,
        push_to_all_nearby: true,
        response_window_minutes: 30,
        auto_escalate_after_minutes: 10,
      },
      specialty_matching: {
        boilers: ['brand_model contains דוד OR בוילר OR Hamum OR Dany OR Nisko'],
        installations: ['issue_type === התקנת מכשיר חדש'],
        outdoor: ['location_in_home === מחוץ לבית'],
      },
    },

    // ── KPIs ─────────────────────────────────────────────────────────────────
    kpis: [
      { metric: 'Emergency response time', target: '< 30 min', description: 'Time from emergency post to plumber acceptance' },
      { metric: 'First-visit fix rate', target: '> 85%', description: '% of tasks completed without a return visit' },
      { metric: 'Customer satisfaction', target: '> 4.5 / 5', description: 'Average review rating' },
      { metric: 'Repeat hire rate', target: '> 25%', description: '% of clients who hire again within 6 months' },
      { metric: 'No-damage rate', target: '> 98%', description: '% of tasks with no reported secondary damage' },
      { metric: 'Task completion rate', target: '> 90%', description: '% of posted tasks that get completed (not cancelled)' },
      { metric: 'Time to first applicant', target: '< 5 min for emergencies, < 30 min for regular', description: 'Marketplace liquidity indicator' },
    ],

    // ── Reviews ──────────────────────────────────────────────────────────────
    reviews: {
      structure: 'Post-completion, dual-sided (client reviews worker, worker reviews client)',
      must_ask: [
        { key: 'fixed_root_cause', label: 'תיקן את שורש הבעיה', why: 'The #1 complaint in plumbing is "fixed the symptom, not the cause"' },
        { key: 'fixed_first_visit', label: 'תיקן בביקור הראשון', why: 'Return visits waste time and erode trust' },
        { key: 'clean_work', label: 'השאיר את האזור נקי', why: 'Messy plumbers = unprofessional; water + mess = damage risk' },
        { key: 'no_damage', label: 'לא גרם נזק נלווה', why: 'Secondary damage is the #1 source of disputes' },
        { key: 'transparent_pricing', label: 'מחיר שקוף', why: 'Surprise charges are the #1 complaint against plumbers' },
      ],
      tags: ['✅ תיקן בביקור אחד', '🧹 עבודה נקייה', '💰 מחיר הוגן', '🗣️ הסביר את הבעיה', '🛡️ ללא נזקים'],
      pro_tip: 'Ask for before/after photos in the review — increases trust 3x for future clients',
    },

    // ── Required Verification ────────────────────────────────────────────────
    required_verification: [
      { item: 'ID verification', mandatory: true, description: 'תעודת זהות — required for all Joba24 users' },
      { item: 'Plumbing license', mandatory: true, description: 'רישיון אינסטלטור מוסמך — must be uploaded and verified' },
      { item: 'Professional insurance', mandatory: false, recommended: true, description: 'ביטוח חבות מקצועית — strongly recommended; displayed as badge' },
      { item: 'Phone verification', mandatory: true, description: 'Phone number verified via OTP' },
      { item: 'Background check', mandatory: false, recommended: true, description: 'Criminal record check — especially for in-home service' },
    ],

    // ── Premium Features ─────────────────────────────────────────────────────
    premium_features: [
      { feature: 'Emergency Boost', description: 'Push task to top of ALL nearby plumbers\' feed instantly', pricing_model: 'per-use credits', value: 'Critical for emergencies — saves the customer' },
      { feature: 'Auto-Raise', description: 'Automatically increase price every 15 min if no applicants', pricing_model: 'included in boost', value: 'Ensures task gets filled without manual monitoring' },
      { feature: 'Priority Matching', description: 'AI recommends best-matched licensed plumber by specialty', pricing_model: 'subscription', value: 'Better match = higher first-visit fix rate' },
      { feature: 'Warranty add-on', description: 'Optional paid warranty on the repair (e.g., 90 days)', pricing_model: 'percentage of task price', value: 'Peace of mind; differentiator vs. informal plumbers' },
    ],

    // ── Common Fraud ─────────────────────────────────────────────────────────
    common_fraud: [
      { fraud: 'Upcharging', description: 'Quoting low to win the job, then charging 2-3x after "discovering" more issues', prevention: 'Require photo before quote; display price range; "transparent pricing" review tag' },
      { fraud: 'Unnecessary repairs', description: '"You need to replace the whole pipe" when only a washer is needed', prevention: 'Require before/after photos; AI photo diagnosis; "fixed_root_cause" review question' },
      { fraud: 'Bait and switch', description: 'Licensed plumber quotes, unlicensed assistant shows up', prevention: 'Verify identity on arrival (match profile photo); license number must match' },
      { fraud: 'Fake emergencies', description: 'Worker inflates urgency to charge emergency rates', prevention: 'Urgency is set by CLIENT, not worker; AI validates urgency from description' },
      { fraud: '"Free inspection" trap', description: 'Free inspection → always finds expensive problems', prevention: 'Discourage free inspections; prefer fixed-price or transparent hourly' },
      { fraud: 'Parts overcharging', description: 'Charging 5x retail for cheap parts', prevention: 'Require parts receipt upload; market price reference in task details' },
    ],

    // ── Marketplace Challenges ───────────────────────────────────────────────
    marketplace_challenges: [
      { challenge: 'Emergency demand spikes', description: 'Can\'t predict when pipes burst; supply scarcity during cold snaps / rainy season', mitigation: 'Larger worker pool; emergency boost; auto-raise' },
      { challenge: 'Quality consistency', description: 'One bad plumber = water damage = client never returns; high stakes per transaction', mitigation: 'License required; first-visit fix rate tracked; bad actors removed fast' },
      { challenge: 'Pricing transparency', description: 'Hard to quote before seeing the problem; leads to trust issues', mitigation: 'Photo-first intake; price ranges; transparent_pricing review tag' },
      { challenge: 'Parts availability', description: 'Plumber arrives but doesn\'t have the right part; wasted trip', mitigation: 'AI asks for brand/model; specialty matching; parts compatibility hints' },
      { challenge: 'Licensing verification', description: 'Hard to verify plumbing licenses in Israel; fake licenses common', mitigation: 'Manual verification + document upload; license badge only after verification' },
      { challenge: 'Supply during peak', description: 'Mornings (7-9am) and weekends have highest demand; supply doesn\'t scale', mitigation: 'Premium pricing for peak; notify idle workers; auto-raise' },
    ],

    // ── Success Metrics ──────────────────────────────────────────────────────
    success_metrics: [
      { metric: 'Emergency response time', description: 'Minutes from emergency post to plumber acceptance', target: '< 30 min' },
      { metric: 'First-visit fix rate', description: '% of tasks completed on first visit', target: '> 85%' },
      { metric: 'Repeat hire rate', description: '% of clients who hire a plumber again', target: '> 25%' },
      { metric: 'No-damage rate', description: '% of tasks with no secondary damage reported', target: '> 98%' },
      { metric: 'Task fill rate', description: '% of posted plumbing tasks that get an applicant', target: '> 90%' },
      { metric: 'Review submission rate', description: '% of completed tasks with a review', target: '> 60%' },
      { metric: 'Dispute rate', description: '% of tasks with a dispute/payment issue', target: '< 5%' },
    ],

    // ── Feature Ideas ────────────────────────────────────────────────────────
    feature_ideas: [
      { idea: '"Water flowing now?" emergency button', description: 'One-tap button on home screen for active flooding → instant dispatch to nearest licensed plumber', impact: 'high', effort: 'medium' },
      { idea: 'AI photo diagnosis', description: 'Upload photo → AI estimates the likely issue, severity, and price range before plumber arrives', impact: 'high', effort: 'high' },
      { idea: 'Parts compatibility checker', description: 'Plumber enters brand/model → system shows compatible parts and where to source them', impact: 'medium', effort: 'medium' },
      { idea: 'Video call diagnosis', description: 'Before dispatch, optional 2-min video call to assess severity and quote accurately', impact: 'medium', effort: 'low' },
      { idea: 'Fixed-price menus', description: 'Common repairs (faucet change, toilet fix, boiler service) have fixed prices — no surprises', impact: 'high', effort: 'medium' },
      { idea: 'Repair warranty', description: 'Paid add-on: 90-day warranty on the repair; if issue recurs, free return visit', impact: 'high', effort: 'low' },
      { idea: 'Annual maintenance subscription', description: 'Yearly boiler checkup + priority emergency response; recurring revenue', impact: 'medium', effort: 'medium' },
      { idea: 'Smart home integration', description: 'Connect to water leak sensors (e.g., Phyn, Flo) → auto-create emergency task when leak detected', impact: 'high', effort: 'high' },
      { idea: 'Parts receipt upload', description: 'Plumber uploads receipt for parts → transparent pricing; builds trust', impact: 'medium', effort: 'low' },
    ],

    // ── Future Roadmap ───────────────────────────────────────────────────────
    future_roadmap: [
      { phase: 1, title: 'Emergency dispatch + licensed-only', timeline: 'Launch', items: ['Emergency button', 'License verification required', 'Photo-first intake', 'Nearby worker push for emergencies'] },
      { phase: 2, title: 'AI diagnosis + price transparency', timeline: '3 months', items: ['AI photo diagnosis', 'Fixed-price menus for common repairs', 'Parts compatibility hints', 'Before/after photo requirement'] },
      { phase: 3, title: 'Trust & warranty layer', timeline: '6 months', items: ['Repair warranty add-on', 'Professional insurance verification', 'First-visit fix rate display', 'Smart parts receipt upload'] },
      { phase: 4, title: 'Recurring revenue', timeline: '9 months', items: ['Annual maintenance subscription', 'Priority matching subscription for plumbers', 'B2B property manager portal'] },
      { phase: 5, title: 'Smart home integration', timeline: '12 months', items: ['Water leak sensor integration', 'Auto-dispatch from sensor alerts', 'Predictive maintenance reminders'] },
    ],

    // ── Israel Market Notes ──────────────────────────────────────────────────
    israel_market_notes: `השוק הישראלי לאינסטלציה הוא שוק מפוצל מאוד. אין שחקן דומיננטי — רוב האינסטלטורים עובדים עצמאית דרך קבוצות וואטסאפ שכונתיות או המלצות בעל פה.

נקודות מפתח:
- רישיון אינסטלטור בישראל ניתן על ידי משרד העבודה — ניתן לאימות אך תהליך ידני
- ביטוח חבות מקצועית נפוץ פחות מאשר בארה"ב — צריך לחנך את השוק
- עונת הגשם (נובמבר-מרץ) = עלייה דרמטית בביקוש לאינסטלטורים (גגות, נזילות, דודים)
- דודי שמש ייחודיים לישראל — מומחיות נפרדת מאינסטלציה כללית
- תרבות התמחור: ישראלים רגילים למחירים לא שקופים — Joba24 יכול להבדיל בשקיפות
- המלצות בעל פה הן המתחרה הגדול ביותר — צריך להנגיש ביקורות עם תמונות`,
  },
};