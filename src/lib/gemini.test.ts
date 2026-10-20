import "@/test/next-mocks";
import { afterEach, describe, expect, it } from "vitest";
import { geminiConfig, generate, vertexClient, type ModelRequest } from "./gemini";

const ENV = ["GOOGLE_CLOUD_LOCATION", "GEMINI_MODEL", "GEMINI_FALLBACK_MODEL"] as const;
const saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const req: ModelRequest = { system: "s", parts: [{ text: "hello" }] };

describe("Gemini settings (#1)", () => {
  it("defaults to gemini-3.5-flash in us-east1, with gemini-2.5-flash as fallback model", () => {
    for (const k of ENV) delete process.env[k];
    expect(geminiConfig()).toMatchObject({ model: "gemini-3.5-flash", fallbackModel: "gemini-2.5-flash", location: "us-east1" });
  });

  it("keeps the environment overrides", () => {
    process.env.GOOGLE_CLOUD_LOCATION = "europe-west1";
    process.env.GEMINI_MODEL = "m-main";
    process.env.GEMINI_FALLBACK_MODEL = "m-backup";
    expect(geminiConfig()).toMatchObject({ model: "m-main", fallbackModel: "m-backup", location: "europe-west1" });
  });
});

describe("fallback model", () => {
  const cfg = { ...geminiConfig(), project: "p", model: "main", fallbackModel: "backup" };

  it("tries the fallback model when the default model fails, before the cache", async () => {
    const tried: string[] = [];
    const client = vertexClient(cfg, async (model) => {
      tried.push(model);
      if (model === "main") throw new Error("429 RESOURCE_EXHAUSTED");
      return "from backup";
    });
    expect(await generate(req, { cacheKey: "test:fallback-model", client })).toEqual({ text: "from backup", from: "model" });
    expect(tried).toEqual(["main", "backup"]);
  });

  it("uses only the default model when it answers", async () => {
    const tried: string[] = [];
    const client = vertexClient(cfg, async (model) => (tried.push(model), "from main"));
    expect(await client.generate(req)).toBe("from main");
    expect(tried).toEqual(["main"]);
  });
});
