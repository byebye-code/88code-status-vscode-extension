import * as vscode from "vscode";
import { calcTotalPerSub, remainingResetTimes } from "./calc";
import type { Subscription } from "./types";

const MANAGE_SUBSCRIPTION_URL = "https://www.88code.org/my-subscription";

type ActionId = "refresh" | "openManage";

type SubscriptionAction = "reset" | "cancel";

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
  requestReset: (subscriptionId: number) => Promise<string>;
}

export async function showStatusMenu(item: vscode.StatusBarItem, deps: StatusMenuDeps) {
  const subs = await deps.ensureSubscriptions(item);

  const actionItems: ActionMenuItem[] = [
    {
      label: "$(refresh) 刷新",
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
      description: `当前:$${cur} | 总余额:$${total}`,
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

async function handleActionItem(
  action: ActionId,
  item: vscode.StatusBarItem,
  deps: StatusMenuDeps
) {
  if (action === "refresh") {
    await deps.refreshStatus(item);
    return;
  }
  if (action === "openManage") {
    await vscode.env.openExternal(vscode.Uri.parse(MANAGE_SUBSCRIPTION_URL));
  }
}

async function handleSubscriptionItem(
  sub: Subscription,
  item: vscode.StatusBarItem,
  deps: StatusMenuDeps
) {
  const name = sub.subscriptionPlanName || "(未命名)";
  const remainTimes = remainingResetTimes(sub);
  const quickPickItems: Array<vscode.QuickPickItem & { action: SubscriptionAction }> = [];

  // 有重置次数时可重置
  if (remainTimes > 0) {
    quickPickItems.push({
      label: "$(sync) 重置额度",
      description: "补满当前订阅额度，消耗一次重置次数",
      action: "reset",
    });
  }

  quickPickItems.push({
    label: "$(circle-slash) 取消",
    action: "cancel",
  });

  const secondSelection = await vscode.window.showQuickPick<
    vscode.QuickPickItem & { action: SubscriptionAction }
  >(quickPickItems, {
    placeHolder: `订阅「${name}」的操作`,
    ignoreFocusOut: true,
  });

  if (!secondSelection || secondSelection.action === "cancel") {
    return;
  }

  if (secondSelection.action !== "reset") {
    return;
  }

  try {
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `正在重置订阅「${name}」额度...`,
        cancellable: false,
      },
      async () => {
        const msg = await deps.requestReset(sub.id);
        return msg;
      }
    );

    const output = result?.trim ? result.trim() : result;
    vscode.window.showInformationMessage(output || "重置成功");
    await deps.refreshStatus(item);
  } catch (err) {
    const message = (err as Error)?.message ?? "未知错误";
    vscode.window.showErrorMessage(`重置失败：${message}`);
  }
}
