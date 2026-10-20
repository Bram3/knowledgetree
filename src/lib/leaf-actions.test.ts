import { Redirect, signInAs, signOut } from "@/test/next-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { ingestText } from "./leaf-actions";
import { IngestRejectedError } from "./ingest";
import { leavesForCompany } from "./leaves";
import { resetDb } from "./db";
import { DEMO_MAILS, mailIngestInput } from "./demo-mails";

// No GOOGLE_CLOUD_PROJECT: the real Vertex client refuses, so these run on the committed cache. No network.
delete process.env.GOOGLE_CLOUD_PROJECT;

const e1 = mailIngestInput(DEMO_MAILS.find((m) => m.id === "e1")!);

beforeEach(() => {
  resetDb();
  signOut();
});

describe("ingestText (server action)", () => {
  it("requires a signed-in user", async () => {
    await expect(ingestText(e1)).rejects.toBeInstanceOf(Redirect);
  });

  it("Lena opening the Nike Germany mail grows leaves, with the node path for display", async () => {
    await signInAs("lena");
    const res = await ingestText(e1);
    expect(res.leaves.length).toBeGreaterThan(0);
    expect(res.leaves[0].path).toEqual(["Nike EMEA", "Germany", "Nike Deutschland GmbH"]);
    expect(leavesForCompany("nike").length).toBe(res.leaves.length);
  });

  it("Amélie (no Nike access) gets nothing and nothing is stored", async () => {
    await signInAs("amelie");
    expect((await ingestText(e1)).leaves).toEqual([]);
    expect(leavesForCompany("nike")).toEqual([]);
  });

  it("rejects malformed input sent straight to the action", async () => {
    await signInAs("lena");
    await expect(ingestText({ ...e1, channel: "fax" } as never)).rejects.toBeInstanceOf(IngestRejectedError);
    await expect(ingestText({ ...e1, text: 42 } as never)).rejects.toBeInstanceOf(IngestRejectedError);
    await expect(ingestText({ ...e1, ref: "x".repeat(500) })).rejects.toBeInstanceOf(IngestRejectedError);
  });
});
