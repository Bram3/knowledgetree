import fs from "fs/promises";
import path from "path";
import { ingestAudio, type AudioIngestResult } from "./audio-ingest";
import type { IngestDeps } from "./ingest";
import type { Person } from "./types";

/**
 * The demo call (scene 1): Lena on the phone with Katrin Vogel, Head of Payroll at Nike Germany.
 * The audio and its script ship in public/demo (ticket #4). The server reads the audio itself,
 * so the client never uploads it and the call action takes no input.
 */
export const DEMO_CALL = {
  ref: "call:nike-katrin-1",
  with: "Katrin Vogel",
  role: "Head of Payroll, Nike Germany",
  audioUrl: "/demo/nike-call.mp3",
  mimeType: "audio/mpeg",
} as const;

const demoFile = (name: string) => path.join(process.cwd(), "public", "demo", name);

/** Audio of the demo call as base64 (the cache key for its transcript). */
export async function demoCallAudio() {
  return { mimeType: DEMO_CALL.mimeType, data: (await fs.readFile(demoFile("nike-call.mp3"))).toString("base64") };
}

/** The script the audio was generated from: the transcript when Gemini can't transcribe. */
export function demoCallTranscript() {
  return fs.readFile(demoFile("nike-call-transcript.txt"), "utf8");
}

/** Hang up: transcribe the call and ingest it on the call channel with trigger "auto". */
export async function ingestDemoCall(user: Person, deps: IngestDeps = {}): Promise<AudioIngestResult> {
  const [audio, fallbackTranscript] = await Promise.all([demoCallAudio(), demoCallTranscript()]);
  return ingestAudio(user, { channel: "call", trigger: "auto", ref: DEMO_CALL.ref, from: DEMO_CALL.with, audio, fallbackTranscript }, deps);
}
