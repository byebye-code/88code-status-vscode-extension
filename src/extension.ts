// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { readApiKey } from "./config";
import { fetchSubscriptions } from "./api";
import { calcTotalPerSub, calcTotalSum, remainingResetTimes } from "./calc";
import type { Subscription } from "./types";

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

  const interval = setInterval(() => void refreshStatus(statusItem), 5 * 60 * 1000);
  context.subscriptions.push({ dispose: () => clearInterval(interval) });
}

// This method is called when your extension is deactivated
export function deactivate() {}

async function refreshStatus(item: vscode.StatusBarItem) {
  try {
    const apiKey = await readApiKey();
    if (!apiKey) {
      item.text = "剩余 $—";
      item.tooltip = new vscode.MarkdownString("未配置 API Key");
      item.tooltip.isTrusted = true;
      return;
    }

    // total credits
    const subs = await fetchSubscriptions(apiKey);
    const active = subs.filter((s) => s.isActive);

    const sum = calcTotalSum(active);
    item.text = `剩余 $${sum.toFixed(2)}`;

    item.tooltip = buildTooltip(active);
    item.tooltip.isTrusted = true;
  } catch (err) {
    item.text = "剩余 $—";
    const msg = (err as Error)?.message ?? "未知错误";
    item.tooltip = new vscode.MarkdownString(`刷新失败：${msg}`);
    item.tooltip.isTrusted = true;
  }
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
