import * as assert from "assert";
import { fetchSubscriptions } from "../api";

suite("api.fetchSubscriptions", () => {
  const origFetch = (globalThis as any).fetch;

  teardown(() => {
    (globalThis as any).fetch = origFetch;
  });

  test("sends Authorization header and maps core fields", async () => {
    const KEY = process.env["88CODE_API_KEY"] || process.env["key88"] || "test_api_key";
    let captured: { url?: string; auth?: string } = {};

    (globalThis as any).fetch = async (url: string, init: any) => {
      captured.url = url;
      captured.auth = init?.headers?.["Authorization"] || init?.headers?.Authorization;
      return {
        ok: true,
        status: 200,
        async json() {
          return [
            {
              planName: "FREE",
              isActive: true,
              currentCredits: 12.34,
              creditLimit: 20,
              resetTimes: 2,
            },
            {
              planName: "DISABLED",
              isActive: false,
              currentCredits: 99,
              creditLimit: 100,
              resetTimes: 1,
            },
          ];
        },
      } as any;
    };

    const subs = await fetchSubscriptions(KEY);
    assert.ok(captured.url?.includes("/api/subscription"));
    assert.strictEqual(captured.auth, `Bearer ${KEY}`);
    assert.strictEqual(subs.length, 2);
    assert.deepStrictEqual(subs[0], {
      planName: "FREE",
      isActive: true,
      currentCredits: 12.34,
      creditLimit: 20,
      resetTimes: 2,
    });
  });

  test("throws when apiKey missing", async () => {
    await assert.rejects(() => fetchSubscriptions("" as any));
  });
});
