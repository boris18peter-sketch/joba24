/**
 * categoryFee.ts — where an application fee comes from, and what it costs.
 *
 * A fee is three numbers:
 *   percent — the share of the task price
 *   min     — never charge less than this
 *   max     — never charge more than this (0 = no cap)
 *
 * The platform sets all three in JobaSettings. A Brand may override them in its
 * own marketplace config. A CATEGORY may override them too, per service — that is
 * what lets a ₪5,000 job cost a capped fee instead of 5% of it.
 *
 * Resolution walks from the task's own service UP its parent chain and takes the
 * FIRST value it finds, so a subcategory inherits its root's fee unless it states
 * its own. Nothing is ever copied down the tree.
 */

export const DEFAULT_FEE = { percent: 5, min: 1, max: 0 };

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export interface ResolvedFee {
  percent: number;
  min: number;
  max: number;
}

/**
 * The fee rules that apply to a task's category.
 *
 * @param categoryKey the task's actionable GlobalCategory.category_key
 * @param globalMap   category_key -> GlobalCategory row
 * @param settings    JobaSettings, already merged with the Brand's overrides
 */
export function resolveFee(
  categoryKey: string,
  globalMap: Record<string, any>,
  settings: any,
): ResolvedFee {
  const out: ResolvedFee = {
    percent: num(settings?.application_fee_percent) ?? DEFAULT_FEE.percent,
    min: num(settings?.application_fee_min) ?? DEFAULT_FEE.min,
    max: num(settings?.application_fee_max) ?? DEFAULT_FEE.max,
  };

  let percentSet = false;
  let maxSet = false;

  // Nearest ancestor that states a value wins; the walk stops once both are set.
  let node = categoryKey ? globalMap?.[categoryKey] : null;
  const seen = new Set<string>();
  while (node && !seen.has(node.category_key)) {
    seen.add(node.category_key);
    const fee = node.fee || {};

    if (!percentSet) {
      const p = num(fee.application_fee_percent);
      if (p !== null) {
        out.percent = Math.max(0, p);
        percentSet = true;
      }
    }
    if (!maxSet) {
      const m = num(fee.application_fee_max);
      if (m !== null) {
        out.max = Math.max(0, m);
        maxSet = true;
      }
    }
    if (percentSet && maxSet) break;

    node = node.parent_key ? globalMap?.[node.parent_key] : null;
  }

  return out;
}

/**
 * The Jobas actually charged for applying, in whole Jobas.
 *
 * Order matters: a category that charges 0% is EXEMPT (no minimum is applied on
 * top of it), the minimum then lifts a small charge, and the cap is applied LAST
 * so the minimum can never push a charge past the cap.
 */
export function computeApplicationFee(
  price: unknown,
  fee: ResolvedFee,
): number {
  const amount = Math.max(0, Number(price) || 0);
  if (!fee || fee.percent <= 0) return 0;

  let credits = Math.round((amount * fee.percent) / 100);
  credits = Math.max(fee.min, credits);
  if (fee.max > 0) credits = Math.min(credits, fee.max);

  return Math.max(0, credits);
}