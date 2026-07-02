# ============================================================
# routers/passport_pdf.py
#
# GET /api/children/{id}/passport/pdf
# Generates a professional hospital-ready PDF Communication Passport.
# Uses reportlab (pure Python, no external services).
# ============================================================

import io
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import models
from database import get_db
from services import behavior_service, prediction_service

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, KeepTogether
    )
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

router = APIRouter(tags=["passport"])

CLINICAL_BLUE = colors.HexColor("#2e6ff2")
TEAL = colors.HexColor("#0fae9c")
AMBER = colors.HexColor("#f59e0b")
CORAL = colors.HexColor("#f4654a")
SLATE_700 = colors.HexColor("#334155")
SLATE_500 = colors.HexColor("#64748b")
SLATE_100 = colors.HexColor("#f1f5f9")
WHITE = colors.white
RED_LIGHT = colors.HexColor("#fff1f0")
GREEN_LIGHT = colors.HexColor("#f0fdf4")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _passport_data(db: Session, child_id: str) -> dict:
    child = db.query(models.Child).filter(models.Child.id == child_id).first()
    if not child:
        return None

    dict_entries = behavior_service.build_behavior_dictionary(db, child_id)
    passport = child.passport
    emergency_notes = passport.emergencyNotes if passport else ""
    medical_alerts = passport.medicalAlerts if passport else ""
    comfort_items = passport.comfortItems if passport else ""
    custom_triggers = json.loads(passport.customTriggers or "[]") if passport else []

    seen = []
    for e in dict_entries:
        if e["need"] not in seen:
            seen.append(e["need"])
    top_needs = seen[:6]

    accuracy = prediction_service.get_prediction_accuracy(db, child_id)

    return {
        "child": child,
        "dictionary": dict_entries,
        "topNeeds": top_needs,
        "emergencyNotes": emergency_notes or "",
        "medicalAlerts": medical_alerts or "",
        "comfortItems": comfort_items or "",
        "customTriggers": custom_triggers,
        "accuracy": accuracy,
        "triggersByNeed": [
            {"need": n, "triggers": behavior_service.KNOWN_TRIGGERS_LIBRARY.get(n, [])}
            for n in top_needs
        ],
        "recommendedResponses": [
            {"need": n, "response": behavior_service.RECOMMENDED_RESPONSES.get(n, "")}
            for n in top_needs
        ],
        "whatToAvoid": [
            {"need": n, "avoid": behavior_service.WHAT_NOT_TO_DO.get(n, "")}
            for n in top_needs
        ],
        "speechOutputs": {
            n: behavior_service.NEED_SPEECH_OUTPUT.get(n, "") for n in top_needs
        },
    }


@router.get("/children/{child_id}/passport/pdf")
def export_passport_pdf(child_id: str, db: Session = Depends(get_db)):
    if not REPORTLAB_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="PDF export requires reportlab. Run: pip install reportlab"
        )

    data = _passport_data(db, child_id)
    if not data:
        raise HTTPException(status_code=404, detail="Child not found")

    child = data["child"]
    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"NeuroVoice AI — {child.name} Communication Passport",
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "PassportTitle",
        parent=styles["Heading1"],
        fontSize=22,
        textColor=WHITE,
        spaceAfter=2,
        fontName="Helvetica-Bold",
    )
    eyebrow_style = ParagraphStyle(
        "Eyebrow",
        fontSize=9,
        textColor=colors.HexColor("#93c5fd"),
        spaceAfter=4,
        fontName="Helvetica",
        letterSpacing=1,
    )
    section_title_style = ParagraphStyle(
        "SectionTitle",
        fontSize=11,
        textColor=CLINICAL_BLUE,
        fontName="Helvetica-Bold",
        spaceBefore=10,
        spaceAfter=5,
    )
    body_style = ParagraphStyle(
        "Body",
        fontSize=10,
        textColor=SLATE_700,
        fontName="Helvetica",
        spaceAfter=4,
        leading=14,
    )
    small_style = ParagraphStyle(
        "Small",
        fontSize=8.5,
        textColor=SLATE_500,
        fontName="Helvetica",
        leading=12,
    )
    need_label_style = ParagraphStyle(
        "NeedLabel",
        fontSize=9,
        textColor=CLINICAL_BLUE,
        fontName="Helvetica-Bold",
    )
    speech_style = ParagraphStyle(
        "Speech",
        fontSize=10,
        textColor=colors.HexColor("#1d4ed8"),
        fontName="Helvetica-Oblique",
        leftIndent=8,
        spaceAfter=2,
    )

    story = []

    # ── Header block ──────────────────────────────────────────
    header_data = [[
        Paragraph("NeuroVoice AI · Communication Passport", eyebrow_style),
        Paragraph(f"AI Accuracy: {data['accuracy']}%" if data['accuracy'] is not None else "", body_style),
    ]]
    header_table = Table(header_data, colWidths=["75%", "25%"])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CLINICAL_BLUE),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TEXTCOLOR", (1, 0), (1, 0), WHITE),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(header_table)

    name_row = [[
        Paragraph(child.name, title_style),
        Paragraph(
            f"{child.age} yrs · {child.gender} · Caregiver: {child.caregiver}<br/>{child.supportLevel}",
            ParagraphStyle("Sub", fontSize=10, textColor=colors.HexColor("#bfdbfe"), fontName="Helvetica"),
        ),
    ]]
    name_table = Table(name_row, colWidths=["55%", "45%"])
    name_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CLINICAL_BLUE),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(name_table)
    story.append(Spacer(1, 10))

    # ── Emergency Notes ───────────────────────────────────────
    story.append(Paragraph("⚠ Emergency Notes", section_title_style))
    emergency_text = data["emergencyNotes"] or "No emergency notes added by caregiver."
    emerg_table = Table([[Paragraph(emergency_text, body_style)]], colWidths=["100%"])
    emerg_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), RED_LIGHT),
        ("BOX", (0, 0), (-1, -1), 1.5, CORAL),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [RED_LIGHT]),
    ]))
    story.append(emerg_table)
    story.append(Spacer(1, 8))

    # ── Medical Alerts + Comfort Items ────────────────────────
    row2 = [
        [
            Paragraph("Medical Alerts", section_title_style),
            Paragraph("Comfort Items & Preferences", section_title_style),
        ],
        [
            Paragraph(data["medicalAlerts"] or "No medical alerts recorded.", body_style),
            Paragraph(data["comfortItems"] or "No comfort items recorded.", body_style),
        ]
    ]
    row2_table = Table(row2, colWidths=["49%", "49%"], hAlign="LEFT",
                       spaceBefore=0, spaceAfter=0,
                       rowHeights=[None, None])
    row2_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SLATE_100),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("COLPADDING", (0, 0), (-1, -1), 6),
        ("LINEAFTER", (0, 0), (0, -1), 1, colors.HexColor("#cbd5e1")),
    ]))
    story.append(row2_table)
    story.append(Spacer(1, 8))

    # ── Known Triggers ────────────────────────────────────────
    all_triggers = list(data["customTriggers"]) + [
        t for tbn in data["triggersByNeed"] for t in tbn["triggers"]
    ]
    if all_triggers:
        story.append(Paragraph("Known Triggers", section_title_style))
        trigger_text = " · ".join(all_triggers)
        story.append(Paragraph(trigger_text, body_style))
        story.append(Spacer(1, 6))

    # ── Behavioral Dictionary ─────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Behavioral Dictionary", section_title_style))

    if data["dictionary"]:
        dict_header = [
            Paragraph("Observed Behavior", ParagraphStyle("H", fontSize=9, fontName="Helvetica-Bold", textColor=WHITE)),
            Paragraph("Predicted Need", ParagraphStyle("H", fontSize=9, fontName="Helvetica-Bold", textColor=WHITE)),
            Paragraph("Confidence", ParagraphStyle("H", fontSize=9, fontName="Helvetica-Bold", textColor=WHITE)),
            Paragraph("Samples", ParagraphStyle("H", fontSize=9, fontName="Helvetica-Bold", textColor=WHITE)),
        ]
        dict_rows = [dict_header]
        for entry in data["dictionary"][:12]:
            dict_rows.append([
                Paragraph(entry["behaviorLabel"], body_style),
                Paragraph(entry["need"], body_style),
                Paragraph(f"{entry['avgConfidenceScore']}%", body_style),
                Paragraph(str(entry["sampleCount"]), body_style),
            ])
        dict_table = Table(dict_rows, colWidths=["35%", "30%", "18%", "17%"])
        dict_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), CLINICAL_BLUE),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, SLATE_100]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(dict_table)
    else:
        story.append(Paragraph("No behaviors recorded yet.", small_style))

    story.append(Spacer(1, 8))

    # ── Recommended Responses + What To Avoid ─────────────────
    if data["recommendedResponses"]:
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
        story.append(Spacer(1, 4))

        resp_rows = []
        for item in data["recommendedResponses"]:
            resp_rows.append([
                Paragraph(item["need"], need_label_style),
                Paragraph(item["response"], body_style),
            ])

        avoid_rows = []
        for item in data["whatToAvoid"]:
            avoid_rows.append([
                Paragraph(item["need"], need_label_style),
                Paragraph(item["avoid"], body_style),
            ])

        col_pair = [
            [
                Paragraph("✓ Recommended Responses", section_title_style),
                Table(resp_rows, colWidths=["38%", "62%"], style=TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), GREEN_LIGHT),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LINEBEFORE", (1, 0), (1, -1), 0.5, TEAL),
                ])) if resp_rows else Paragraph("None", small_style),
            ],
            [
                Paragraph("✕ What To Avoid", section_title_style),
                Table(avoid_rows, colWidths=["38%", "62%"], style=TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), RED_LIGHT),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LINEBEFORE", (1, 0), (1, -1), 0.5, CORAL),
                ])) if avoid_rows else Paragraph("None", small_style),
            ],
        ]

        two_col = Table([[col_pair[0], col_pair[1]]], colWidths=["49%", "49%"])
        two_col.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(two_col)
        story.append(Spacer(1, 8))

    # ── Speech Outputs ────────────────────────────────────────
    if data["speechOutputs"]:
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
        story.append(Spacer(1, 4))
        story.append(Paragraph("🔊 Child's Voice — Speech Outputs", section_title_style))
        for need, speech in data["speechOutputs"].items():
            if speech:
                story.append(Paragraph(f"<b>{need}:</b>", body_style))
                story.append(Paragraph(f'"{speech}"', speech_style))

    story.append(Spacer(1, 12))

    # ── Footer ────────────────────────────────────────────────
    generated_at = datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")
    footer_text = (
        f"Generated by NeuroVoice AI on {generated_at}. "
        "This passport was created from caregiver-labelled behavioral data and "
        "is provided for clinical reference only. It does not replace professional medical judgment."
    )
    story.append(HRFlowable(width="100%", thickness=0.5, color=SLATE_500))
    story.append(Spacer(1, 4))
    story.append(Paragraph(footer_text, small_style))

    doc.build(story)
    buf.seek(0)

    safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in child.name)
    filename = f"neurovoice_{safe_name}_passport.pdf"

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
