/**
 * categoryFee.ts — where an application fee comes from, and what it costs.
 *
 * A fee is three numbers:
 *   percent — the share of the task price
 *   min     — never charge less than this
 *   max     — never charge more than this (0 = no cap)
 *
 * The platform default is 5% with NO cap, and it applies to EVERY category that
 * has not been given a fee of its own.
 *
 * There is deliberately NO inheritance. A category states its own fee or it uses
 * the platform default — nothing is ever read from a parent, so editing one
 * category can never move another. A Brand may override the platform default in
 * its own marketplace config.
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
 * Only the category's OWN fee is consulted; when it states none, the platform
 * default (5%, no cap) applies. There is no parent lookup.
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

  // ONLY this category's own fee is read. No parent, no inheritance.
  const fee = (categoryKey ? globalMap?.[categoryKey]?.fee : null) || {};

  const p = num(fee.application_fee_percent);
  if (p !== null) out.percent = Math.max(0, p);

  const m = num(fee.application_fee_max);
  if (m !== null) out.max = Math.max(0, m);

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