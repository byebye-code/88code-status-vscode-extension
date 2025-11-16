import type { Subscription } from "./types";

const BASE_URL = "https://www.88code.org";
const SUB_ENDPOINT = "/api/subscription";
const USAGE_ENDPOINT = "/api/usage";
const RESET_ENDPOINT = "/api/reset-credits";

function createAbortController(): AbortController | undefined {
  if (typeof globalThis.AbortController === "function") {
    const Ctor = globalThis.AbortController as typeof AbortController;
    return new Ctor();
  }
  return undefined;
}

async function postJson(url: string, apiKey: string): Promise<Response> {
  const ctrl = createAbortController();
  const timeout = setTimeout(() => {
    try {
      ctrl?.abort();
    } catch {}
  }, 8000);

  const init: RequestInit = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  };
  if (ctrl) {
    init.signal = ctrl.signal;
  }

  try {
    const res = await fetch(url, init);
    if (!res || typeof res.ok !== "boolean") {
      throw new Error("Invalid response");
    }
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSubscriptions(apiKey: string): Promise<Subscription[]> {
  if (!apiKey) {
    throw new Error("API key missing");
  }

  const res = await postJson(`${BASE_URL}${SUB_ENDPOINT}`, apiKey);
  if (!res.ok) {
    const status = res.status ?? "unknown";
    throw new Error(`HTTP ${status}`);
  }

  const body = (await res.json()) as unknown;
  if (!Array.isArray(body)) {
    throw new Error("Invalid response body");
  }
  return body as Subscription[];
}

export async function fetchActiveSubscriptions(apiKey: string): Promise<Subscription[]> {
  const subs = await fetchSubscriptions(apiKey);
  const now = new Date();

  return subs.filter((sub) => {
    // 检查激活状态和过期时间
    return sub.isActive && new Date(sub.endDate) > now;
  });
}

export async function resetCredits(apiKey: string, subscriptionId: number): Promise<string> {
  if (!apiKey) {
    throw new Error("API key missing");
  }
  if (!Number.isFinite(subscriptionId)) {
    throw new Error("Invalid subscription id");
  }

  const res = await postJson(`${BASE_URL}${RESET_ENDPOINT}/${subscriptionId}`, apiKey);
  if (!res.ok) {
    const status = res.status ?? "unknown";
    let message = `HTTP ${status}`;
    try {
      const text = await res.text();
      if (text) {
        message += `: ${text}`;
      }
    } catch {}
    throw new Error(message);
  }

  const textBody = await res.text();
  const message = typeof textBody === "string" ? textBody.trim() : "";
  return message || "重置成功";
}
