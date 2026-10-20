import { Redirect, signInAs, setRawCookie, signOut } from "@/test/next-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { addNote, addFile, uploadFile, uploadVersion, updateNote, claimItem, addVersion, archiveItem, addNode, nodeSummary, resetDemo, login, askBot, suggestNode } from "./actions";
import { AccessDeniedError } from "./access";
import { getCurrentUser } from "./auth";
import { getDb, resetDb } from "./db";
import { ValidationError } from "./validation";

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

describe("malformed or oversized input is rejected before anything is stored", () => {
  // Server actions are plain POST endpoints: the arguments are whatever the caller sends.
  const OWN_NOTE = "i-bf-nl-cutoff";
  const OWN_FILE = "i-bf-fr-bonus";
  const long = (n: number) => "x".repeat(n);
  const bad = (p: Promise<unknown>) => expect(p).rejects.toBeInstanceOf(ValidationError);
  const versionForm = (fields: Record<string, string | File>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    return fd;
  };

  beforeEach(() => signInAs("amelie"));

  it("addNote checks every field", async () => {
    await bad(addNote({ ...note(OWN_NODE), content: long(20_001) }));
    await bad(addNote({ ...note(OWN_NODE), title: long(201) }));
    await bad(addNote({ ...note(OWN_NODE), title: 42 as unknown as string }));
    await bad(addNote({ ...note(OWN_NODE), topic: long(201) }));
    await bad(addNote({ ...note(OWN_NODE), origin: "admin" as "sdworx" }));
    await bad(addNote({ ...note(OWN_NODE), scope: "all" as unknown as string[] }));
    await bad(addNote({ ...note(OWN_NODE), scope: Array(51).fill("BE") }));
    await bad(addNote({ ...note(OWN_NODE), source: { type: "system" as "portal", ref: "" } }));
    await bad(addNote({ ...note(OWN_NODE), source: { type: "teams", ref: long(201) } }));
    await bad(addNote(null as unknown as Parameters<typeof addNote>[0]));
    expect(getDb().items.filter((i) => i.nodeId === OWN_NODE && i.kind === "note" && i.createdById === "amelie")).toEqual([]);
  });

  it("addFile checks its text fields", async () => {
    const file = { nodeId: OWN_NODE, title: "t", fileName: "x.pdf", content: "", topic: "", scope: [] };
    await bad(addFile({ ...file, fileName: long(201) }));
    await bad(addFile({ ...file, content: long(20_001) }));
    await bad(addFile({ ...file, fileUrl: 7 as unknown as string }));
  });

  it("updateNote, addVersion and uploadVersion bound the text", async () => {
    await bad(updateNote(OWN_NOTE, long(20_001), "edit"));
    await bad(updateNote(OWN_NOTE, "ok", long(201)));
    await bad(updateNote(OWN_NOTE, { evil: true } as unknown as string, "edit"));
    await bad(addVersion(OWN_FILE, long(201)));
    await bad(uploadVersion(versionForm({ itemId: OWN_FILE, note: long(201) })));
  });

  it("a new file version only goes on a document, not on a note", async () => {
    await bad(uploadVersion(versionForm({ itemId: OWN_NOTE, file: pdf() })));
    expect(getDb().items.find((i) => i.id === OWN_NOTE)?.fileUrl).toBeUndefined();
  });

  it("addNode only creates the node types the form offers", async () => {
    const child = { companyId: "basicfit", parentId: OWN_NODE, name: "Paris", type: "entity" as const };
    await bad(addNode({ ...child, type: "group" as "entity" }));
    await bad(addNode({ ...child, name: long(201) }));
    await bad(addNode({ ...child, name: "  " }));
    await bad(addNode({ ...child, country: "../../x" }));
    await expect(addNode({ ...child, country: "FR" })).resolves.toEqual(expect.any(String));
  });

  it("the Teams bot and Outlook suggestion bound the text they search", async () => {
    await bad(askBot(long(2_001)));
    await bad(suggestNode(long(20_001)));
    await bad(askBot(5 as unknown as string));
  });
});

describe("reset demo data", () => {
  it("is refused without a signed-in session", async () => {
    await expect(resetDemo()).rejects.toBeInstanceOf(Redirect);
  });
});
