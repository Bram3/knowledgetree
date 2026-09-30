"""Generate realistic demo documents for every seeded file item.
Outputs public/files/<fileName> (original format: pdf/xlsx/docx) and public/files/<id>.pdf (preview)."""
import os, subprocess, shutil, html
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "files")
os.makedirs(OUT, exist_ok=True)
styles = getSampleStyleSheet()
H1 = ParagraphStyle("h1", parent=styles["Title"], fontSize=20, leading=24, alignment=0, spaceAfter=6)
H2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=13, spaceBefore=12, spaceAfter=4, textColor=colors.HexColor("#001c52"))
BODY = ParagraphStyle("body", parent=styles["BodyText"], fontSize=10, leading=14)
SMALL = ParagraphStyle("small", parent=BODY, fontSize=8, textColor=colors.HexColor("#737476"))

def header_footer(company, title):
    def draw(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(colors.HexColor("#001c52")); canvas.rect(0, A4[1]-18*mm, A4[0], 18*mm, fill=1, stroke=0)
        canvas.setFillColor(colors.white); canvas.setFont("Helvetica-Bold", 11); canvas.drawString(20*mm, A4[1]-11*mm, company)
        canvas.setFont("Helvetica", 9); canvas.drawRightString(A4[0]-20*mm, A4[1]-11*mm, title)
        canvas.setFillColor(colors.HexColor("#737476")); canvas.setFont("Helvetica", 8)
        canvas.drawString(20*mm, 12*mm, "Confidential - prepared for SD Worx KnowledgeTree"); canvas.drawRightString(A4[0]-20*mm, 12*mm, f"Page {doc.page}")
        canvas.restoreState()
    return draw

def pdf(path, company, title, sections, table=None, landscape_mode=False):
    doc = SimpleDocTemplate(path, pagesize=landscape(A4) if landscape_mode else A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=28*mm, bottomMargin=22*mm)
    flow = [Paragraph(html.escape(title), H1), Paragraph("Version for demonstration purposes. Generated for the SD Worx hackathon.", SMALL), Spacer(1, 6)]
    for h, body in sections:
        flow.append(Paragraph(html.escape(h), H2))
        for p in body: flow.append(Paragraph(html.escape(p), BODY))
    if table:
        flow.append(Spacer(1, 10))
        t = Table(table, repeatRows=1)
        t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), colors.HexColor("#001c52")), ("TEXTCOLOR", (0,0), (-1,0), colors.white), ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"), ("FONTSIZE", (0,0), (-1,-1), 9), ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#d9dbdd")), ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f4f5f6")]), ("VALIGN", (0,0), (-1,-1), "MIDDLE")]))
        flow.append(t)
    doc.build(flow, onFirstPage=header_footer(company, title), onLaterPages=header_footer(company, title))

def xlsx(path, title, sheets):
    wb = Workbook(); wb.remove(wb.active)
    for name, rows in sheets:
        ws = wb.create_sheet(name[:30])
        ws["A1"] = title; ws["A1"].font = Font(bold=True, size=14, color="001C52")
        ws["A2"] = "Generated for the SD Worx hackathon demo"; ws["A2"].font = Font(italic=True, color="737476")
        for r, row in enumerate(rows, start=4):
            for c, v in enumerate(row, start=1):
                cell = ws.cell(row=r, column=c, value=v)
                cell.border = Border(bottom=Side(style="thin", color="D9DBDD"))
                if r == 4:
                    cell.font = Font(bold=True, color="FFFFFF"); cell.fill = PatternFill("solid", fgColor="001C52"); cell.alignment = Alignment(horizontal="center")
        for col in ws.columns:
            ws.column_dimensions[col[0].column_letter].width = max(12, min(40, max(len(str(c.value or "")) for c in col) + 2))
    wb.save(path)

def docx(path, company, title, sections):
    tmp = path.replace(".docx", ".html")
    body = f"<h1>{html.escape(title)}</h1><p><i>{html.escape(company)} - version for demonstration purposes</i></p>"
    for h, ps in sections:
        body += f"<h2>{html.escape(h)}</h2>" + "".join(f"<p>{html.escape(p)}</p>" for p in ps)
    open(tmp, "w").write(f"<html><head><meta charset='utf-8'><style>body{{font-family:Arial;font-size:11pt}} h1{{color:#001c52}} h2{{color:#001c52;font-size:13pt}}</style></head><body>{body}</body></html>")
    subprocess.run(["soffice", "--headless", "--convert-to", "docx:MS Word 2007 XML", "--outdir", OUT, tmp], check=True, capture_output=True)
    os.remove(tmp)

def to_pdf(src, preview_name):
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", OUT, src], check=True, capture_output=True)
    produced = os.path.splitext(src)[0] + ".pdf"
    shutil.move(produced, os.path.join(OUT, preview_name))

months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
def calendar_rows(cut, pay):
    return [["Month","Cutoff variable input","Pay date","Bank holidays"]] + [[f"{m} 2026", f"{cut} {m}", f"{pay} {m}", h] for m, h in zip(months, ["1 Jan","","","6 Apr","1 May, 14 May, 25 May","","21 Jul","15 Aug","","","1 Nov, 11 Nov","25 Dec"])]

contract_sections = lambda c: [
    ("1. Scope of services", [f"SD Worx provides payroll processing, time and attendance and HR administration services to {c} and its affiliated entities listed in Annex A.", "Services are delivered from the SD Worx service centres in Antwerp, Utrecht and Berlin."]),
    ("2. Service levels", ["Payroll runs are completed within 3 business days after the agreed cutoff. Corrections are processed in a supplementary run.", "Response time on payroll-impacting questions: 4 business hours. Resolution time: 2 business days."]),
    ("3. Data protection", ["Both parties act in accordance with the GDPR. A data processing agreement is attached as Annex B. Personal data is retained for 10 years after the end of employment, as required by law."]),
    ("4. Fees and invoicing", ["Fees per payslip and per service line are listed in the price schedule (Annex C) and indexed yearly on 1 January."]),
    ("5. Term", ["This agreement enters into force on the signature date for an initial term of 3 years and is renewed tacitly for successive 1-year periods."]),
]

docs = {
  "i-nk-msa": ("pdf", "Nike EMEA", "Master Service Agreement 2024", contract_sections("Nike EMEA"), [["Entity","Country","Services"],["Nike Deutschland GmbH","DE","Payroll, T&A"],["Nike Retail Germany","DE","Payroll"],["European Logistics Campus Laakdal","BE","Payroll, T&A, HR admin"],["Nike Retail Belgium","BE","Payroll, HR admin"],["European HQ Hilversum","NL","Payroll, HR admin"]]),
  "i-nk-calendar": ("xlsx", "Nike EMEA", "EMEA payroll calendar 2026", [("Belgium", calendar_rows(20, 27)), ("Netherlands", calendar_rows(17, 24)), ("Germany", calendar_rows(18, 25))]),
  "i-nk-orgchart": ("pptx", "Nike EMEA", "Nike EMEA HR organisation chart", [("HR Director EMEA", ["Ingrid Haas leads HR for EMEA. Reporting lines per country are listed below."]), ("Country HR leads", ["Belgium: Bart Claes (HR Manager). Netherlands: Anouk de Vries (HR Business Partner). Germany: Katrin Vogel (Head of Payroll Germany)."]), ("SD Worx counterparts", ["Account lead: Marta Kowalski. Belgium: Sofie De Smet, Lena Vermeulen. Netherlands: Pieter Janssens. Germany: Jonas Becker."])], [["Country","Customer contact","SD Worx consultant"],["BE","Bart Claes","Sofie De Smet"],["NL","Anouk de Vries","Pieter Janssens"],["DE","Katrin Vogel","Jonas Becker"]]),
  "i-nk-be-mandate": ("pdf", "Nike Belgium", "Mandaat sociaal secretariaat", [("Volmacht", ["Nike Belgium NV, met maatschappelijke zetel te Laakdal, geeft hierbij volmacht aan SD Worx vzw, erkend sociaal secretariaat, om in haar naam en voor haar rekening alle formaliteiten te vervullen ten aanzien van de RSZ, de fiscus en de sociale verzekeringsfondsen."]), ("Omvang", ["De volmacht omvat de aangifte van de sociale bijdragen (DmfA), de Dimona-aangiften, de bedrijfsvoorheffing en de aanmaak van de sociale documenten."]), ("Duur", ["Deze volmacht geldt voor onbepaalde duur en kan door elk van de partijen worden opgezegd met een opzegtermijn van drie maanden."])], [["Partij","Naam","Functie"],["Opdrachtgever","Ingrid Haas","HR Director EMEA"],["Sociaal secretariaat","Tom Verhaeghe","Legal & Compliance, SD Worx"]]),
  "i-nk-elc-shifts": ("xlsx", "Nike ELC Laakdal", "ELC shift schedule and premiums 2026", [("Premiums", [["Shift","Hours","Premium","Applies to"],["Early","06:00-14:00","0%","Blue-collar PC 226"],["Late","14:00-22:00","10%","Blue-collar PC 226"],["Night","22:00-06:00","25%","Blue-collar PC 226"],["Saturday","any","50%","All warehouse staff"],["Sunday / holiday","any","100%","All warehouse staff"]]), ("Rotation", [["Week","Team A","Team B","Team C"],["1","Early","Late","Night"],["2","Night","Early","Late"],["3","Late","Night","Early"]])]),
  "i-nk-elc-onboarding": ("docx", "Nike ELC Laakdal", "ELC onboarding checklist", [("Before day 1", ["Dimona declaration filed by SD Worx at the latest the day before the start.", "Wage scale PC 226 assigned according to function class.", "Badge requested at the ELC security desk."]), ("Day 1", ["Meal vouchers activated (face value EUR 8).", "Time registration training with the shift lead.", "Safety instruction and PPE handed out."]), ("First month", ["Trial period follow-up by the team lead after 4 weeks.", "Check that the first payslip matches the shift premiums."])]),
  "i-nk-retail-be-mv": ("docx", "Nike Retail Belgium", "Meal voucher policy", [("Policy", ["All store staff in Belgium receive one electronic meal voucher per day worked with a face value of EUR 8.", "Employer contribution EUR 6.91, employee contribution EUR 1.09, deducted from the net salary."]), ("Exceptions", ["No voucher is granted on days with a full day of sickness, holiday or unpaid leave.", "Part-time staff receive vouchers pro rata per day worked, regardless of hours."])]),
  "i-nk-nl-30": ("xlsx", "Nike EHQ Hilversum", "30% ruling overview expats", [("Expats", [["Employee ID","Nationality","Start ruling","End ruling","Status"]] + [[f"NL{1000+i}", n, s, e, st] for i, (n, s, e, st) in enumerate([("US","01-02-2022","31-01-2027","Active"),("GB","01-09-2023","31-08-2028","Active"),("BR","01-01-2022","31-12-2026","Ends this year"),("JP","01-06-2024","31-05-2029","Active"),("IN","01-03-2021","28-02-2026","Ended"),("CA","01-11-2022","31-10-2027","Active")])])]),
  "i-nk-de-lohnsteuer": ("pdf", "Nike Deutschland GmbH", "Lohnsteuer-Anmeldung", [("Steuerliche Registrierung", ["Finanzamt Berlin Mitte/Tiergarten. Steuernummer 30/123/45678. Die ELSTER-Zertifikatsdaten werden von SD Worx verwaltet."]), ("Anmeldezeitraum", ["Die Lohnsteuer-Anmeldung erfolgt monatlich bis zum 10. des Folgemonats."])], [["Feld","Wert"],["Arbeitgeber","Nike Deutschland GmbH"],["Betriebsnummer","28473911"],["Anmeldezeitraum","monatlich"],["Bevollmächtigter","SD Worx GmbH, Berlin"]]),
  "i-nk-de-onboarding": ("xlsx", "Nike Germany", "DE onboarding checklist", [("Checklist", [["Step","Owner","Deadline","Done"],["Sozialversicherungsnummer collected","HR Nike","Before start","Yes"],["Health insurance choice","Employee","Day 1",""],["Tax class confirmed (ELStAM)","SD Worx","First payroll",""],["DEÜV registration","SD Worx","Within 6 weeks",""],["Time registration account","Nike IT","Day 1",""]])]),
  "i-vv-sla": ("pdf", "Van der Valk Hotels", "Service agreement 2023", contract_sections("Van der Valk Hotels"), [["Hotel","Country","Staff"],["Hotel Amsterdam","NL","180"],["Hotel Eindhoven","NL","120"],["Hotel Brussels Airport","BE","140"],["Hotel Mechelen","BE","95"],["Hotel Düsseldorf","DE","110"]]),
  "i-vv-ams-roster": ("pdf", "Van der Valk Hotel Amsterdam", "Roster export specification", [("Purpose", ["Weekly export of planned and worked hours from the hotel planning tool to SD Worx time & attendance."]), ("File format", ["CSV, semicolon separated, UTF-8. One line per employee per day. Delivered every Monday 06:00 on the SFTP folder vdv-ams-in."]), ("Columns", ["EmployeeId; Date; Start; End; Break; CostCentre; Allowance"])], [["Column","Type","Example"],["EmployeeId","string","VDV-AMS-0231"],["Date","date","2026-10-06"],["Start","time","07:00"],["End","time","15:30"],["Break","minutes","30"],["Allowance","code","SUN50"]]),
  "i-vv-bru-flexi": ("xlsx", "Van der Valk Hotel Brussels Airport", "Flexi-job contracts Q3 2026", [("Flexi-jobs", [["Worker","Function","Quarter hours","Framework contract","Declared"],["De Wit, Jan","Bar","96","Yes","Yes"],["Peeters, Lore","Reception","120","Yes","Yes"],["Mertens, Kobe","Kitchen","64","Yes","Pending"],["Claes, Nina","Housekeeping","88","Yes","Yes"]])]),
  "i-vrt-statute": ("pdf", "VRT", "Personeelsstatuut 2025", [("Toepassingsgebied", ["Dit statuut is van toepassing op alle statutaire en contractuele personeelsleden van de VRT."]), ("Loonschalen", ["De loonschalen zijn opgenomen in bijlage 1 en worden geïndexeerd volgens het mechanisme van de Vlaamse overheid."]), ("Verlof", ["Personeelsleden hebben recht op 35 dagen jaarlijks verlof. Verlofdagen worden opgenomen in overleg met de leidinggevende."])], [["Categorie","Loonschaal","Minimum","Maximum"],["Redacteur","B21","3.210","5.480"],["Producer","A11","3.890","6.450"],["Technicus","C21","2.760","4.520"]]),
  "i-vrt-report": ("xlsx", "VRT", "Monthly headcount report template", [("Headcount", [["Division","Statutory","Contractual","Total","Cost (kEUR)"],["Radio","210","145","355","1.980"],["Television","480","320","800","4.610"],["Digital & Innovation","95","130","225","1.320"],["Support","260","110","370","1.870"]])]),
  "i-am-msa": ("pdf", "ArcelorMittal Europe", "Framework agreement 2022", contract_sections("ArcelorMittal Europe"), [["Site","Country","Services"],["ArcelorMittal Gent","BE","Payroll, Legal"],["ArcelorMittal Dunkerque","FR","Payroll"],["ArcelorMittal Bremen","DE","Payroll, Legal, Reporting"]]),
  "i-am-gent-shift": ("xlsx", "ArcelorMittal Gent", "Shift premium table 2026", [("Premiums", [["Shift","Premium 2025","Premium 2026 (indexed)","PC"],["Early","4,20","4,32","104"],["Late","6,10","6,27","104"],["Night","9,80","10,08","104"],["Weekend","14,50","14,91","104"]])]),
  "i-bf-sla": ("pdf", "Basic-Fit", "Payroll SLA 2024", contract_sections("Basic-Fit"), [["Country","Clubs","Staff","Cutoff"],["NL","240","2.900","19th"],["BE","230","2.400","18th"],["FR","800","6.100","12th"],["ES","170","1.500","15th"],["DE","60","500","15th"]]),
  "i-bf-fr-bonus": ("pptx", "Basic-Fit France", "Club manager bonus scheme 2026", [("Principle", ["Quarterly bonus for club managers based on the membership target of the club."]), ("Tiers", ["Below 95% of target: no bonus. 95-100%: EUR 400. 100-110%: EUR 800. Above 110%: EUR 1.200."]), ("Payment", ["Paid with the payroll of the month following the quarter, as a variable component."])], [["Tier","Target achieved","Bonus"],["0","< 95%","EUR 0"],["1","95-100%","EUR 400"],["2","100-110%","EUR 800"],["3","> 110%","EUR 1.200"]]),
  "i-bf-report": ("pptx", "Basic-Fit Group", "Headcount dashboard Q3 2026", [("Summary", ["Total headcount 13.400, up 4% versus Q2. Staff cost per member stable at EUR 2,10."]), ("Per country", ["Netherlands 2.900, Belgium 2.400, France 6.100, Spain 1.500, Germany 500."])], [["Country","Q2","Q3","Delta"],["NL","2.810","2.900","+3%"],["BE","2.350","2.400","+2%"],["FR","5.780","6.100","+6%"],["ES","1.420","1.500","+6%"],["DE","470","500","+6%"]]),
}
filenames = {l.split("|")[0]: l.split("|")[2] for l in """i-nk-msa|x|Nike_EMEA_MSA_2024_signed.pdf
i-nk-calendar|x|Nike_EMEA_Payroll_Calendar_2026.xlsx
i-nk-orgchart|x|Nike_EMEA_HR_Org_2026.pptx
i-nk-be-mandate|x|Mandaat_Sociaal_Secretariaat_Nike_BE.pdf
i-nk-elc-shifts|x|Nike_ELC_Laakdal_Shift_Premiums_2026.xlsx
i-nk-elc-onboarding|x|Nike_ELC_Onboarding_Checklist.docx
i-nk-retail-be-mv|x|Nike_Retail_BE_Meal_Vouchers.docx
i-nk-nl-30|x|Nike_EHQ_30pct_ruling_overview.xlsx
i-nk-de-lohnsteuer|x|Lohnsteuer_Anmeldung_Nike_Deutschland.pdf
i-nk-de-onboarding|x|Nike_DE_Onboarding_Checklist.xlsx
i-vv-sla|x|VanderValk_Service_Agreement_2023.pdf
i-vv-ams-roster|x|VdV_Amsterdam_Roster_Export_Spec.pdf
i-vv-bru-flexi|x|VdV_Brussels_Flexijobs_Q3_2026.xlsx
i-vrt-statute|x|VRT_Personeelsstatuut_2025.pdf
i-vrt-report|x|VRT_Headcount_Report_Template.xlsx
i-am-msa|x|ArcelorMittal_Framework_Agreement_2022.pdf
i-am-gent-shift|x|AM_Gent_Shift_Premiums_2026.xlsx
i-bf-sla|x|BasicFit_Payroll_SLA_2024.pdf
i-bf-fr-bonus|x|BasicFit_FR_Club_Bonus_2026.pptx
i-bf-report|x|BasicFit_Headcount_Dashboard_Q3_2026.pptx""".splitlines()}

for iid, spec in docs.items():
    kind, company, title = spec[0], spec[1], spec[2]
    fname = filenames[iid]; original = os.path.join(OUT, fname); preview = f"{iid}.pdf"
    if kind == "pdf":
        pdf(original, company, title, spec[3], spec[4] if len(spec) > 4 else None); shutil.copy(original, os.path.join(OUT, preview))
    elif kind == "pptx":
        pdf(os.path.join(OUT, preview), company, title, spec[3], spec[4] if len(spec) > 4 else None, landscape_mode=True)
    elif kind == "xlsx":
        xlsx(original, title, spec[3]); to_pdf(original, preview)
    elif kind == "docx":
        docx(original, company, title, spec[3]); to_pdf(original, preview)
    print("ok", iid, fname)

# Outlook demo attachment
att = os.path.join(OUT, "Nike_DE_Payroll_Calendar_Q4_2026.xlsx")
xlsx(att, "Nike Deutschland GmbH payroll calendar Q4 2026", [("Q4 2026", [["Month","Cutoff variable input","Pay date","Note"],["Oct 2026","18 Oct","25 Oct","New cutoff (was 15th)"],["Nov 2026","18 Nov","25 Nov",""],["Dec 2026","16 Dec","22 Dec","Early run for the holidays"]])])
to_pdf(att, "att-nike-de-calendar.pdf")
print("done")
