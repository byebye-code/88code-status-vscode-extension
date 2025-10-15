import * as vscode from "vscode";
import { calcTotalPerSub, remainingResetTimes } from "./calc";
import type { Subscription } from "./types";

const MANAGE_SUBSCRIPTION_URL = "https://www.88code.org/my-subscription";

type ActionId = "refresh" | "openManage";

interface ActionMenuItem extends vscode.QuickPickItem {
  itemType: "action";
  action: ActionId;
}

interface SubscriptionMenuItem extends vscode.QuickPickItem {
  itemType: "subscription";
  subscription: Subscription;
}

interface SeparatorMenuItem extends vscode.QuickPickItem {
  itemType: "separator";
  kind: vscode.QuickPickItemKind.Separator;
}

type MenuEntry = ActionMenuItem | SubscriptionMenuItem | SeparatorMenuItem;

export interface StatusMenuDeps {
  ensureSubscriptions: (item: vscode.StatusBarItem) => Promise<Subscription[]>;
  refreshStatus: (item: vscode.StatusBarItem) => Promise<void>;
}

export async function showStatusMenu(item: vscode.StatusBarItem, deps: StatusMenuDeps) {
  const subs = await deps.ensureSubscriptions(item);

  const actionItems: ActionMenuItem[] = [
    {
      label: "$(refresh) 刷新余额",
      description: "立即同步最新额度",
      itemType: "action",
      action: "refresh",
    },
    {
      label: "$(link-external) 打开订阅管理页面",
      description: "在浏览器中查看和管理订阅",
      itemType: "action",
      action: "openManage",
    },
  ];

  const subscriptionItems: SubscriptionMenuItem[] = subs.map((sub) => {
    const cur = Number(sub.currentCredits).toFixed(2);
    const limit = Number(sub.subscriptionPlan.creditLimit).toFixed(2);
    const total = calcTotalPerSub(sub).toFixed(2);
    return {
      label: `$(organization) ${sub.subscriptionPlanName || "(未命名)"}`,
      description: `当前:$${cur} | 总量:$${total}`,
      detail: `上限:$${limit} · 剩余重置:${remainingResetTimes(sub)} · 周期:${
        sub.billingCycleDesc || sub.billingCycle
      }`,
      itemType: "subscription",
      subscription: sub,
    };
  });

  const items: MenuEntry[] = [...actionItems];
  if (subscriptionItems.length) {
    items.push({
      label: "订阅套餐",
      kind: vscode.QuickPickItemKind.Separator,
      itemType: "separator",
    });
    items.push(...subscriptionItems);
  }

  const selection = await vscode.window.showQuickPick<MenuEntry>(items, {
    placeHolder: "选择一个订阅操作",
    ignoreFocusOut: true,
  });

  if (!selection || selection.itemType === "separator") {
    return;
  }

  if (selection.itemType === "action") {
    await handleActionItem(selection.action, item, deps);
    return;
  }

  await handleSubscriptionItem(selection.subscription, item, deps);
}

async function handleActionItem(action: ActionId, item: vscode.StatusBarItem, deps: StatusMenuDeps) {
  if (action === "refresh") {
    await deps.refreshStatus(item);
    return;
  }
  if (action === "openManage") {
    await vscode.env.openExternal(vscode.Uri.parse(MANAGE_SUBSCRIPTION_URL));
  }
}

async function handleSubscriptionItem(sub: Subscription, item: vscode.StatusBarItem, deps: StatusMenuDeps) {
  const infoLines = [
    `套餐: ${sub.subscriptionPlanName || "(未命名)"}`,
    `当前余额: $${Number(sub.currentCredits).toFixed(2)}`,
    `额度上限: $${Number(sub.subscriptionPlan.creditLimit).toFixed(2)}`,
    `剩余重置次数: ${remainingResetTimes(sub)}`,
    `周期: ${sub.billingCycleDesc || sub.billingCycle}`,
    `总额(含重置): $${calcTotalPerSub(sub).toFixed(2)}`,
  ];
  const choice = await vscode.window.showInformationMessage(infoLines.join("\n"), "打开订阅管理页面", "刷新余额");
  if (choice === "打开订阅管理页面") {
    await vscode.env.openExternal(vscode.Uri.parse(MANAGE_SUBSCRIPTION_URL));
    return;
  }
  if (choice === "刷新余额") {
    await deps.refreshStatus(item);
  }
}
