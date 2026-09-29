/**
 * Design System V2 — scoped tokens & primitives.
 *
 * Everything here lives under `.dsv2-root`, so this stylesheet can never leak
 * into the live app. It is the single source of truth for the V2 preview.
 */
export const DSV2_CSS = `
.dsv2-root{
  --v2-blue:#1a6fd4; --v2-blue-dark:#155cb0; --v2-blue-soft:#eff6ff;
  --v2-ink:#0f1e40; --v2-ink-2:#5b6b85; --v2-ink-3:#93a1b8;
  --v2-bg:#ffffff; --v2-bg-soft:#f5f7fb; --v2-line:#e9eef6;
  --v2-yellow:#f5b32a; --v2-green:#16a34a; --v2-red:#dc2626;
  --v2-r-ctl:14px; --v2-r-card:18px;
  --v2-shadow:0 1px 2px rgba(15,30,64,.04), 0 8px 24px rgba(15,30,64,.06);
  color:var(--v2-ink);
  font-family:var(--font-inter);
}
.dsv2-root *{box-sizing:border-box}

/* ── Type scale: 4 steps only ── */
.v2-title{font-size:22px;font-weight:800;letter-spacing:-.4px;color:var(--v2-ink);margin:0;line-height:1.25}
.v2-h2{font-size:15px;font-weight:700;color:var(--v2-ink);margin:0}
.v2-body{font-size:15px;line-height:1.6;color:var(--v2-ink-2);margin:0}
.v2-meta{font-size:13px;font-weight:500;color:var(--v2-ink-3);margin:0}
.v2-meta-2{font-size:13px;font-weight:600;color:var(--v2-ink-2);margin:0}
.v2-label{font-size:12px;font-weight:700;letter-spacing:.4px;color:var(--v2-ink-3);margin:0}

/* ── Card: light surface, hairline, no nested containers ── */
.v2-card{background:var(--v2-bg);border:1px solid var(--v2-line);border-radius:var(--v2-r-card);padding:18px;box-shadow:var(--v2-shadow)}

/* ── Buttons: one primary, one secondary, one tertiary ── */
.v2-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;font-weight:700;font-size:16px;height:54px;padding:0 24px;border-radius:var(--v2-r-ctl);border:1px solid transparent;cursor:pointer;transition:opacity .15s,transform .1s}
.v2-btn:active{transform:scale(.985);opacity:.92}
.v2-btn-primary{background:var(--v2-blue);color:#fff}
.v2-btn-secondary{background:var(--v2-bg);color:var(--v2-ink);border-color:var(--v2-line)}
.v2-btn-tertiary{background:transparent;color:var(--v2-blue);height:auto;padding:10px 4px;font-size:15px}
.v2-btn-block{width:100%}
.v2-btn-sm{height:46px;font-size:15px;padding:0 20px;border-radius:12px}

/* ── Chips: used sparingly, max 2 per card ── */
.v2-chip{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px}
.v2-chip-quiet{background:#f1f5f9;color:var(--v2-ink-2)}
.v2-chip-danger{background:#fef2f2;color:var(--v2-red)}
.v2-chip-ok{background:#f0fdf4;color:var(--v2-green)}

.v2-hr{height:1px;background:var(--v2-line);border:0;margin:0}
.v2-icon-btn{width:44px;height:44px;border-radius:12px;border:0;background:transparent;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}

/* ── Inputs ── */
.v2-field{display:flex;align-items:center;gap:10px;height:52px;padding:0 16px;background:var(--v2-bg);border:1px solid var(--v2-line);border-radius:var(--v2-r-ctl)}
.v2-input{flex:1;border:0;outline:0;background:transparent;font-family:inherit;font-size:16px;color:var(--v2-ink)}
.v2-input::placeholder{color:var(--v2-ink-3)}

/* ── Phone canvas (preview frame only) ── */
.v2-phone{width:375px;max-width:100%;background:var(--v2-bg-soft);border-radius:28px;overflow:hidden;border:1px solid var(--v2-line);box-shadow:0 24px 60px rgba(15,30,64,.10)}

/* ── Bottom nav: quiet, importance from placement only ── */
.v2-nav{display:grid;grid-template-columns:1fr 1fr auto 1fr 1fr;align-items:center;background:#fff;border-top:1px solid var(--v2-line);padding:6px 6px 8px}
.v2-nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;font-weight:600;color:var(--v2-ink-3)}
.v2-nav-item.on{color:var(--v2-blue)}
.v2-fab{width:52px;height:52px;border-radius:50%;background:var(--v2-blue);display:flex;align-items:center;justify-content:center}
`;