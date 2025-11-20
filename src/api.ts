import type { Subscription } from "./types";

const BASE_URL = "https://www.88code.org";
const SUB_ENDPOINT = "/api/subscription";
const USAGE_ENDPOINT = "/api/usage";
const RESET_ENDPOINT = "/api/reset-credits";

interface Response<T> {
  code: number;
  level?: any;
  msg: string;
  ok: boolean;
  data?: T;
  dataType?: number;
}

function createAbortController(): AbortController | undefined {
  if (typeof globalThis.AbortController === "function") {
    const Ctor = globalThis.AbortController as typeof AbortController;
    return new Ctor();
  }
  return undefined;
}

async function postJson<T>(url: string, apiKey: string): Promise<T | null> {
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
    const r = await fetch(url, init);
    if (!r || typeof r.ok !== "boolean") {
      throw new Error("Invalid response");
    }
    if (!r.ok) {
      throw new Error(`HTTP error: ${r.status}`);
    }

    const resp = (await r.json()) as Response<T>;
    if (!resp || typeof resp !== "object") {
      throw new Error("Invalid response body: not an object");
    }

    if (!resp.ok) {
      throw new Error(`Error response: ${resp.code}: ${resp.msg}`);
    }

    return resp.data ?? null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSubscriptions(apiKey: string): Promise<Subscription[]> {
  if (!apiKey) {
    throw new Error("API key missing");
  }

  const data = await postJson<Subscription[]>(`${BASE_URL}${SUB_ENDPOINT}`, apiKey);

  if (!Array.isArray(data)) {
    throw new Error("Invalid response body: not an array");
  }

  return data;
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

  const _ = await postJson(`${BASE_URL}${RESET_ENDPOINT}/${subscriptionId}`, apiKey);

  return "重置成功";
}
