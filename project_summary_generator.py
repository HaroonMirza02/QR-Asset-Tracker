from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from pathlib import Path

d=Document(); s=d.sections[0]; s.top_margin=Inches(.55); s.bottom_margin=Inches(.55); s.left_margin=Inches(.68); s.right_margin=Inches(.68)
d.styles['Normal'].font.name='Aptos'; d.styles['Normal'].font.size=Pt(9)
for n,z,c in [('Title',25,'26315C'),('Heading 1',16,'4E3BC4'),('Heading 2',11,'26315C')]:
 st=d.styles[n]; st.font.name='Aptos Display'; st.font.size=Pt(z); st.font.bold=True; st.font.color.rgb=RGBColor.from_string(c)
def P(x='',sty=None,b=False,c=None,sz=None,a=None):
 p=d.add_paragraph(style=sty); p.paragraph_format.space_after=Pt(5); r=p.add_run(x); r.bold=b
 if c:r.font.color.rgb=RGBColor.from_string(c)
 if sz:r.font.size=Pt(sz)
 if a:p.alignment=a
 return p
def B(xs):
 for x in xs:P(x,'List Bullet')
def T(rows):
 t=d.add_table(rows=0,cols=len(rows[0])); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.style='Table Grid'
 for ri,row in enumerate(rows):
  cs=t.add_row().cells
  for i,x in enumerate(row):
   cs[i].text=x
   if ri==0:
    sh=OxmlElement('w:shd'); sh.set(qn('w:fill'),'EDEAFF'); cs[i]._tc.get_or_add_tcPr().append(sh)
    for r in cs[i].paragraphs[0].runs:r.bold=True
 return t
P('EZTrack Project Summary','Title'); P('Reusable B2B asset tracking foundation | Internal development sprint | Vision71 Technologies',b=True,c='66627A',sz=10)
P('What I built','Heading 1'); P('I built a working mini-platform for companies that need to track physical equipment. An admin can create an asset, generate its QR identity, print a label, scan it from a phone, assign it to a person or location, change its status, and review its history. The result is a demo-ready foundation connected end to end rather than a set of mock screens.')
P('The system uses a React frontend, Express API, MongoDB, JWT login, role permissions, Zod validation, bcrypt password hashing, and QR generation. The seeded demo contains 60 assets, 16 employees, 10 locations, 2 demo users, and 104 history records.')
P('My sprint ownership','Heading 1'); T([['Area','What I delivered'],['QR identity','Unique token per asset, QR URL, server PNG, frontend label generation, download and print flow.'],['Scan experience','Mobile-first public asset page with safe asset information and no admin controls.'],['Failure handling','Clear malformed, unknown, hidden, inactive, and replaced QR states; retry for temporary service failures.'],['Demo data','Realistic industrial equipment, employees, locations, statuses, assignments, serial numbers, and dated history.'],['Shared frontend','Responsive workflows, login/signup, asset search, filtering, detail pages, history, role-aware actions, and loading/error states.']])
P('How the journey works','Heading 1'); P('Admin creates an asset → the backend creates a random QR token → the label points to /scan/<token>?t=<tenant> → a phone camera opens the public page → an authenticated admin manages assignment and status from the dashboard. Viewer accounts can read data but cannot perform admin writes.')
sec=d.add_section(WD_SECTION.NEW_PAGE); sec.top_margin=Inches(.55); sec.bottom_margin=Inches(.55); sec.left_margin=Inches(.68); sec.right_margin=Inches(.68)
P('Features and evidence','Title'); P('QR generator','Heading 1'); P('Every asset receives a stable random QR token. The backend can return a 640-pixel QR PNG and the frontend can create a high-resolution label for print or download. Regenerating a code replaces the old token immediately.')
img=Path('evidence/eztrack-qr-evidence.png')
if img.exists(): q=d.add_paragraph(); q.alignment=WD_ALIGN_PARAGRAPH.CENTER; q.add_run().add_picture(str(img),width=Inches(1.45)); P('Evidence 1. Generated EZTrack QR label for the public asset route.',c='66627A',sz=8,a=WD_ALIGN_PARAGRAPH.CENTER)
P('Scan and landing page','Heading 1'); P('The public scan route is separate from the protected dashboard. A valid scan shows asset code, name, category, description, status, and assignment display. It does not expose QR tokens, internal IDs, employee contact details, or admin actions.')
P('Invalid QR state','Heading 1'); P('Malformed, unknown, hidden, inactive, or replaced codes show “QR code not recognized” with useful guidance. A temporary network or service problem shows “Unable to load this asset” and a Try again action.')
P('Verified cases','Heading 2'); T([['Check','Result'],['Generated PNG','Valid PNG returned by the QR service.'],['Valid public scan','HTTP 200 and expected asset profile.'],['Hidden asset','HTTP 404 and invalid QR state.'],['Malformed token','HTTP 404 and invalid QR state.'],['Missing tenant','HTTP 422 validation response.'],['QR regeneration','Old URL 404; new URL 200.'],['Admin controls on scan page','Not present.']])
sec=d.add_section(WD_SECTION.NEW_PAGE); sec.top_margin=Inches(.55); sec.bottom_margin=Inches(.55); sec.left_margin=Inches(.68); sec.right_margin=Inches(.68)
P('Demo data and handover','Title'); P('Realistic demo dataset','Heading 1'); P('The seed script clears and recreates only the Meridian demo tenant. Assets use realistic model names, serial numbers, descriptions, assignments, visibility, and statuses: Available, Assigned, In Repair, Lost, and Retired. History dates and notes read like handovers, stock checks, inspections, and decommissioning events.')
T([['Collection','Records','Examples'],['Assets','60','Laptops, vehicles, drills, meters, chairs, desks, displays, scanners, printers, access points'],['Employees','16','Operations, IT, Finance, Facilities, Logistics, HR, Quality'],['Locations','10','HQ, workshop, garage, warehouse, service bench, checkout store, collaboration rooms'],['Asset history','104','Created, assignment, status change, audit notes']])
P('Frontend work and optimization','Heading 1'); B(['Protected dashboard routes for assets, employees, locations, detail, QR labels, assignment, status, and history.','Lazy-loaded page bundles reduce the initial JavaScript payload; main bundle is about 298 KB before compression.','Asset-list requests cancel when filters or pages change, preventing stale responses.','QR generation loads on demand and generated images use a 640-pixel source.','Loading, empty, network error, retry, invalid QR, and permission-denied states are implemented.'])
P('Acceptance and phone evidence','Heading 1'); P('Automated checks passed for QR generation, valid scans, invalid and hidden scans, QR rotation, signup isolation, public field filtering, and the realistic seed. The sample QR and links are included with this handover. Physical phone-camera scanning is the final manual check because it depends on a phone reaching the running frontend; use a LAN or deployed URL instead of localhost.')
P('Suggested final check','Heading 2'); B(['Open the valid QR link from evidence/scan-evidence.txt on a phone camera.','Confirm the correct asset opens and only public information is shown.','Open the invalid link and confirm the useful invalid state.','Log in as Admin and print a label from an asset detail page.'])
for section in d.sections:
 f=section.footer.paragraphs[0]; f.alignment=WD_ALIGN_PARAGRAPH.CENTER; r=f.add_run('EZTrack | Vision71 Technologies | Internal development sprint'); r.font.size=Pt(8); r.font.color.rgb=RGBColor.from_string('888399')
d.save('EZTrack_project_summary.docx')
