import type { Db, Item } from "./types";

// Demo clock: 2026-09-30
const d = (daysAgo: number, hour = 10) => {
  const t = new Date(Date.UTC(2026, 8, 30, hour, 0, 0));
  t.setUTCDate(t.getUTCDate() - daysAgo);
  return t.toISOString();
};

const people = [
  { id: "lena", name: "Lena Vermeulen", role: "Payroll Consultant", initials: "LV", color: "bg-[#001c52]", email: "lena.vermeulen@sdworx.com", customerIds: ["nike", "vandervalk"] },
  { id: "sofie", name: "Sofie De Smet", role: "Senior Payroll Consultant", initials: "SD", color: "bg-[#f1002f]", email: "sofie.desmet@sdworx.com", customerIds: ["nike", "vrt", "basicfit"] },
  { id: "jonas", name: "Jonas Becker", role: "Payroll Expert Germany", initials: "JB", color: "bg-[#006dd8]", email: "jonas.becker@sdworx.com", customerIds: ["nike", "arcelormittal"] },
  { id: "marta", name: "Marta Kowalski", role: "Account Lead", initials: "MK", color: "bg-[#f28f29]", email: "marta.kowalski@sdworx.com", customerIds: ["nike", "arcelormittal"] },
  { id: "pieter", name: "Pieter Janssens", role: "Payroll Consultant NL", initials: "PJ", color: "bg-[#009559]", email: "pieter.janssens@sdworx.com", customerIds: ["vandervalk", "basicfit"] },
  { id: "amelie", name: "Amélie Dubois", role: "HR Services Consultant FR", initials: "AD", color: "bg-[#9051e1]", email: "amelie.dubois@sdworx.com", customerIds: ["basicfit", "arcelormittal"] },
  { id: "tom", name: "Tom Verhaeghe", role: "Legal & Compliance", initials: "TV", color: "bg-[#737476]", email: "tom.verhaeghe@sdworx.com", customerIds: ["nike", "vandervalk", "vrt", "arcelormittal", "basicfit"] },
];

const companies = [
  { id: "nike", name: "Nike EMEA", industry: "Sportswear & Retail", accent: "#111827", accountLeadId: "marta", since: "2017", products: ["payroll", "time", "hr-admin", "contract"], keywords: ["nike"], logoUrl: "/logos/nike.svg" },
  { id: "vandervalk", name: "Van der Valk Hotels", industry: "Hospitality", accent: "#b45309", accountLeadId: "pieter", since: "2014", products: ["payroll", "time", "hr-admin"], keywords: ["van der valk", "valk"], logoUrl: "/logos/vandervalk.png" },
  { id: "vrt", name: "VRT", industry: "Media & Broadcasting", accent: "#0f172a", accountLeadId: "sofie", since: "2019", products: ["payroll", "legal", "hr-admin", "reporting"], keywords: ["vrt"], logoUrl: "/logos/vrt.svg" },
  { id: "arcelormittal", name: "ArcelorMittal", industry: "Steel & Mining", accent: "#c2410c", accountLeadId: "marta", since: "2012", products: ["payroll", "legal", "reporting", "contract"], keywords: ["arcelor", "arcelormittal"], logoUrl: "/logos/arcelormittal.svg" },
  { id: "basicfit", name: "Basic-Fit", industry: "Fitness & Leisure", accent: "#ea580c", accountLeadId: "pieter", since: "2020", products: ["payroll", "hr-admin", "time", "reporting"], keywords: ["basic-fit", "basic fit", "basicfit"], logoUrl: "/logos/basicfit.png" },
];

const nodes = [
  // Nike
  { id: "nk", companyId: "nike", parentId: null, name: "Nike EMEA", type: "group" as const, expertIds: ["marta", "sofie"], contacts: [{ name: "Ingrid Haas", role: "HR Director EMEA", email: "ingrid.haas@nike.com" }] },
  { id: "nk-be", companyId: "nike", parentId: "nk", name: "Belgium", type: "country" as const, country: "BE", expertIds: ["sofie", "lena"], contacts: [{ name: "Bart Claes", role: "HR Manager Belgium", email: "bart.claes@nike.com" }] },
  { id: "nk-be-elc", companyId: "nike", parentId: "nk-be", name: "European Logistics Campus Laakdal", type: "entity" as const, country: "BE", expertIds: ["sofie"] },
  { id: "nk-be-retail", companyId: "nike", parentId: "nk-be", name: "Nike Retail Belgium", type: "entity" as const, country: "BE", expertIds: ["lena"] },
  { id: "nk-nl", companyId: "nike", parentId: "nk", name: "Netherlands", type: "country" as const, country: "NL", expertIds: ["pieter"], contacts: [{ name: "Anouk de Vries", role: "HR Business Partner", email: "anouk.devries@nike.com" }] },
  { id: "nk-nl-ehq", companyId: "nike", parentId: "nk-nl", name: "European HQ Hilversum", type: "entity" as const, country: "NL", expertIds: ["pieter"] },
  { id: "nk-de", companyId: "nike", parentId: "nk", name: "Germany", type: "country" as const, country: "DE", expertIds: ["jonas"], contacts: [{ name: "Katrin Vogel", role: "Head of Payroll Germany", email: "katrin.vogel@nike.com" }] },
  { id: "nk-de-gmbh", companyId: "nike", parentId: "nk-de", name: "Nike Deutschland GmbH", type: "entity" as const, country: "DE", expertIds: ["jonas"] },
  { id: "nk-de-retail", companyId: "nike", parentId: "nk-de", name: "Nike Retail Germany", type: "entity" as const, country: "DE", expertIds: [] },
  // Van der Valk
  { id: "vv", companyId: "vandervalk", parentId: null, name: "Van der Valk Hotels", type: "group" as const, expertIds: ["pieter"] },
  { id: "vv-nl", companyId: "vandervalk", parentId: "vv", name: "Netherlands", type: "country" as const, country: "NL", expertIds: ["pieter"] },
  { id: "vv-nl-ams", companyId: "vandervalk", parentId: "vv-nl", name: "Hotel Amsterdam", type: "entity" as const, country: "NL", expertIds: ["pieter"] },
  { id: "vv-nl-ehv", companyId: "vandervalk", parentId: "vv-nl", name: "Hotel Eindhoven", type: "entity" as const, country: "NL", expertIds: [] },
  { id: "vv-be", companyId: "vandervalk", parentId: "vv", name: "Belgium", type: "country" as const, country: "BE", expertIds: ["lena"] },
  { id: "vv-be-bru", companyId: "vandervalk", parentId: "vv-be", name: "Hotel Brussels Airport", type: "entity" as const, country: "BE", expertIds: ["lena"] },
  { id: "vv-be-mec", companyId: "vandervalk", parentId: "vv-be", name: "Hotel Mechelen", type: "entity" as const, country: "BE", expertIds: [] },
  { id: "vv-de", companyId: "vandervalk", parentId: "vv", name: "Germany", type: "country" as const, country: "DE", expertIds: [] },
  { id: "vv-de-dus", companyId: "vandervalk", parentId: "vv-de", name: "Hotel Düsseldorf", type: "entity" as const, country: "DE", expertIds: [] },
  // VRT
  { id: "vrt", companyId: "vrt", parentId: null, name: "VRT", type: "group" as const, expertIds: ["sofie", "tom"] },
  { id: "vrt-be", companyId: "vrt", parentId: "vrt", name: "Belgium", type: "country" as const, country: "BE", expertIds: ["sofie"] },
  { id: "vrt-radio", companyId: "vrt", parentId: "vrt-be", name: "Radio", type: "division" as const, country: "BE", expertIds: [] },
  { id: "vrt-tv", companyId: "vrt", parentId: "vrt-be", name: "Television", type: "division" as const, country: "BE", expertIds: [] },
  { id: "vrt-digital", companyId: "vrt", parentId: "vrt-be", name: "Digital & Innovation", type: "division" as const, country: "BE", expertIds: [] },
  // ArcelorMittal
  { id: "am", companyId: "arcelormittal", parentId: null, name: "ArcelorMittal Europe", type: "group" as const, expertIds: ["marta"] },
  { id: "am-be", companyId: "arcelormittal", parentId: "am", name: "Belgium", type: "country" as const, country: "BE", expertIds: ["tom"] },
  { id: "am-be-gent", companyId: "arcelormittal", parentId: "am-be", name: "ArcelorMittal Gent", type: "entity" as const, country: "BE", expertIds: ["tom"] },
  { id: "am-fr", companyId: "arcelormittal", parentId: "am", name: "France", type: "country" as const, country: "FR", expertIds: ["amelie"] },
  { id: "am-fr-dk", companyId: "arcelormittal", parentId: "am-fr", name: "ArcelorMittal Dunkerque", type: "entity" as const, country: "FR", expertIds: ["amelie"] },
  { id: "am-de", companyId: "arcelormittal", parentId: "am", name: "Germany", type: "country" as const, country: "DE", expertIds: ["jonas"] },
  { id: "am-de-bremen", companyId: "arcelormittal", parentId: "am-de", name: "ArcelorMittal Bremen", type: "entity" as const, country: "DE", expertIds: ["jonas"] },
  // Basic-Fit
  { id: "bf", companyId: "basicfit", parentId: null, name: "Basic-Fit Group", type: "group" as const, expertIds: ["pieter"] },
  { id: "bf-nl", companyId: "basicfit", parentId: "bf", name: "Netherlands", type: "country" as const, country: "NL", expertIds: ["pieter"] },
  { id: "bf-be", companyId: "basicfit", parentId: "bf", name: "Belgium", type: "country" as const, country: "BE", expertIds: ["sofie"] },
  { id: "bf-fr", companyId: "basicfit", parentId: "bf", name: "France", type: "country" as const, country: "FR", expertIds: ["amelie"] },
  { id: "bf-es", companyId: "basicfit", parentId: "bf", name: "Spain", type: "country" as const, country: "ES", expertIds: [] },
  { id: "bf-de", companyId: "basicfit", parentId: "bf", name: "Germany", type: "country" as const, country: "DE", expertIds: [] },
];

type ItemSeed = Omit<Item, "versions" | "status" | "source" | "updatedAt" | "verifiedById" | "verifiedAt" | "origin"> & Partial<Pick<Item, "versions" | "status" | "source" | "updatedAt" | "supersededById" | "verifiedById" | "verifiedAt" | "origin">>;

const withFiles = (i: Item): Item => {
  if (i.kind !== "file" || !i.fileName) return i;
  const ext = i.fileName.split(".").pop()?.toLowerCase();
  const preview = `/files/${i.id}.pdf`;
  return { ...i, previewUrl: preview, fileUrl: ext === "pptx" ? preview : `/files/${i.fileName}` };
};

const mk = (i: ItemSeed): Item => withFiles({
  versions: [{ version: 1, byId: i.createdById, at: i.createdAt, note: "Initial version" }],
  status: "active",
  source: { type: "portal", ref: "" },
  updatedAt: i.createdAt,
  verifiedById: null,
  verifiedAt: null,
  origin: "sdworx",
  ...i,
});

const items: Item[] = [
  // ---- Nike group
  mk({ id: "i-nk-msa", nodeId: "nk", kind: "file", title: "Master Service Agreement 2024", fileName: "Nike_EMEA_MSA_2024_signed.pdf", fileSize: "2.4 MB", content: "Framework agreement for payroll, time & attendance and HR administration services for all Nike entities in BE, NL and DE. Includes SLA appendix and price schedule.", topic: "Contract", category: "contract", scope: ["all"], ownerId: "marta", createdById: "marta", createdAt: d(620),
    versions: [{ version: 1, byId: "marta", at: d(620), note: "Signed version" }, { version: 2, byId: "tom", at: d(300), note: "Added SLA appendix B (data retention)" }, { version: 3, byId: "marta", at: d(40), note: "2026 price schedule" }], updatedAt: d(40) }),
  mk({ id: "i-nk-escalation", nodeId: "nk", kind: "note", title: "Escalation matrix", content: "| Level | Who | When |\n| --- | --- | --- |\n| 1 | Consultant on the entity | First contact, same day |\n| 2 | Account lead **Marta Kowalski** | No answer within 4 business hours |\n| 3 | Ingrid Haas (HR Director EMEA) + SD Worx service delivery manager | Payroll run at risk |\n\nNike expects a reply within **4 business hours** on payroll-impacting questions.", topic: "Escalation", category: "contract", scope: ["all"], ownerId: "marta", createdById: "marta", createdAt: d(400), updatedAt: d(15),
    versions: [{ version: 1, byId: "marta", at: d(400), note: "Initial version" }, { version: 2, byId: "marta", at: d(15), note: "New HR Director EMEA" }] }),
  mk({ id: "i-nk-calendar", nodeId: "nk", kind: "file", title: "EMEA payroll calendar 2026", fileName: "Nike_EMEA_Payroll_Calendar_2026.xlsx", fileSize: "310 KB", content: "Pay dates, cutoff dates and bank holidays per country for 2026. Received from Nike EMEA HR operations.", topic: "Payroll calendar", category: "payroll", scope: ["all"], ownerId: "sofie", createdById: "sofie", createdAt: d(280), origin: "customer" }),
  mk({ id: "i-nk-orgchart", nodeId: "nk", kind: "file", title: "Nike EMEA HR organisation chart", fileName: "Nike_EMEA_HR_Org_2026.pptx", fileSize: "1.9 MB", content: "Organisation chart of the Nike EMEA HR and payroll teams, with the contact per country.", topic: "Contacts", category: "hr-admin", scope: ["all"], ownerId: "marta", createdById: "marta", createdAt: d(120), origin: "customer" }),
  // ---- Nike Belgium
  mk({ id: "i-nk-be-cutoff", nodeId: "nk-be", kind: "note", title: "Payroll cutoff Belgium: 20th of the month", content: "Input for variable pay (overtime, bonuses, absences) must be received by the 20th. Pay date is the 27th. Late input goes into a correction run on the 3rd of the following month.", topic: "Payroll cutoff", category: "payroll", scope: ["BE"], ownerId: "sofie", createdById: "sofie", createdAt: d(500), updatedAt: d(30),
    versions: [{ version: 1, byId: "sofie", at: d(500), note: "Initial version" }, { version: 2, byId: "sofie", at: d(30), note: "Correction run moved to the 3rd" }] }),
  mk({ id: "i-nk-be-jc", nodeId: "nk-be", kind: "note", title: "Joint committees: PC 226 (logistics) and PC 201 (retail)", content: "ELC Laakdal staff fall under PC 226 (international trade, transport and logistics), retail staff under PC 201. Check the CLA of 2025 before any wage indexation.", topic: "Joint committee", category: "payroll", scope: ["BE"], ownerId: "sofie", createdById: "sofie", createdAt: d(700), updatedAt: d(120),
    versions: [{ version: 1, byId: "sofie", at: d(700), note: "Initial version" }, { version: 2, byId: "tom", at: d(120), note: "Added PC 201 for retail" }] }),
  mk({ id: "i-nk-be-mandate", nodeId: "nk-be", kind: "file", title: "Social secretariat mandate", fileName: "Mandaat_Sociaal_Secretariaat_Nike_BE.pdf", fileSize: "1.1 MB", content: "Signed mandate authorising SD Worx to act towards the RSZ/ONSS on behalf of Nike Belgium.", topic: "Mandate", category: "contract", scope: ["BE"], ownerId: "tom", createdById: "tom", createdAt: d(900), origin: "customer" }),
  mk({ id: "i-nk-elc-shifts", nodeId: "nk-be-elc", kind: "file", title: "ELC shift schedule and premiums", fileName: "Nike_ELC_Laakdal_Shift_Premiums_2026.xlsx", fileSize: "220 KB", content: "Three-shift system at the European Logistics Campus. Night shift +25%, weekend +50%. Applies to blue-collar staff under PC 226.", topic: "Premiums", category: "time", scope: ["BE"], ownerId: "sofie", createdById: "sofie", createdAt: d(200), origin: "customer" }),
  mk({ id: "i-nk-elc-badge", nodeId: "nk-be-elc", kind: "note", title: "Time registration export arrives on the 19th", content: "The ELC badge system (Kronos) exports hours on the **19th at 06:00**.\n\n1. Export lands on the SD Worx SFTP folder `nike-elc-in`\n2. Missing badges are corrected by the shift leads *before* the export\n3. SD Worx imports the file the same morning and flags gaps to Bart Claes", topic: "Time registration", category: "time", scope: ["BE"], ownerId: "sofie", createdById: "sofie", createdAt: d(150) }),
  mk({ id: "i-nk-elc-onboarding", nodeId: "nk-be-elc", kind: "file", title: "ELC onboarding checklist", fileName: "Nike_ELC_Onboarding_Checklist.docx", fileSize: "96 KB", content: "Checklist for new warehouse hires: Dimona declaration, PC 226 wage scale, meal vouchers, badge request.", topic: "Onboarding", category: "hr-admin", scope: ["BE"], ownerId: "lena", createdById: "lena", createdAt: d(90) }),
  mk({ id: "i-nk-retail-be-mv", nodeId: "nk-be-retail", kind: "file", title: "Meal voucher policy retail", fileName: "Nike_Retail_BE_Meal_Vouchers.docx", fileSize: "84 KB", content: "Face value EUR 8, employer share EUR 6.91. Applies to all store staff in Belgium.", topic: "Benefits", category: "hr-admin", scope: ["BE"], ownerId: "lena", createdById: "lena", createdAt: d(60), origin: "customer" }),
  // ---- Nike Netherlands
  mk({ id: "i-nk-nl-cutoff", nodeId: "nk-nl", kind: "note", title: "Payroll cutoff Netherlands: 17th of the month", content: "Variable input by the 17th, pay date the 24th. EHQ staff are monthly paid; the Hilversum campus has a separate 4-weekly schedule for facility staff.", topic: "Payroll cutoff", category: "payroll", scope: ["NL"], ownerId: "pieter", createdById: "pieter", createdAt: d(300), updatedAt: d(60),
    versions: [{ version: 1, byId: "pieter", at: d(300), note: "Initial version" }, { version: 2, byId: "pieter", at: d(60), note: "Added facility staff schedule" }] }),
  mk({ id: "i-nk-nl-30", nodeId: "nk-nl-ehq", kind: "file", title: "30% ruling overview expats", fileName: "Nike_EHQ_30pct_ruling_overview.xlsx", fileSize: "45 KB", content: "List of 41 expat employees at EHQ with an approved 30% ruling and their end dates. Received from Nike HR Hilversum.", topic: "Expat taxation", category: "payroll", scope: ["NL"], ownerId: "pieter", createdById: "pieter", createdAt: d(210), origin: "customer" }),
  mk({ id: "i-nk-nl-wkr", nodeId: "nk-nl-ehq", kind: "note", title: "WKR budget tracking", content: "Work-related costs scheme (WKR) budget is tracked quarterly by SD Worx. Nike EHQ uses the full 1.92% free space; the Q3 2026 report showed 78% used.", topic: "WKR", category: "hr-admin", scope: ["NL"], ownerId: "pieter", createdById: "pieter", createdAt: d(20) }),
  // ---- Nike Germany (demo story)
  mk({ id: "i-nk-de-cutoff-old", nodeId: "nk-de-gmbh", kind: "note", title: "Payroll cutoff Germany: 15th of the month", content: "All variable input must be in by the 15th. Pay date is the 25th. Agreed with Katrin Vogel during onboarding.", topic: "Payroll cutoff", category: "payroll", scope: ["DE"], ownerId: "sofie", createdById: "sofie", createdAt: d(430), updatedAt: d(21), status: "superseded", supersededById: "i-nk-de-cutoff-new" }),
  mk({ id: "i-nk-de-cutoff-new", nodeId: "nk-de-gmbh", kind: "note", title: "Payroll cutoff Germany moves to the 18th", content: "From the **October 2026 run** onwards the cutoff for variable input is the **18th** instead of the 15th, at Nike's request (new time registration system).\n\n- Pay date stays the **25th**\n- Late input goes into the correction run on the 3rd\n- Confirmed in writing by Katrin Vogel (Head of Payroll Germany)\n\n> Reminder: the first run with the new cutoff is 18 October 2026.", topic: "Payroll cutoff", category: "payroll", scope: ["DE"], ownerId: "jonas", createdById: "jonas", createdAt: d(24), updatedAt: d(21),
    versions: [{ version: 1, byId: "jonas", at: d(24), note: "Initial version" }, { version: 2, byId: "jonas", at: d(21), note: "Added written confirmation from Katrin Vogel" }] }),
  mk({ id: "i-nk-de-lohnsteuer", nodeId: "nk-de-gmbh", kind: "file", title: "Lohnsteuer registration Nike Deutschland GmbH", fileName: "Lohnsteuer_Anmeldung_Nike_Deutschland.pdf", fileSize: "640 KB", content: "Registration with Finanzamt Berlin, tax number and ELSTER certificate details.", topic: "Tax registration", category: "payroll", scope: ["DE"], ownerId: "jonas", createdById: "jonas", createdAt: d(800), origin: "customer" }),
  mk({ id: "i-nk-de-time", nodeId: "nk-de-gmbh", kind: "note", title: "New time registration system from October", content: "Nike Deutschland switches from paper timesheets to the Nike EMEA time system in October 2026. Exports come through the same SFTP flow as Belgium. First export expected 19 October.", topic: "Time registration", category: "time", scope: ["DE"], ownerId: "jonas", createdById: "jonas", createdAt: d(24) }),
  mk({ id: "i-nk-de-onboarding", nodeId: "nk-de", kind: "file", title: "DE onboarding checklist", fileName: "Nike_DE_Onboarding_Checklist.xlsx", fileSize: "120 KB", content: "Checklist for new hires: Sozialversicherungsnummer, health insurance choice, tax class, DEÜV registration within 6 weeks.", topic: "Onboarding", category: "hr-admin", scope: ["DE"], ownerId: "sofie", createdById: "sofie", createdAt: d(380) }),
  mk({ id: "i-nk-de-retail", nodeId: "nk-de-retail", kind: "note", title: "Retail Germany: separate Betriebsnummer", content: "Nike Retail Germany has its own Betriebsnummer and reports separately to the Berufsgenossenschaft (BGHW). Do not merge with the GmbH payroll run.", topic: "Entity setup", category: "payroll", scope: ["DE"], ownerId: "jonas", createdById: "jonas", createdAt: d(150) }),
  // ---- Van der Valk
  mk({ id: "i-vv-sla", nodeId: "vv", kind: "file", title: "Service agreement Van der Valk 2023", fileName: "VanderValk_Service_Agreement_2023.pdf", fileSize: "1.6 MB", content: "Payroll and time & attendance outsourcing for all Van der Valk hotels in NL, BE and DE.", topic: "Contract", category: "payroll", scope: ["all"], ownerId: "pieter", createdById: "pieter", createdAt: d(1100), origin: "customer" }),
  mk({ id: "i-vv-nl-cao", nodeId: "vv-nl", kind: "note", title: "CAO Horeca applies to all Dutch hotels", content: "All Dutch hotels follow the CAO Horeca. Wage table updated 1 July 2026. Sunday allowance 50%, night allowance 20%.", topic: "Collective agreement", category: "payroll", scope: ["NL"], ownerId: "pieter", createdById: "pieter", createdAt: d(400), updatedAt: d(90),
    versions: [{ version: 1, byId: "pieter", at: d(400), note: "Initial version" }, { version: 2, byId: "pieter", at: d(90), note: "Wage table July 2026" }] }),
  mk({ id: "i-vv-ams-roster", nodeId: "vv-nl-ams", kind: "file", title: "Roster export Hotel Amsterdam", fileName: "VdV_Amsterdam_Roster_Export_Spec.pdf", fileSize: "210 KB", content: "Specification of the weekly roster export from the hotel planning system to SD Worx time & attendance.", topic: "Time registration", category: "time", scope: ["NL"], ownerId: "pieter", createdById: "pieter", createdAt: d(250), origin: "customer" }),
  mk({ id: "i-vv-be-cutoff", nodeId: "vv-be", kind: "note", title: "Payroll cutoff Belgium: 22nd", content: "Hotel managers submit hours via the planning tool by the 22nd. Pay date is the last working day of the month. PC 302 (hospitality) applies.", topic: "Payroll cutoff", category: "payroll", scope: ["BE"], ownerId: "lena", createdById: "lena", createdAt: d(200), updatedAt: d(10),
    versions: [{ version: 1, byId: "lena", at: d(200), note: "Initial version" }, { version: 2, byId: "lena", at: d(10), note: "Confirmed with hotel manager Brussels Airport" }] }),
  mk({ id: "i-vv-bru-flexi", nodeId: "vv-be-bru", kind: "file", title: "Flexi-job contracts Brussels Airport", fileName: "VdV_Brussels_Flexijobs_Q3_2026.xlsx", fileSize: "58 KB", content: "List of flexi-job workers and their quarterly declarations, received from the hotel.", topic: "Flexi-jobs", category: "hr-admin", scope: ["BE"], ownerId: "lena", createdById: "lena", createdAt: d(30), origin: "customer" }),
  // ---- VRT
  mk({ id: "i-vrt-statute", nodeId: "vrt", kind: "file", title: "VRT personnel statute 2025", fileName: "VRT_Personeelsstatuut_2025.pdf", fileSize: "3.1 MB", content: "Personnel statute for statutory and contractual staff, received from VRT HR. Basis for all pay scales.", topic: "Statute", category: "legal", scope: ["BE"], ownerId: "tom", createdById: "tom", createdAt: d(300), origin: "customer" }),
  mk({ id: "i-vrt-cutoff", nodeId: "vrt-be", kind: "note", title: "Payroll cutoff: 16th", content: "Variable input by the 16th, pay date the 25th. Freelance presenters are paid through a separate flow (not SD Worx).", topic: "Payroll cutoff", category: "payroll", scope: ["BE"], ownerId: "sofie", createdById: "sofie", createdAt: d(350), updatedAt: d(35) }),
  mk({ id: "i-vrt-report", nodeId: "vrt", kind: "file", title: "Monthly headcount report template", fileName: "VRT_Headcount_Report_Template.xlsx", fileSize: "140 KB", content: "Template for the monthly headcount and cost report per division, delivered on the 5th.", topic: "Reporting", category: "reporting", scope: ["BE"], ownerId: "sofie", createdById: "sofie", createdAt: d(180) }),
  // ---- ArcelorMittal
  mk({ id: "i-am-msa", nodeId: "am", kind: "file", title: "Framework agreement ArcelorMittal Europe", fileName: "ArcelorMittal_Framework_Agreement_2022.pdf", fileSize: "2.8 MB", content: "Framework agreement for payroll and legal services in BE, FR and DE. Addendum 2025 adds reporting.", topic: "Contract", category: "contract", scope: ["all"], ownerId: "marta", createdById: "marta", createdAt: d(1400), updatedAt: d(200),
    versions: [{ version: 1, byId: "marta", at: d(1400), note: "Signed version" }, { version: 2, byId: "tom", at: d(200), note: "Addendum 2025 reporting" }] }),
  mk({ id: "i-am-gent-shift", nodeId: "am-be-gent", kind: "file", title: "Shift premium table Gent", fileName: "AM_Gent_Shift_Premiums_2026.xlsx", fileSize: "60 KB", content: "Continuous shift system, premiums per shift type, PC 104 (steel industry).", topic: "Premiums", category: "payroll", scope: ["BE"], ownerId: "tom", createdById: "tom", createdAt: d(1000), updatedAt: d(70),
    versions: [{ version: 1, byId: "tom", at: d(1000), note: "Initial" }, { version: 2, byId: "tom", at: d(70), note: "2026 indexation applied" }], origin: "customer" }),
  mk({ id: "i-am-fr-cutoff", nodeId: "am-fr", kind: "note", title: "Payroll cutoff France: 12th", content: "Site managers submit hours via the HRIS by the 12th. Pay date is the last working day of the month.", topic: "Payroll cutoff", category: "payroll", scope: ["FR"], ownerId: "amelie", createdById: "amelie", createdAt: d(600), updatedAt: d(45) }),
  mk({ id: "i-am-de-kurzarbeit", nodeId: "am-de-bremen", kind: "note", title: "Kurzarbeit procedure Bremen", content: "Short-time work was applied in 2024. Procedure and Agentur für Arbeit reference kept for reuse.", topic: "Short-time work", category: "legal", scope: ["DE"], ownerId: "jonas", createdById: "jonas", createdAt: d(500) }),
  // ---- Basic-Fit
  mk({ id: "i-bf-sla", nodeId: "bf", kind: "file", title: "Basic-Fit payroll SLA 2024", fileName: "BasicFit_Payroll_SLA_2024.pdf", fileSize: "1.2 MB", content: "SLA for payroll in NL, BE, FR, ES and DE. Club managers are the single input point per club.", topic: "Contract", category: "payroll", scope: ["all"], ownerId: "pieter", createdById: "pieter", createdAt: d(700) }),
  mk({ id: "i-bf-nl-cutoff", nodeId: "bf-nl", kind: "note", title: "Payroll cutoff Netherlands: 19th", content: "Club managers submit hours by the 19th. Pay date the 25th. 4-weekly for club staff.", topic: "Payroll cutoff", category: "payroll", scope: ["NL"], ownerId: "pieter", createdById: "pieter", createdAt: d(300), updatedAt: d(50) }),
  mk({ id: "i-bf-fr-bonus", nodeId: "bf-fr", kind: "file", title: "Club manager bonus scheme 2026", fileName: "BasicFit_FR_Club_Bonus_2026.pptx", fileSize: "3.2 MB", content: "Quarterly bonus scheme for club managers based on membership targets. Received from Basic-Fit France HR.", topic: "Bonus", category: "hr-admin", scope: ["FR"], ownerId: "amelie", createdById: "amelie", createdAt: d(80), origin: "customer" }),
  mk({ id: "i-bf-report", nodeId: "bf", kind: "file", title: "Headcount dashboard per country", fileName: "BasicFit_Headcount_Dashboard_Q3_2026.pptx", fileSize: "2.1 MB", content: "Quarterly headcount and staff cost dashboard per country, produced by SD Worx reporting.", topic: "Reporting", category: "reporting", scope: ["all"], ownerId: "pieter", createdById: "pieter", createdAt: d(12) }),
  mk({ id: "i-bf-be-cutoff", nodeId: "bf-be", kind: "note", title: "Payroll cutoff Belgium: 18th", content: "Input by the 18th, pay date the 28th.", topic: "Payroll cutoff", category: "payroll", scope: ["BE"], ownerId: "sofie", createdById: "sofie", createdAt: d(200), updatedAt: d(10) }),
];

const activity = [
  { id: "a1", at: d(15, 9), actorId: "marta", action: "updated" as const, companyId: "nike", nodeId: "nk", itemId: "i-nk-escalation", summary: "edited Escalation matrix (new HR Director EMEA)" },
  { id: "a2", at: d(21, 14), actorId: "jonas", action: "superseded" as const, companyId: "nike", nodeId: "nk-de-gmbh", itemId: "i-nk-de-cutoff-old", summary: "marked \"Payroll cutoff Germany: 15th of the month\" as superseded by \"Payroll cutoff Germany moves to the 18th\"" },
  { id: "a3", at: d(21, 13), actorId: "jonas", action: "new_version" as const, companyId: "nike", nodeId: "nk-de-gmbh", itemId: "i-nk-de-cutoff-new", summary: "uploaded version 2 of Payroll cutoff Germany moves to the 18th" },
  { id: "a4", at: d(24, 11), actorId: "jonas", action: "created" as const, companyId: "nike", nodeId: "nk-de-gmbh", itemId: "i-nk-de-cutoff-new", summary: "added note Payroll cutoff Germany moves to the 18th" },
  { id: "a5", at: d(24, 11), actorId: "jonas", action: "created" as const, companyId: "nike", nodeId: "nk-de-gmbh", itemId: "i-nk-de-time", summary: "added note New time registration system from October" },
  { id: "a6", at: d(30, 16), actorId: "sofie", action: "new_version" as const, companyId: "nike", nodeId: "nk-be", itemId: "i-nk-be-cutoff", summary: "uploaded version 2 of Payroll cutoff Belgium: 20th of the month" },
  { id: "a7", at: d(40, 10), actorId: "marta", action: "new_version" as const, companyId: "nike", nodeId: "nk", itemId: "i-nk-msa", summary: "uploaded version 3 of Master Service Agreement 2024" },
  { id: "a8", at: d(10, 9), actorId: "lena", action: "new_version" as const, companyId: "vandervalk", nodeId: "vv-be", itemId: "i-vv-be-cutoff", summary: "uploaded version 2 of Payroll cutoff Belgium: 22nd" },
  { id: "a9", at: d(30, 13), actorId: "lena", action: "created" as const, companyId: "vandervalk", nodeId: "vv-be-bru", itemId: "i-vv-bru-flexi", summary: "filed Flexi-job contracts Brussels Airport" },
  { id: "a10", at: d(20, 15), actorId: "pieter", action: "created" as const, companyId: "nike", nodeId: "nk-nl-ehq", itemId: "i-nk-nl-wkr", summary: "added note WKR budget tracking" },
  { id: "a11", at: d(12, 10), actorId: "pieter", action: "created" as const, companyId: "basicfit", nodeId: "bf", itemId: "i-bf-report", summary: "uploaded Headcount dashboard per country" },
  { id: "a12", at: d(60, 12), actorId: "lena", action: "created" as const, companyId: "nike", nodeId: "nk-be-retail", itemId: "i-nk-retail-be-mv", summary: "filed Meal voucher policy retail" },
  { id: "a13", at: d(90, 12), actorId: "lena", action: "created" as const, companyId: "nike", nodeId: "nk-be-elc", itemId: "i-nk-elc-onboarding", summary: "uploaded ELC onboarding checklist" },
  { id: "a14", at: d(2, 8), actorId: "marta", action: "node_added" as const, companyId: "nike", nodeId: "nk-de-retail", summary: "added Nike Retail Germany as a separate entity under Germany" },
  { id: "a15", at: d(70, 10), actorId: "tom", action: "new_version" as const, companyId: "arcelormittal", nodeId: "am-be-gent", itemId: "i-am-gent-shift", summary: "uploaded version 2 of Shift premium table Gent" },
];

export const seed: Db = { people, companies, nodes, items, activity };
