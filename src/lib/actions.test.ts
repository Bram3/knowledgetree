import { Redirect, signInAs, setRawCookie, signOut } from "@/test/next-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { addNote, addFile, uploadFile, uploadVersion, updateNote, claimItem, addVersion, archiveItem, addNode, nodeSummary, resetDemo, login } from "./actions";
import { AccessDeniedError } from "./access";
import { getCurrentUser } from "./auth";
import { resetDb } from "./db";

// Seed facts: Amélie is assigned to Basic-Fit and ArcelorMittal, not Nike.
// "nk" is the Nike EMEA root node, "bf-fr" is Basic-Fit France, "i-nk-escalation" is a Nike note.
const NIKE_NODE = "nk";
const NIKE_ITEM = "i-nk-escalation";
const OWN_NODE = "bf-fr";

const note = (nodeId: string) => ({ nodeId, title: "t", content: "c", topic: "General", scope: ["all"] });
const pdf = (name = "doc.pdf", type = "application/pdf") => new File(["%PDF-1.4 test"], name, { type });

beforeEach(() => {
  resetDb();
  signOut();
});

describe("session cookie", () => {
  it("a hand-edited cookie holding another person's id does not sign you in", async () => {
    await setRawCookie("tom");
    expect(await getCurrentUser()).toBeNull();
    await expect(addNote(note(NIKE_NODE))).rejects.toBeInstanceOf(Redirect);
  });

  it("login sets a cookie that signs you in as that person", async () => {
    await expect(login("amelie")).rejects.toBeInstanceOf(Redirect);
    expect((await getCurrentUser())?.id).toBe("amelie");
  });
});

describe("as Amélie, actions on a Nike node are rejected", () => {
  beforeEach(() => signInAs("amelie"));

  it("addNote", async () => {
    await expect(addNote(note(NIKE_NODE))).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("addFile", async () => {
    await expect(addFile({ ...note(NIKE_NODE), fileName: "x.pdf" })).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("uploadFile", async () => {
    const fd = new FormData();
    fd.set("nodeId", NIKE_NODE);
    fd.set("file", pdf());
    await expect(uploadFile(fd)).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("uploadVersion", async () => {
    const fd = new FormData();
    fd.set("itemId", NIKE_ITEM);
    fd.set("file", pdf());
    await expect(uploadVersion(fd)).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it.each([
    ["updateNote", () => updateNote(NIKE_ITEM, "hacked", "x")],
    ["claimItem", () => claimItem(NIKE_ITEM)],
    ["addVersion", () => addVersion(NIKE_ITEM, "x")],
    ["archiveItem", () => archiveItem(NIKE_ITEM)],
    ["nodeSummary", () => nodeSummary(NIKE_NODE)],
  ])("%s", async (_name, call) => {
    await expect(call()).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("addNode under a Nike parent", async () => {
    await expect(addNode({ companyId: "nike", parentId: NIKE_NODE, name: "x", type: "team" })).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("addNode claiming her own customer but hanging under a Nike parent", async () => {
    await expect(addNode({ companyId: "basicfit", parentId: NIKE_NODE, name: "x", type: "team" })).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("an unknown item or node is rejected too", async () => {
    await expect(archiveItem("does-not-exist")).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(addNote(note("does-not-exist"))).rejects.toBeInstanceOf(AccessDeniedError);
  });
});

describe("as Amélie, actions on her own customer still work", () => {
  beforeEach(() => signInAs("amelie"));

  it("adds a note and reads it back in the node summary", async () => {
    await addNote({ ...note(OWN_NODE), title: "Own note" });
    const summary = await nodeSummary(OWN_NODE);
    expect(summary?.items.map((i) => i.title)).toContain("Own note");
  });

  it("adds a child node", async () => {
    await expect(addNode({ companyId: "basicfit", parentId: OWN_NODE, name: "Paris", type: "entity" })).resolves.toEqual(expect.any(String));
  });
});

describe("reset demo data", () => {
  it("is refused without a signed-in session", async () => {
    await expect(resetDemo()).rejects.toBeInstanceOf(Redirect);
  });
});
