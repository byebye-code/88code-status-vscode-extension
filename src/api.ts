import type { Subscription } from "./types";

const BASE_URL = "https://www.88code.org";
const SUB_ENDPOINT = "/api/subscription";
const USAGE_ENDPOINT = "/api/usage";

export async function fetchSubscriptions(apiKey: string): Promise<Subscription[]> {
  if (!apiKey) {
    throw new Error("API key missing");
  }

  const fetchFn: any = (globalThis as any).fetch;
  if (typeof fetchFn !== "function") {
    throw new Error("fetch is not available in this environment");
  }

  const ctrl: any =
    typeof (globalThis as any).AbortController === "function"
      ? new (globalThis as any).AbortController()
      : undefined;
  const timeout = setTimeout(() => {
    try {
      ctrl?.abort();
    } catch {}
  }, 8000);

  try {
    const res = await fetchFn(`${BASE_URL}${SUB_ENDPOINT}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: ctrl?.signal,
    });

    if (!res || typeof res.ok !== "boolean") {
      throw new Error("Invalid response");
    }
    if (!res.ok) {
      const status = (res as any).status ?? "unknown";
      throw new Error(`HTTP ${status}`);
    }

    const body = (await res.json()) as Subscription[];
    // 简单检查，防止返回的是个错误JSON
    if (!Array.isArray(body)) {
      throw new Error("Invalid response body");
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
}
