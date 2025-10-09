// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { readApiKey } from "./config";
import { fetchSubscriptions } from "./api";
import { calcActiveSum } from "./calc";

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
  // Initial refresh
  void refreshStatus(statusItem);
}

// This method is called when your extension is deactivated
export function deactivate() {}

async function refreshStatus(item: vscode.StatusBarItem) {
  try {
    // Fixed mock value for early testing
    const mockSum = 208.2;
    item.text = `88code 剩余 $${mockSum.toFixed(2)}`;
    // Placeholder pipeline kept for future wiring
    const apiKey = await readApiKey();
    if (!apiKey) {
      item.tooltip = new vscode.MarkdownString("未配置 API Key | 显示为测试固定值");
      item.tooltip.isTrusted = true;
      return;
    }
    const subs = await fetchSubscriptions(apiKey);
    const sum = calcActiveSum(subs);
    // Keep showing mock for now; the above ensures types are wired and ready
    item.tooltip = new vscode.MarkdownString(
      `测试模式：实际计算值 $${sum.toFixed(2)}（当前展示固定值）`
    );
    item.tooltip.isTrusted = true;
  } catch (err) {
    item.text = "88code 剩余 $—";
    item.tooltip = new vscode.MarkdownString(
      `刷新失败（测试模式）：${(err as Error)?.message ?? "未知错误"}`
    );
    item.tooltip.isTrusted = true;
  }
}
