import { Redirect, signInAs, signOut } from "@/test/next-mocks";
import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { person, resetDb } from "./db";
import { ingestDemoCall } from "./demo-call";
import { ingestAudio } from "./audio-ingest";
import { leavesForCompany } from "./leaves";
import { endDemoCall, ingestText, undoLeaves } from "./leaf-actions";
import { AccessDeniedError } from "./access";
import { DEMO_MAILS, mailIngestInput } from "./demo-mails";
import type { ModelClient, ModelRequest } from "./gemini";

// Vertex unreachable (it has been answering 429): every model call fails, so the committed cache answers. No network.
delete process.env.GOOGLE_CLOUD_PROJECT;
const down: ModelClient = { generate: async () => { throw new Error("429 RESOURCE_EXHAUSTED"); } };

const transcript = fs.readFileSync(path.join(process.cwd(), "public/demo/nike-call-transcript.txt"), "utf8");
const lena = () => person("lena")!;

beforeEach(async () => {
  resetDb();
  signOut();
  await signInAs("lena");
});

describe("ending the demo call with Katrin (scene 1)", () => {
  it("grows the cutoff change, the Betriebsrat attention point and Jonas' expertise on Nike Deutschland GmbH › Payroll, with Vertex down", async () => {
    const { leaves } = await ingestDemoCall(lena(), { model: down });
    expect(leaves.map((l) => l.type).sort()).toEqual(["attention", "change", "expertise"]);
    for (const l of leaves) {
      expect(l).toMatchObject({ nodeId: "nk-de-gmbh", category: "payroll", status: "auto", source: { channel: "call", trigger: "auto", byId: "lena", from: "Katrin Vogel" } });
      expect(transcript.toLowerCase()).toContain(l.quote.toLowerCase());
    }
    expect(leaves.find((l) => l.type === "change")!.statement).toMatch(/20th/);
    expect(leaves.find((l) => l.type === "attention")!.statement).toMatch(/Betriebsrat/);
    expect(leaves.find((l) => l.type === "expertise")!.people).toContain("Jonas Becker");
  });

  it("ignores the small talk", async () => {
    const { leaves } = await ingestDemoCall(lena(), { model: down });
    const quotes = leaves.map((l) => l.quote).join(" ");
    expect(quotes).not.toMatch(/weekend|sun|great week|bye/i);
  });

  it("stores no raw audio or full transcript, only the leaves with their quotes and a reference to the call", async () => {
    const { leaves } = await ingestDemoCall(lena(), { model: down });
    const stored = JSON.stringify(leavesForCompany("nike"));
    expect(leavesForCompany("nike")).toHaveLength(leaves.length);
    expect(stored).not.toContain("Good weekend");
    expect(stored).not.toContain("SUQz"); // base64 of an MP3 ID3 header
    expect(leaves[0].source.ref).toMatch(/^call:/);
  });
});

describe("hanging up and undo (server actions)", () => {
  it("hanging up requires a signed-in user", async () => {
    signOut();
    await expect(endDemoCall()).rejects.toBeInstanceOf(Redirect);
  });

  it("hanging up returns the three leaves with their node path for the toast", async () => {
    const res = await endDemoCall();
    expect(res.leaves).toHaveLength(3);
    expect(res.companyId).toBe("nike");
    expect(res.leaves[0].path).toEqual(["Nike EMEA", "Germany", "Nike Deutschland GmbH"]);
  });

  it("undo removes exactly the leaves the call caught", async () => {
    const mail = await ingestText(mailIngestInput(DEMO_MAILS.find((m) => m.id === "e1")!));
    const call = await endDemoCall();
    await undoLeaves(call.leaves.map((l) => l.id));
    expect(leavesForCompany("nike").map((l) => l.id).sort()).toEqual(mail.leaves.map((l) => l.id).sort());
  });

  it("someone else can't undo Lena's leaves, not even with access to Nike", async () => {
    const call = await endDemoCall();
    const ids = call.leaves.map((l) => l.id);
    for (const who of ["amelie", "tom"]) {
      await signInAs(who);
      await expect(undoLeaves(ids)).rejects.toBeInstanceOf(AccessDeniedError);
    }
    expect(leavesForCompany("nike")).toHaveLength(3);
  });

  it("rejects ids that are not a list of strings", async () => {
    await expect(undoLeaves("l1" as never)).rejects.toThrow();
    await expect(undoLeaves(["nope"])).rejects.toBeInstanceOf(AccessDeniedError);
  });
});

describe("ingestAudio (shared by the call and the voice note)", () => {
  const unknownAudio = { mimeType: "audio/mpeg", data: Buffer.from("not cached anywhere").toString("base64") };
  const input = { channel: "call" as const, trigger: "auto" as const, ref: "call:test", from: "Katrin Vogel", audio: unknownAudio };

  it("uses the fixed transcript when transcription fails and nothing is cached", async () => {
    const res = await ingestAudio(lena(), { ...input, fallbackTranscript: transcript }, { model: down });
    expect(res.transcriptFrom).toBe("fallback");
    expect(res.leaves.map((l) => l.type).sort()).toEqual(["attention", "change", "expertise"]);
  });

  it("sends Gemini's transcript through ingest, with the audio inline", async () => {
    const seen: ModelRequest[] = [];
    const model: ModelClient = {
      generate: async (req) => {
        seen.push(req);
        if (req.parts.some((p) => "inlineData" in p)) return "Katrin: Jonas handled the Betriebsrat approval for Nike Deutschland GmbH last year.";
        return JSON.stringify({ leaves: [{ type: "expertise", statement: "Jonas knows the Betriebsrat approval.", why: null, quote: "Jonas handled the Betriebsrat approval", people: ["Jonas Becker"], confidence: 0.9, nodeId: "nk-de-gmbh", category: "payroll" }] });
      },
    };
    const res = await ingestAudio(lena(), { ...input, ref: "call:live", fallbackTranscript: transcript }, { model });
    expect(res.transcriptFrom).toBe("model");
    expect(seen[0].parts).toContainEqual({ inlineData: unknownAudio });
    expect(res.leaves).toHaveLength(1);
    expect(res.leaves[0]).toMatchObject({ quote: "Jonas handled the Betriebsrat approval", nodeId: "nk-de-gmbh", source: { ref: "call:live" } });
  });

  it("grows nothing when there is no transcript at all", async () => {
    const silence = { mimeType: "audio/mpeg", data: Buffer.from("never transcribed").toString("base64") };
    const res = await ingestAudio(lena(), { ...input, audio: silence }, { model: down });
    expect(res).toMatchObject({ leaves: [], transcriptFrom: "none" });
  });
});
