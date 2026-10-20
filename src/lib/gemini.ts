import crypto from "crypto";
import fs from "fs";
import path from "path";
import { dataDir } from "./db";
import bundledCache from "./gemini-cache.json";

/**
 * Gemini seam. Everything that talks to a model goes through `generate()`, which:
 * - calls the injected `ModelClient` (default: Gemini on Vertex AI with Application Default Credentials, no API key);
 * - gives up after a timeout;
 * - falls back to a cached response keyed on the input when the model fails, so the demo never breaks.
 *
 * Tests inject their own `ModelClient`; nothing here touches the network unless the default client is used.
 */

export type ModelPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export type ModelRequest = {
  system: string; // system instruction
  parts: ModelPart[]; // user content: text and/or inline audio (base64)
  schema?: object; // JSON Schema for structured output; the reply is then a JSON string
  signal?: AbortSignal;
};

/** Anything that can answer a model request with text (JSON text when `schema` is set). */
export type ModelClient = { generate(req: ModelRequest): Promise<string> };

export class ModelUnavailableError extends Error {
  constructor(message = "Gemini is not configured") {
    super(message);
    this.name = "ModelUnavailableError";
  }
}

/** Model settings from the environment. No keys: auth is the runtime identity (ADC / Cloud Run service account). */
export function geminiConfig() {
  return {
    project: process.env.GOOGLE_CLOUD_PROJECT || "",
    location: process.env.GOOGLE_CLOUD_LOCATION || "europe-west1",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS) || 15000,
    preferCache: process.env.GEMINI_PREFER_CACHE === "1",
  };
}

/** Gemini on Vertex AI via @google/genai in vertexai mode. Loaded lazily so tests and builds never construct it. */
export function vertexClient(cfg = geminiConfig()): ModelClient {
  return {
    async generate(req) {
      if (!cfg.project) throw new ModelUnavailableError("GOOGLE_CLOUD_PROJECT is not set");
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ vertexai: true, project: cfg.project, location: cfg.location });
      const res = await ai.models.generateContent({
        model: cfg.model,
        contents: [{ role: "user", parts: req.parts }],
        config: {
          systemInstruction: req.system,
          temperature: 0,
          abortSignal: req.signal,
          ...(req.schema ? { responseMimeType: "application/json", responseJsonSchema: req.schema } : {}),
        },
      });
      if (!res.text) throw new Error("Gemini returned an empty response");
      return res.text;
    },
  };
}

export type Generated = { text: string; from: "model" | "cache" };

/**
 * Ask the model, with timeout and cache fallback.
 * `cacheKey` identifies the input (use `cacheKeyFor(purpose, input)`); a successful answer is stored under it.
 * Returns null when the model fails and nothing is cached.
 */
export async function generate(req: ModelRequest, opts: { cacheKey: string; client?: ModelClient; timeoutMs?: number }): Promise<Generated | null> {
  const cfg = geminiConfig();
  if (cfg.preferCache) {
    const hit = readCache(opts.cacheKey);
    if (hit !== undefined) return { text: hit, from: "cache" };
  }
  const client = opts.client ?? vertexClient(cfg);
  try {
    const text = await withTimeout(opts.timeoutMs ?? cfg.timeoutMs, (signal) => client.generate({ ...req, signal }));
    writeCache(opts.cacheKey, text);
    return { text, from: "model" };
  } catch (err) {
    const hit = readCache(opts.cacheKey);
    if (hit !== undefined) return { text: hit, from: "cache" };
    if (!(err instanceof ModelUnavailableError)) console.warn("Gemini call failed and no cached response:", (err as Error).message);
    return null;
  }
}

/** Stable cache key for a model input, e.g. `cacheKeyFor("leaves", text)`. */
export function cacheKeyFor(purpose: string, input: string) {
  return `${purpose}:${crypto.createHash("sha256").update(input.trim()).digest("hex").slice(0, 32)}`;
}

async function withTimeout<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ctl.abort();
      reject(new Error(`Gemini timed out after ${ms} ms`));
    }, ms);
  });
  try {
    return await Promise.race([run(ctl.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// ---------- response cache ----------
// Runtime answers go to $KT_DATA_DIR/gemini-cache.json (data/ locally, ephemeral on Cloud Run).
// Answers for the demo flows are committed in src/lib/gemini-cache.json so a fresh instance works without Vertex.

const runtimeCacheFile = () => path.join(dataDir(), "gemini-cache.json");

function readRuntimeCache(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(runtimeCacheFile(), "utf8"));
  } catch {
    return {};
  }
}

function readCache(key: string): string | undefined {
  return readRuntimeCache()[key] ?? (bundledCache as Record<string, string>)[key];
}

function writeCache(key: string, text: string) {
  try {
    const all = readRuntimeCache();
    all[key] = text;
    fs.mkdirSync(path.dirname(runtimeCacheFile()), { recursive: true });
    fs.writeFileSync(runtimeCacheFile(), JSON.stringify(all, null, 2));
  } catch {}
}
