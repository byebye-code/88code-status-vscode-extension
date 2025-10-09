/**
 * 结构定义
 * 
 * API接口的部分响应，包含大量null的字段被移除，
 * 避免被错误使用。
 */

export interface Subscription {
  resetTimes: number;
  id: number;
  employeeId: number;
  employeeName: string;
  employeeEmail: string;
  currentCredits: number;
  subscriptionPlanId: number;
  subscriptionPlanName: string;
  cost: number;
  startDate: Date;
  endDate: Date;
  billingCycle: string;
  billingCycleDesc: string;
  remainingDays: number;
  subscriptionStatus: string;
  subscriptionPlan: SubscriptionPlan;
  isActive: boolean;
  autoRenew: boolean;
  autoResetWhenZero: boolean;
  lastCreditReset: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPlan {
  id: number;
  subscriptionName: string;
  billingCycle: string;
  cost: number;
  features: string;
  hotTag: string;
  tokenLimit: number;
  concurrencyLimit: number;
  rateLimitRequests: number;
  creditLimit: number;
  creditsPerHour: number;
  dailyCostLimit: number;
  enableModelRestriction: boolean;
  planType: string;
}
