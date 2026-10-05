from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, HRFlowable
)
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "settle-business-overview.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

font_dir = Path("/usr/share/fonts/TTF")
pdfmetrics.registerFont(TTFont("Inter", str(font_dir / "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("Inter-Bold", str(font_dir / "DejaVuSans-Bold.ttf")))

PAGE_W, PAGE_H = A4
INK = colors.HexColor("#17251E")
MUTED = colors.HexColor("#59665F")
GREEN = colors.HexColor("#07955C")
GREEN_DARK = colors.HexColor("#075C3B")
GREEN_PALE = colors.HexColor("#E8F6EF")
CREAM = colors.HexColor("#FAF7EF")
CORAL = colors.HexColor("#F27A62")
GOLD = colors.HexColor("#F4BE4F")
LINE = colors.HexColor("#D9E2DC")
WHITE = colors.white

styles = getSampleStyleSheet()
body = ParagraphStyle("body", fontName="Inter", fontSize=9.3, leading=14, textColor=INK, spaceAfter=7)
small = ParagraphStyle("small", parent=body, fontSize=7.4, leading=10.5, textColor=MUTED)
h1 = ParagraphStyle("h1", fontName="Inter-Bold", fontSize=28, leading=32, textColor=INK, spaceAfter=10)
h2 = ParagraphStyle("h2", fontName="Inter-Bold", fontSize=16, leading=20, textColor=GREEN_DARK, spaceBefore=3, spaceAfter=9)
h3 = ParagraphStyle("h3", fontName="Inter-Bold", fontSize=10.2, leading=13, textColor=INK, spaceAfter=4)
eyebrow = ParagraphStyle("eyebrow", fontName="Inter-Bold", fontSize=7.5, leading=10, textColor=GREEN, tracking=1.2, spaceAfter=8)
quote = ParagraphStyle("quote", fontName="Inter-Bold", fontSize=17, leading=23, textColor=WHITE, alignment=TA_LEFT)
center = ParagraphStyle("center", parent=body, alignment=TA_CENTER)

def P(text, style=body):
    return Paragraph(text, style)

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(GREEN_DARK)
    canvas.rect(0, PAGE_H - 9*mm, PAGE_W, 9*mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Inter-Bold", 7)
    canvas.drawString(18*mm, PAGE_H - 6*mm, "SETTLE  |  BUSINESS OVERVIEW")
    canvas.setFillColor(MUTED)
    canvas.setFont("Inter", 7)
    canvas.drawString(18*mm, 10*mm, "Prepared from the project repository  |  29 September 2026")
    canvas.drawRightString(PAGE_W - 18*mm, 10*mm, f"{doc.page}")
    canvas.restoreState()

def pill(text, bg=GREEN_PALE, fg=GREEN_DARK):
    t = Table([[P(text, ParagraphStyle("pill", fontName="Inter-Bold", fontSize=7.2, leading=9, textColor=fg, alignment=TA_CENTER))]], colWidths=[42*mm])
    t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), bg), ("BOX", (0,0), (-1,-1), .5, bg), ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7), ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5)]))
    return t

def card(title, text, accent=GREEN, width=81*mm):
    content = [[P(title, h3)], [P(text, small)]]
    t = Table(content, colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), WHITE), ("BOX", (0,0), (-1,-1), .7, LINE),
        ("LINEBEFORE", (0,0), (0,-1), 3, accent), ("LEFTPADDING", (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10), ("TOPPADDING", (0,0), (0,0), 10),
        ("BOTTOMPADDING", (0,-1), (-1,-1), 10), ("VALIGN", (0,0), (-1,-1), "TOP")
    ]))
    return t

doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm,
                        topMargin=18*mm, bottomMargin=17*mm, title="Settle Business Overview",
                        author="Settle / Savitura")
story = []

# Cover
story += [Spacer(1, 18*mm), P("BUSINESS OVERVIEW", eyebrow), P("Settle", ParagraphStyle("cover", parent=h1, fontSize=43, leading=46, textColor=GREEN_DARK)),
          P("Family money, sorted.", ParagraphStyle("tag", fontName="Inter-Bold", fontSize=21, leading=26, textColor=CORAL, spaceAfter=14)),
          P("A shared family wallet for Nigerian remittances - designed to make sending, requesting and settling money feel as familiar as a family chat.", ParagraphStyle("lede", parent=body, fontSize=13, leading=20, textColor=INK, spaceAfter=18))]

hero = Table([[P("One shared wallet.<br/>Clear balances in naira.<br/>Crypto stays under the hood.", quote)]], colWidths=[174*mm], rowHeights=[55*mm])
hero.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), GREEN_DARK), ("LEFTPADDING", (0,0), (-1,-1), 15*mm), ("RIGHTPADDING", (0,0), (-1,-1), 15*mm), ("TOPPADDING", (0,0), (-1,-1), 11*mm), ("VALIGN", (0,0), (-1,-1), "MIDDLE")]))
story += [hero, Spacer(1, 10*mm), Table([[pill("NAIRA-FIRST EXPERIENCE"), pill("FAMILY-LED MONEY FLOWS", colors.HexColor("#FFF0EC"), colors.HexColor("#A64331")), pill("EMBEDDED WALLET UX", colors.HexColor("#FFF6DA"), colors.HexColor("#76540A"))]], colWidths=[58*mm]*3, style=[("VALIGN", (0,0), (-1,-1), "TOP")]), Spacer(1, 13*mm),
          P("Project context", h3), P("Settle is a Monad Metropolis Track 02 consumer payments project by Savitura. The current repository is a functional hackathon MVP and demonstration environment; the consumer brand is still a codename.", body), PageBreak()]

# Problem
story += [P("01  THE OPPORTUNITY", eyebrow), P("Remittance is only half the family money problem", h1),
          P("The project starts from a simple observation: money sent to family does not stop being a remittance when it arrives. It becomes rent, school fees, electricity, groceries, fuel and many small reimbursements that still need to be coordinated.", body), Spacer(1, 3*mm)]
cards = [
    card("Cost and friction", "The project brief identifies traditional remittance fees of roughly 5-8%. Small, frequent support payments become disproportionately expensive.", CORAL),
    card("Fragmented coordination", "Families often manage requests, reminders and confirmations across chats, bank apps and informal records. Nobody has one shared view.", GOLD),
    card("Poor visibility", "A transfer receipt proves money moved, but it does not show the family's current balances, open requests or who has settled what.", GREEN),
    card("Crypto complexity", "Wallet addresses, seed phrases, gas and approvals create a steep learning curve for people who simply want to send naira to someone they trust.", colors.HexColor("#4778D0"))
]
story += [Table([[cards[0], cards[1]], [cards[2], cards[3]]], colWidths=[86*mm, 86*mm], hAlign="LEFT", style=[("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 0), ("RIGHTPADDING", (0,0), (-1,-1), 3), ("TOPPADDING", (0,0), (-1,-1), 3), ("BOTTOMPADDING", (0,0), (-1,-1), 3)]), Spacer(1, 8*mm),
          P("The job to be done", h2),
          P("Help a family member move and coordinate money with trusted relatives in seconds, while keeping the experience understandable, accountable and locally relevant.", ParagraphStyle("job", parent=body, fontName="Inter-Bold", fontSize=13, leading=19, textColor=GREEN_DARK, leftIndent=8*mm, borderColor=GREEN, borderWidth=2, borderPadding=8)),
          Spacer(1, 7*mm), P("Primary users", h2)]
users = [[P("Sender / supporter", h3), P("A diaspora or local family member funding household needs and reimbursing relatives.", small)], [P("Recipient / household manager", h3), P("A trusted relative managing recurring expenses and needing clear access to funds.", small)], [P("Family group", h3), P("A small circle of up to three members coordinating shared obligations and requests.", small)]]
ut = Table(users, colWidths=[47*mm, 127*mm])
ut.setStyle(TableStyle([("GRID", (0,0), (-1,-1), .5, LINE), ("BACKGROUND", (0,0), (0,-1), GREEN_PALE), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8), ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7)]))
story += [ut, PageBreak()]

# Solution
story += [P("02  THE PRODUCT", eyebrow), P("A familiar layer over modern payment rails", h1),
          P("Settle organizes family money around a shared wallet and everyday actions. Users sign in with email or phone; an embedded wallet is created behind the scenes. The main experience speaks in naira and uses human actions - Send money, Request and Settle up - instead of blockchain terminology.", body), Spacer(1, 4*mm)]
flow = [["1", "Create or join", "Start a named family wallet and invite relatives with a six-character code or link."], ["2", "See the family position", "View the group balance, individual member balances, pending requests and recent activity."], ["3", "Move or ask for money", "Send a naira amount to a member, or create a request with a note for context."], ["4", "Close the loop", "Pay a pending request, update balances and retain a readable activity trail."], ["5", "Cash out", "The intended product supports bank or mobile-money delivery; the MVP presents this as a clearly labeled demo flow."]]
ft = Table([[P("STEP", eyebrow), P("USER ACTION", eyebrow), P("VALUE CREATED", eyebrow)]] + [[P(a, ParagraphStyle("num", fontName="Inter-Bold", fontSize=13, textColor=GREEN)), P(b, h3), P(c, small)] for a,b,c in flow], colWidths=[16*mm, 48*mm, 110*mm])
ft.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), GREEN_PALE), ("GRID", (0,0), (-1,-1), .5, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8), ("TOPPADDING", (0,0), (-1,-1), 8), ("BOTTOMPADDING", (0,0), (-1,-1), 8)]))
story += [ft, Spacer(1, 8*mm), P("Why the proposition is differentiated", h2)]
diff = Table([[card("Family context, not a generic wallet", "Groups, names, notes and requests turn transfers into an understandable household ledger.", GREEN, 54*mm), card("Local mental model", "Naira amounts lead the interface; stablecoin conversion is an implementation detail.", CORAL, 54*mm), card("Low-friction access", "Email or phone sign-in removes the separate connect-wallet and seed-phrase experience.", GOLD, 54*mm)]], colWidths=[58*mm]*3, style=[("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 2), ("RIGHTPADDING", (0,0), (-1,-1), 2)] )
story += [diff, Spacer(1, 7*mm), P("Design principle", h2), P("The value is not 'crypto for families.' The value is a coherent family-money experience whose settlement layer can be faster and cheaper than traditional rails.", ParagraphStyle("principle", parent=body, fontName="Inter-Bold", fontSize=12, leading=18, textColor=GREEN_DARK, backColor=GREEN_PALE, borderPadding=10)), PageBreak()]

# Business model
story += [P("03  BUSINESS OVERVIEW", eyebrow), P("Where the business can create and capture value", h1),
          P("The repository defines the user proposition and MVP, not a finalized commercial model. The following business model is therefore a logical product direction, not a claim about currently implemented pricing or partnerships.", small)]
bm = [
    ["Customer segments", "Nigerian families receiving or coordinating support; diaspora senders; small trusted family groups."],
    ["Core value", "Lower-friction transfers plus a shared record of balances, requests and settlements."],
    ["Channels", "Mobile web first; family invitations through WhatsApp, SMS or email; diaspora and community partnerships."],
    ["Potential revenue", "Transparent transfer or cash-out fee; FX spread where permitted; premium family tools; partner revenue from regulated payment providers."],
    ["Key partners", "Licensed remittance and payments providers, Nigerian banking/off-ramp partners, identity and wallet infrastructure, stablecoin liquidity partners."],
    ["Key costs", "Compliance, payment and off-ramp fees, customer support, fraud controls, infrastructure, liquidity and user acquisition."],
]
bt = Table([[P(k, h3), P(v, body)] for k,v in bm], colWidths=[45*mm,129*mm])
bt.setStyle(TableStyle([("GRID", (0,0), (-1,-1), .5, LINE), ("BACKGROUND", (0,0), (0,-1), GREEN_PALE), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8), ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7)]))
story += [bt, Spacer(1, 8*mm), P("A plausible growth loop", h2)]
loop = Table([[P("A sender creates a family wallet", center), P("→", center), P("Relatives join by invite", center), P("→", center), P("Requests and transfers create repeat use", center), P("→", center), P("More family needs consolidate in Settle", center)]], colWidths=[37*mm,8*mm,37*mm,8*mm,43*mm,8*mm,37*mm])
loop.setStyle(TableStyle([("BACKGROUND", (0,0), (0,0), GREEN_PALE), ("BACKGROUND", (2,0), (2,0), colors.HexColor("#FFF0EC")), ("BACKGROUND", (4,0), (4,0), colors.HexColor("#FFF6DA")), ("BACKGROUND", (6,0), (6,0), GREEN_PALE), ("BOX", (0,0), (0,0), .5, LINE), ("BOX", (2,0), (2,0), .5, LINE), ("BOX", (4,0), (4,0), .5, LINE), ("BOX", (6,0), (6,0), .5, LINE), ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("TOPPADDING", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 9)]))
story += [loop, Spacer(1, 8*mm), P("Success metrics for validation", h2)]
metrics = [
    [P("Activation", h3), P("Share of signed-in users who create/join a wallet and complete a first money action.", small), P("Household adoption", h3), P("Invite acceptance, members per active wallet and time to first joined relative.", small)],
    [P("Repeat utility", h3), P("Monthly active family wallets, requests created, settlement rate and transfers per wallet.", small), P("Trust and economics", h3), P("Failed transactions, support contacts, cash-out completion, fraud loss and contribution margin.", small)]
]
mt = Table(metrics, colWidths=[42*mm,45*mm,42*mm,45*mm])
mt.setStyle(TableStyle([("GRID", (0,0), (-1,-1), .5, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7), ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7)]))
story += [mt, PageBreak()]

# MVP and roadmap
story += [P("04  EXECUTION VIEW", eyebrow), P("What exists now - and what must come next", h1),
          P("The current build is best understood as a product-validation MVP. It proves the interaction model and stores the core family-wallet records, but it does not yet represent a production remittance service.", body)]
status = [
    ["Working MVP capability", "Privy email/phone authentication and embedded wallet creation; family wallet creation and invite flow; member balances; send, request and settle-up flows; activity history; Neon/Postgres persistence; a one-click Lagos demo scenario."],
    ["Demonstration behavior", "The exchange rate is fixed in code at NGN 1,580 per USDC; transaction hashes are generated locally; sending updates database balances; cash-out is explicitly mocked; chain configuration targets Monad Testnet."],
    ["Production gap", "Real stablecoin transfers, live rates, fiat funding and cash-out, regulated partners, reconciliation, security hardening, customer support, compliance and operational controls remain to be built."],
]
st = Table([[P(a, h3), P(b, body)] for a,b in status], colWidths=[47*mm,127*mm])
st.setStyle(TableStyle([("GRID", (0,0), (-1,-1), .6, LINE), ("BACKGROUND", (0,0), (0,0), GREEN_PALE), ("BACKGROUND", (0,1), (0,1), colors.HexColor("#FFF6DA")), ("BACKGROUND", (0,2), (0,2), colors.HexColor("#FFF0EC")), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8), ("TOPPADDING", (0,0), (-1,-1), 8), ("BOTTOMPADDING", (0,0), (-1,-1), 8)]))
story += [st, Spacer(1, 8*mm), P("Recommended path to market", h2)]
road = [["NOW", "Validate the family workflow", "Test comprehension, invite conversion, request behavior and whether a shared ledger improves trust."], ["NEXT", "Connect regulated money movement", "Integrate live stablecoin settlement, funding and Nigerian bank/mobile-money cash-out through licensed partners."], ["THEN", "Harden operations", "Add identity checks, transaction monitoring, limits, reconciliation, disputes, support tooling and security reviews."], ["SCALE", "Expand the family financial layer", "Introduce recurring contributions, goals, bill allocation and additional corridors only after the core loop is trusted."]]
rt = Table([[P(a, eyebrow), P(b, h3), P(c, small)] for a,b,c in road], colWidths=[22*mm,53*mm,99*mm])
rt.setStyle(TableStyle([("LINEBELOW", (0,0), (-1,-2), .5, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7), ("TOPPADDING", (0,0), (-1,-1), 8), ("BOTTOMPADDING", (0,0), (-1,-1), 8)]))
story += [rt, Spacer(1, 7*mm), P("Principal risks", h2), P("Regulatory classification and licensing; off-ramp reliability; fraud and account takeover; stablecoin and FX exposure; liquidity management; privacy across family groups; trust loss from failed or delayed transfers. These are central business requirements, not later-stage polish.", body), PageBreak()]

# Summary
story += [P("05  SUMMARY", eyebrow), P("The ambition", h1),
          P("Settle aims to become the trusted coordination layer for family money across borders: easy enough for everyday use, transparent enough for shared obligations, and efficient enough for frequent small transfers.", ParagraphStyle("finalquote", parent=body, fontName="Inter-Bold", fontSize=18, leading=27, textColor=GREEN_DARK, spaceAfter=12)),
          HRFlowable(width="100%", thickness=1, color=LINE, spaceBefore=4, spaceAfter=12),
          P("Why it matters", h2), P("The product reframes remittance from a single transaction into an ongoing family relationship. By combining money movement with requests, balances and shared history, Settle can solve the coordination problem that begins after money is sent.", body),
          P("Why the technology fits", h2), P("Embedded wallets can remove crypto onboarding friction, while a high-throughput, low-fee network can support frequent low-value transactions. Stablecoin settlement is useful only insofar as the user experience remains simple, naira-first and reliable.", body),
          P("What must be proven", h2), P("The next evidence should be behavioral and operational: families repeatedly use the shared workflow; invites convert; requests are settled; real cash-in and cash-out work reliably; and the model can comply with applicable regulation while producing sustainable unit economics.", body),
          Spacer(1, 8*mm)]
close_text = P("<font size='7'>SETTLE IN ONE SENTENCE</font><br/><br/><b>A shared family wallet for Nigerian remittances - send, request and settle up in naira, while crypto stays under the hood.</b>", ParagraphStyle("closing", parent=body, fontSize=14, leading=20, textColor=WHITE))
close = Table([[close_text]], colWidths=[174*mm])
close.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), GREEN_DARK), ("LEFTPADDING", (0,0), (-1,-1), 12), ("RIGHTPADDING", (0,0), (-1,-1), 12), ("TOPPADDING", (0,0), (-1,-1), 10), ("BOTTOMPADDING", (0,0), (-1,-1), 10)]))
story += [close, Spacer(1, 7*mm), P("Basis and links", h2), P('This document was derived from the repository README, project submission blurb, user-interface copy, database schema and implemented send/request/settlement flows. Statements about fees, revenue, partnerships and roadmap are presented as assumptions or recommended directions where they are not implemented.<br/><br/><link href="https://settlefinance.vercel.app" color="#07955C">Live demo: settlefinance.vercel.app</link> &nbsp;&nbsp; | &nbsp;&nbsp; <link href="https://github.com/Savitura/settle" color="#07955C">Repository: github.com/Savitura/settle</link>', small)]

doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(OUT)
