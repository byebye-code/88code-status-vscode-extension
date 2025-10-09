// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { readApiKey } from "./config";
import { fetchSubscriptions } from "./api";
import { calcTotalPerSub, calcTotalSum, remainingResetTimes } from "./calc";
import type { Subscription } from "./types";

let lastSum: number | undefined;
let flashTimeout: NodeJS.Timeout | undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusItem.name = "88code-status";
  statusItem.command = "88code-status.refresh";
  context.subscriptions.push(statusItem);

  const refreshCmd = vscode.commands.registerCommand("88code-status.refresh", async () => {
    await refreshStatus(statusItem);
  });
  context.subscriptions.push(refreshCmd);

  statusItem.show();
  void refreshStatus(statusItem);

  // 每隔一段时间刷新一次 当前设置为 1 分钟
  const interval = setInterval(() => void refreshStatus(statusItem), 60 * 1000);
  context.subscriptions.push({ dispose: () => clearInterval(interval) });
}

// This method is called when your extension is deactivated
export function deactivate() {}

async function refreshStatus(item: vscode.StatusBarItem) {
  try {
    const apiKey = await readApiKey();
    if (!apiKey) {
      resetFlash(item);
      lastSum = undefined;
      item.text = "剩余 $—";
      item.tooltip = new vscode.MarkdownString("未配置 API Key");
      item.tooltip.isTrusted = true;
      return;
    }

    // total credits
    const subs = await fetchSubscriptions(apiKey);
    const active = subs.filter((s) => s.isActive);

    const sum = calcTotalSum(active);
    if (lastSum !== undefined && Math.abs(sum - lastSum) > 1e-6) {
      flashOnChange(item);
    }
    lastSum = sum;
    item.text = `$(credit-card) 剩余 $${sum.toFixed(2)}`;

    item.tooltip = buildTooltip(active);
    item.tooltip.isTrusted = true;
  } catch (err) {
    resetFlash(item);
    lastSum = undefined;
    item.text = "$(credit-card) 剩余 $—";
    const msg = (err as Error)?.message ?? "未知错误";
    item.tooltip = new vscode.MarkdownString(`刷新失败：${msg}`);
    item.tooltip.isTrusted = true;
  }
}

function flashOnChange(item: vscode.StatusBarItem) {
  resetFlash(item);
  item.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
  flashTimeout = setTimeout(() => {
    resetFlash(item);
  }, 600);
}

function resetFlash(item: vscode.StatusBarItem) {
  if (flashTimeout) {
    clearTimeout(flashTimeout);
    flashTimeout = undefined;
  }
  item.backgroundColor = undefined;
}

function buildTooltip(subs: Subscription[]): vscode.MarkdownString {
  if (!subs.length) {
    return new vscode.MarkdownString("无活跃订阅");
  }
  const lines = subs.map((s) => {
    const total = calcTotalPerSub(s);
    const cur = `$${Number(s.currentCredits).toFixed(2)}`;
    const limit = `$${Number(s.subscriptionPlan.creditLimit).toFixed(2)}`;
    const totalFixed = `$${total.toFixed(2)}`;
    return `${
      s.subscriptionPlanName || "(未命名)"
    } 当前/上限:${cur}/${limit} | 剩余重置:${remainingResetTimes(s)} | 总量:${totalFixed}`;
  });
  return new vscode.MarkdownString(lines.join("\n\n"));
}
