import { generate, cacheKeyFor, type ModelClient } from "./gemini";
import { ingest, type IngestDeps, type IngestInput, type IngestResult } from "./ingest";
import type { Person } from "./types";

/**
 * Audio in, leaves out: Gemini transcribes the recording, then the transcript goes through the same
 * `ingest()` entry point as mail and Teams. Shared by the call mock (#6) and the voice note (#12).
 *
 * Neither the audio nor the transcript is stored: only the leaves (with their quotes) and `ref` are kept.
 */
export type Audio = { mimeType: string; data: string }; // data = base64

export type AudioIngestInput = Omit<IngestInput, "text"> & {
  audio: Audio;
  /** Used when transcription fails and nothing is cached, e.g. the script that ships with the demo audio. */
  fallbackTranscript?: string;
};

export type AudioIngestResult = IngestResult & { transcriptFrom: "model" | "cache" | "fallback" | "none" };

/** Transcribe audio with Gemini (cache fallback). Returns null if the model fails and nothing is cached. */
export async function transcribe(audio: Audio, deps: { model?: ModelClient } = {}) {
  return generate(
    { system: TRANSCRIBE_SYSTEM, parts: [{ inlineData: audio }, { text: "Transcribe this recording." }] },
    { cacheKey: cacheKeyFor("transcript", audio.data), client: deps.model },
  );
}

export async function ingestAudio(user: Person, input: AudioIngestInput, deps: IngestDeps = {}): Promise<AudioIngestResult> {
  const { audio, fallbackTranscript, ...rest } = input;
  const t = await transcribe(audio, deps);
  const text = t?.text.trim() ? t.text : fallbackTranscript;
  if (!text?.trim()) return { leaves: [], companyId: null, transcriptFrom: "none" };
  const res = await ingest(user, { ...rest, text }, deps);
  return { ...res, transcriptFrom: t?.text.trim() ? t.from : "fallback" };
}

const TRANSCRIBE_SYSTEM = `You transcribe a work call or voice note between an SD Worx consultant and a customer.
Write exactly what is said, in the spoken language, one speaker turn per line as "Name: text".
Use first names when the speakers introduce themselves, otherwise "Speaker 1", "Speaker 2".
Write numbers the way they are spoken. Return only the transcript.`;
