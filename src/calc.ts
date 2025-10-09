import type { Subscription } from "./types";

export function calcActiveSum(subs: Subscription[]): number {
  return subs
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + (Number.isFinite(s.currentCredits) ? s.currentCredits : 0), 0);
}

export function calcTotalSum(subs: Subscription[]): number {
  return subs.map((sub) => calcTotalPerSub(sub)).reduce((sum, s) => sum + s, 0);
}

/**
 * 计算单个订阅的总额度，包含重置次数的额度
 */
export function calcTotalPerSub(s: Subscription): number {
  const credits = Number.isFinite(s.currentCredits) ? Math.max(s.currentCredits, 0) : 0;
  const limit = Number.isFinite(s.subscriptionPlan.creditLimit)
    ? Math.max(s.subscriptionPlan.creditLimit, 0)
    : 0;
  const resets = remainingResetTimes(s);
  const times = Number.isFinite(resets) ? Math.max(resets, 0) : 0;
  return credits + times * limit;
}

export function remainingResetTimes(s: Subscription): number {
  if (s.subscriptionPlan.planType === "PAY_PER_USE") {
    return 0;
  }
  return s.resetTimes;
}
