import { signInAs, signOut } from "@/test/next-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { addFile, uploadFile, uploadVersion } from "./actions";
import { AccessDeniedError } from "./access";
import { UploadRejectedError } from "./uploads";
import { MAX_UPLOAD_BYTES } from "./upload-rules";
import { getDb, resetDb } from "./db";
import { GET as getUpload } from "@/app/api/files/[name]/route";
import { GET as getSeedFile } from "@/app/files/[name]/route";

const OWN_NODE = "bf-fr"; // Basic-Fit France, Amélie's customer

function form(fields: Record<string, string | File>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}
const file = (name: string, body = "hello", type = "") => new File([body], name, { type });

async function upload(name: string, body = "%PDF-1.4 test", nodeId = OWN_NODE) {
  const id = await uploadFile(form({ nodeId, file: file(name, body) }));
  return getDb().items.find((i) => i.id === id)!;
}

function fetchUpload(fileUrl: string) {
  const name = fileUrl.replace("/api/files/", "");
  return getUpload(new Request(`http://localhost${fileUrl}`), { params: Promise.resolve({ name }) });
}
function fetchSeed(name: string) {
  return getSeedFile(new Request(`http://localhost/files/${name}`), { params: Promise.resolve({ name }) });
}

beforeEach(async () => {
  resetDb();
  signOut();
  await signInAs("amelie");
});

describe("upload validation", () => {
  it.each(["logo.svg", "page.html", "page.htm", "script.js", "tool.exe", "noextension"])("refuses %s", async (name) => {
    await expect(uploadFile(form({ nodeId: OWN_NODE, file: file(name, "<svg onload=alert(1)>") }))).rejects.toBeInstanceOf(UploadRejectedError);
  });

  it("refuses a file over the size limit", async () => {
    const big = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "big.pdf");
    await expect(uploadFile(form({ nodeId: OWN_NODE, file: big }))).rejects.toBeInstanceOf(UploadRejectedError);
  });

  it("refuses an SVG as a new version too", async () => {
    const item = await upload("ok.pdf");
    await expect(uploadVersion(form({ itemId: item.id, file: file("evil.svg") }))).rejects.toBeInstanceOf(UploadRejectedError);
  });

  it.each(["report.pdf", "data.xlsx", "letter.docx", "deck.pptx", "photo.png", "notes.txt", "list.csv"])("accepts %s", async (name) => {
    const item = await upload(name);
    expect(item.fileUrl).toMatch(/^\/api\/files\//);
  });
});

describe("serving uploads", () => {
  it("serves a PDF inline with nosniff", async () => {
    const item = await upload("report.pdf");
    const res = await fetchUpload(item.fileUrl!);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toMatch(/^inline;/);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("serves anything that isn't a PDF as a download", async () => {
    for (const name of ["data.xlsx", "photo.png", "notes.txt"]) {
      const item = await upload(name, "x");
      const res = await fetchUpload(item.fileUrl!);
      expect(res.headers.get("content-disposition"), name).toMatch(/^attachment;/);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    }
  });

  it("escapes the original file name in the header", async () => {
    const item = await upload('Réunion "x"\r\nSet-Cookie: a=b.xlsx', "x");
    const cd = (await fetchUpload(item.fileUrl!)).headers.get("content-disposition")!;
    expect(cd).not.toMatch(/[\r\n]/);
    expect(cd).toContain("filename*=UTF-8''R%C3%A9union%20%22x%22");
    const plain = cd.match(/filename="([^"]*)"/)![1];
    expect(plain).toMatch(/^[\x20-\x7e]*$/);
  });

  it("returns 404 for a Nike upload when signed in as Amélie", async () => {
    await signInAs("tom");
    const nike = await upload("nike.pdf", "%PDF", "nk");
    await signInAs("amelie");
    expect((await fetchUpload(nike.fileUrl!)).status).toBe(404);
  });

  it("returns 401 when not signed in", async () => {
    const item = await upload("report.pdf");
    signOut();
    expect((await fetchUpload(item.fileUrl!)).status).toBe(401);
  });

  it("returns 404 for a stored file no item points to", async () => {
    expect((await fetchUpload("/api/files/f-abc123-ghost.pdf")).status).toBe(404);
  });
});

describe("linking existing files with addFile", () => {
  const link = (fileUrl: string, previewUrl?: string) => addFile({ nodeId: OWN_NODE, title: "t", fileName: "x.pdf", fileUrl, previewUrl, content: "", topic: "", scope: [] });

  it("can't borrow another customer's document by pointing at its URL", async () => {
    await expect(link("/files/Nike_EMEA_MSA_2024_signed.pdf")).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(link("/files/ok.pdf", "/files/i-nk-msa.pdf")).rejects.toBeInstanceOf(AccessDeniedError);
    expect((await fetchSeed("Nike_EMEA_MSA_2024_signed.pdf")).status).toBe(404);
  });

  it("can't link outside the file routes", async () => {
    await expect(link("https://evil.example/x.pdf")).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(link("javascript:alert(1)")).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(link("/files/../db.json")).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("can't file another customer's mailbox attachment that nobody has filed yet", async () => {
    await expect(link("/files/Nike_DE_Payroll_Calendar_Q4_2026.xlsx")).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(link("/files/ok.pdf", "/files/att-nike-de-calendar.pdf")).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(link("/files/att-nike-de-calendar.pdf")).rejects.toBeInstanceOf(AccessDeniedError);
    expect((await fetchSeed("att-nike-de-calendar.pdf")).status).toBe(404);
    expect((await fetchSeed("Nike_DE_Payroll_Calendar_Q4_2026.xlsx")).status).toBe(404);
  });

  it("can't move a document to another customer, even with access to both", async () => {
    await signInAs("tom");
    const onVrt = (fileUrl: string) => addFile({ nodeId: "vrt", title: "t", fileName: "x.pdf", fileUrl, content: "", topic: "", scope: [] });
    await expect(onVrt("/files/Nike_EMEA_MSA_2024_signed.pdf")).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(onVrt("/files/Nike_DE_Payroll_Calendar_Q4_2026.xlsx")).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("can file a mailbox attachment nobody has filed yet (Outlook capture)", async () => {
    await signInAs("tom");
    await expect(addFile({ nodeId: "nk-de", title: "t", fileName: "Nike_DE_Payroll_Calendar_Q4_2026.xlsx", fileUrl: "/files/Nike_DE_Payroll_Calendar_Q4_2026.xlsx", previewUrl: "/files/att-nike-de-calendar.pdf", content: "", topic: "", scope: [] })).resolves.toEqual(expect.any(String));
    expect((await fetchSeed("att-nike-de-calendar.pdf")).status).toBe(200);
  });
});

describe("serving seeded demo documents", () => {
  it("returns 404 for a Nike document when signed in as Amélie", async () => {
    expect((await fetchSeed("Nike_EMEA_MSA_2024_signed.pdf")).status).toBe(404);
    expect((await fetchSeed("i-nk-msa.pdf")).status).toBe(404);
  });

  it("serves a Nike document to someone assigned to Nike", async () => {
    await signInAs("tom");
    const res = await fetchSeed("Nike_EMEA_MSA_2024_signed.pdf");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
  });

  it("serves Amélie's own customer documents, spreadsheets as downloads", async () => {
    const res = await fetchSeed("BasicFit_Payroll_SLA_2024.pdf");
    expect(res.status).toBe(200);
    const xlsx = await fetchSeed("AM_Gent_Shift_Premiums_2026.xlsx");
    expect(xlsx.status).toBe(200);
    expect(xlsx.headers.get("content-disposition")).toMatch(/^attachment;/);
  });

  it("returns 401 when not signed in", async () => {
    signOut();
    expect((await fetchSeed("BasicFit_Payroll_SLA_2024.pdf")).status).toBe(401);
  });
});
