import os
import datetime
from sqlalchemy.orm import Session
from .database import AuditLog

# ReportLab imports for generating beautiful PDF reports
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import (
    Drawing, Line, Rect, Circle, String, PolyLine, Polygon
)
from reportlab.graphics import renderPDF
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.widgets.markers import makeMarker


def log_audit(db: Session, user_id: int | None, action: str, ip_address: str | None = None):
    """
    Logs user and system events to the database audit log.
    """
    try:
        log = AuditLog(
            user_id=user_id,
            action=action,
            ip_address=ip_address,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Failed to log audit event: {e}")


DR_STAGE_INDEX = {
    "No DR": 0, "Mild DR": 1, "Moderate DR": 2,
    "Severe DR": 3, "Proliferative DR": 4
}
DR_STAGE_LABELS = ["No DR", "Mild", "Moderate", "Severe", "Prolif."]

STAGE_COLORS_PDF = [
    colors.HexColor("#22c55e"),   # No DR — green
    colors.HexColor("#eab308"),   # Mild — yellow
    colors.HexColor("#f97316"),   # Moderate — orange
    colors.HexColor("#ef4444"),   # Severe — red
    colors.HexColor("#7f1d1d"),   # Proliferative — dark red
]


def _build_progression_chart(scan_history, width=540, height=180):
    """
    Builds a ReportLab Drawing that shows DR stage progression over time.
    Returns a Drawing object ready to be added to the story.
    """
    if not scan_history or len(scan_history) < 1:
        return None

    PAD_L = 60   # left padding for y-axis labels
    PAD_R = 20
    PAD_T = 20
    PAD_B = 50   # bottom padding for x-axis labels

    inner_w = width - PAD_L - PAD_R
    inner_h = height - PAD_T - PAD_B

    d = Drawing(width, height)

    # ── Background ──
    d.add(Rect(0, 0, width, height,
               fillColor=colors.HexColor("#F8FAFC"),
               strokeColor=colors.HexColor("#E2E8F0"),
               strokeWidth=1))

    # ── Grid lines & Y-axis labels (0–4 = 5 stages) ──
    for i, label in enumerate(DR_STAGE_LABELS):
        y = PAD_B + (i / 4) * inner_h
        # Grid line
        d.add(Line(PAD_L, y, PAD_L + inner_w, y,
                   strokeColor=colors.HexColor("#E2E8F0"),
                   strokeWidth=0.5))
        # Stage label
        d.add(String(PAD_L - 5, y - 4, label,
                     fontSize=7,
                     fillColor=colors.HexColor("#64748B"),
                     textAnchor="end"))
        # Stage dot on Y axis
        d.add(Circle(PAD_L, y, 3,
                     fillColor=STAGE_COLORS_PDF[i],
                     strokeColor=colors.white,
                     strokeWidth=0.5))

    # ── Plot points ──
    sorted_history = sorted(scan_history, key=lambda p: p.scan_date)
    n = len(sorted_history)

    points = []
    for idx, scan in enumerate(sorted_history):
        stage_idx = DR_STAGE_INDEX.get(scan.prediction_class, 0)
        x = PAD_L + (idx / max(n - 1, 1)) * inner_w
        y = PAD_B + (stage_idx / 4) * inner_h
        points.append((x, y, stage_idx, scan.scan_date, scan.prediction_class))

    # ── Gradient-fill area under the line ──
    if len(points) >= 2:
        poly_pts = [PAD_L, PAD_B]
        for (x, y, _, _, _) in points:
            poly_pts += [x, y]
        poly_pts += [PAD_L + inner_w if n > 1 else PAD_L, PAD_B]

        d.add(Polygon(poly_pts,
                      fillColor=colors.HexColor("#0B7285"),
                      fillOpacity=0.08,
                      strokeColor=None))

    # ── Connect points with colored line segments ──
    for i in range(len(points) - 1):
        x1, y1, idx1, _, _ = points[i]
        x2, y2, idx2, _, _ = points[i + 1]
        avg_idx = (idx1 + idx2) // 2
        seg_color = STAGE_COLORS_PDF[avg_idx]
        d.add(Line(x1, y1, x2, y2,
                   strokeColor=seg_color,
                   strokeWidth=2.5))

    # ── Data point circles + date labels ──
    for i, (x, y, stage_idx, scan_date, pred_class) in enumerate(points):
        dot_color = STAGE_COLORS_PDF[stage_idx]
        # Outer ring
        d.add(Circle(x, y, 6,
                     fillColor=colors.white,
                     strokeColor=dot_color,
                     strokeWidth=2))
        # Inner fill
        d.add(Circle(x, y, 3, fillColor=dot_color, strokeColor=None))

        # Date label below x-axis
        date_str = scan_date.strftime("%m/%d") if scan_date else ""
        d.add(String(x, PAD_B - 14, date_str,
                     fontSize=6.5,
                     fillColor=colors.HexColor("#64748B"),
                     textAnchor="middle"))

    # ── X-axis base line ──
    d.add(Line(PAD_L, PAD_B, PAD_L + inner_w, PAD_B,
               strokeColor=colors.HexColor("#CBD5E1"),
               strokeWidth=1))

    # ── Y-axis base line ──
    d.add(Line(PAD_L, PAD_B, PAD_L, PAD_B + inner_h,
               strokeColor=colors.HexColor("#CBD5E1"),
               strokeWidth=1))

    # ── Chart title ──
    d.add(String(PAD_L + inner_w / 2, height - 10,
                 "DR Severity Progression Over Time",
                 fontSize=9,
                 fillColor=colors.HexColor("#0B7285"),
                 textAnchor="middle"))

    return d


def generate_pdf_report(
    output_path: str,
    patient_name: str,
    email: str,
    phone: str,
    age: str,
    gender: str,
    prediction_class: str,
    confidence: float,
    risk_level: str,
    recommendation: str,
    detail_bullets: list,
    clinical_summary: str,
    scan_date: datetime.datetime,
    orig_img_path: str,
    heatmap_img_path: str,
    scan_history: list = None
) -> bool:
    """
    Generates a professional, medical-grade PDF report using ReportLab.
    Includes patient demographics, retinal images, Grad-CAM, clinical findings,
    and a DR progression chart over time.
    """
    try:
        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()

        # ── Brand colour palette ──
        primary_color   = colors.HexColor("#0B7285")
        secondary_color = colors.HexColor("#14B8A6")
        text_color      = colors.HexColor("#1E293B")
        bg_light        = colors.HexColor("#F8FAFC")

        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            textColor=primary_color,
            spaceAfter=6
        )

        subtitle_style = ParagraphStyle(
            'DocSub',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=10,
            textColor=secondary_color,
            spaceAfter=15
        )

        h2_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            textColor=primary_color,
            spaceBefore=10,
            spaceAfter=6,
            borderPadding=2
        )

        body_style = ParagraphStyle(
            'BodyTextCustom',
            parent=styles['BodyText'],
            fontName='Helvetica',
            fontSize=10,
            textColor=text_color,
            spaceAfter=6,
            leading=14
        )

        disclaimer_style = ParagraphStyle(
            'DisclaimerCustom',
            parent=styles['Normal'],
            fontName='Helvetica-BoldOblique',
            fontSize=8,
            textColor=colors.HexColor("#64748B"),
            alignment=1,
            leading=12
        )

        story = []

        # ── 1. Header Banner ──────────────────────────────────────
        header_data = [[
            Paragraph("AcuSight AI", title_style),
            Paragraph(
                f"Report Date: {scan_date.strftime('%Y-%m-%d %H:%M:%S UTC')}",
                body_style
            )
        ]]
        header_table = Table(header_data, colWidths=[300, 240])
        header_table.setStyle(TableStyle([
            ('VALIGN',      (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN',       (1, 0), (1,  0),  'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LINEBELOW',   (0, 0), (-1, -1), 1.5, primary_color)
        ]))
        story.append(header_table)
        story.append(Paragraph(
            "Diabetic Retinopathy Screening Assistance Report", subtitle_style
        ))
        story.append(Spacer(1, 10))

        # ── 2. Patient Info + Screening Summary ──────────────────
        # Build patient left-column text dynamically
        patient_lines = [f"<b>Name:</b> {patient_name}"]
        patient_lines.append(f"<b>Email:</b> {email}")
        if age:
            patient_lines.append(f"<b>Age:</b> {age}")
        if gender:
            patient_lines.append(f"<b>Gender:</b> {gender}")
        if phone:
            patient_lines.append(f"<b>Phone:</b> {phone}")
        patient_lines.append(f"<b>Scan Time:</b> {scan_date.strftime('%Y-%m-%d %H:%M')}")
        patient_text = "<br/>".join(patient_lines)

        screening_text = (
            f"<b>Prediction:</b> {prediction_class}<br/>"
            f"<b>Confidence:</b> {confidence:.1f}%<br/>"
            f"<b>Risk Assessment:</b> {risk_level}"
        )

        info_data = [
            [
                Paragraph("<b>Patient Information</b>", h2_style),
                Paragraph("<b>Screening Summary</b>", h2_style)
            ],
            [
                Paragraph(patient_text, body_style),
                Paragraph(screening_text, body_style)
            ]
        ]
        info_table = Table(info_data, colWidths=[270, 270])
        info_table.setStyle(TableStyle([
            ('BACKGROUND',    (0, 0), (-1, -1), bg_light),
            ('BOX',           (0, 0), (-1, -1), 0.5,  colors.HexColor("#CBD5E1")),
            ('INNERGRID',     (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
            ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING',    (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING',   (0, 0), (-1, -1), 10),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 10),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 15))

        # ── 3. Retinal Images Section ─────────────────────────────
        story.append(Paragraph(
            "Retinal Fundus Image & Explainable AI Visualization", h2_style
        ))

        orig_img_flowable    = None
        heatmap_img_flowable = None

        if os.path.exists(orig_img_path):
            try:
                orig_img_flowable = Image(orig_img_path, width=200, height=200)
            except Exception as e:
                print(f"Error loading original image for PDF: {e}")

        if heatmap_img_path and os.path.exists(heatmap_img_path):
            try:
                heatmap_img_flowable = Image(heatmap_img_path, width=200, height=200)
            except Exception as e:
                print(f"Error loading heatmap image for PDF: {e}")

        if orig_img_flowable and heatmap_img_flowable:
            img_data = [
                [orig_img_flowable, heatmap_img_flowable],
                [
                    Paragraph(
                        "<font color='#0b7285'><b>Original Scan Preview</b></font>",
                        body_style
                    ),
                    Paragraph(
                        "<font color='#0b7285'><b>Grad-CAM Explainability Heatmap</b></font>",
                        body_style
                    )
                ]
            ]
            img_table = Table(img_data, colWidths=[270, 270])
            img_table.setStyle(TableStyle([
                ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 1), (-1,  1), 5),
                ('TOPPADDING',    (0, 0), (-1, -1), 5),
            ]))
            story.append(img_table)
            story.append(Paragraph(
                "<font color='#64748b'><i>Note: Warm-colored regions in the heatmap represent "
                "features (hemorrhages, microaneurysms, or abnormal vessel growth) that "
                "influenced the AI screening prediction.</i></font>",
                disclaimer_style
            ))
        else:
            story.append(Paragraph(
                "Image visualizations could not be rendered in this report.", body_style
            ))

        story.append(Spacer(1, 15))

        # ── 4. DR Progression Chart ───────────────────────────────
        if scan_history and len(scan_history) >= 1:
            story.append(Paragraph("DR Severity Progression Over Time", h2_style))

            chart_drawing = _build_progression_chart(scan_history, width=540, height=190)
            if chart_drawing:
                story.append(chart_drawing)

            # Legend row
            legend_items = []
            for i, (label, col) in enumerate(zip(
                ["No DR", "Mild DR", "Moderate DR", "Severe DR", "Proliferative DR"],
                STAGE_COLORS_PDF
            )):
                hex_col = col.hexval() if hasattr(col, 'hexval') else "#000000"
                legend_items.append(
                    Paragraph(
                        f"<font color='{hex_col}'>●</font> {label}",
                        ParagraphStyle(
                            f'leg{i}',
                            parent=body_style,
                            fontSize=7,
                            leading=10,
                            spaceAfter=0
                        )
                    )
                )

            legend_table = Table(
                [legend_items],
                colWidths=[108] * 5
            )
            legend_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(legend_table)
            story.append(Paragraph(
                "<font color='#64748b'><i>Each point on the chart represents a scan. "
                "Higher position = more severe DR stage.</i></font>",
                disclaimer_style
            ))
            story.append(Spacer(1, 15))

        # ── 5. Clinical Notes and Action Plan ────────────────────
        findings_story = []
        findings_story.append(Paragraph("Clinical Analysis & Findings", h2_style))
        findings_story.append(Paragraph(
            f"<b>AI Clinical Finding:</b> {clinical_summary}", body_style
        ))
        findings_story.append(Spacer(1, 5))
        findings_story.append(Paragraph(
            f"<b>Summary Assessment:</b> {recommendation}", body_style
        ))
        findings_story.append(Spacer(1, 8))

        bullet_style = ParagraphStyle(
            'BulletItem',
            parent=body_style,
            leftIndent=15,
            spaceAfter=4,
            bulletIndent=5,
            leading=14,
        )
        findings_story.append(Paragraph("<b>Recommended Actions:</b>", body_style))
        for bullet in (detail_bullets or []):
            findings_story.append(Paragraph(f"•  {bullet}", bullet_style))

        story.append(KeepTogether(findings_story))
        story.append(Spacer(1, 20))

        # ── 6. Footer Medical Disclaimer ─────────────────────────
        disclaimer_text = (
            "<b>CRITICAL MEDICAL DISCLAIMER:</b> This screening assisting report is generated "
            "by a deep learning artificial intelligence model trained on synthetic retinal data. "
            "It is intended solely for screening assistance and does not replace a comprehensive "
            "clinical ophthalmic evaluation. It is NOT an absolute medical diagnosis. "
            "The clinical findings must be verified by a board-certified ophthalmologist or "
            "specialist before any visual care intervention or treatment decisions are made."
        )

        disclaimer_box = Table(
            [[Paragraph(disclaimer_text, disclaimer_style)]],
            colWidths=[540]
        )
        disclaimer_box.setStyle(TableStyle([
            ('BACKGROUND',    (0, 0), (0, 0), colors.HexColor("#FEE2E2")),
            ('BOX',           (0, 0), (0, 0), 1,  colors.HexColor("#EF4444")),
            ('TOPPADDING',    (0, 0), (0, 0), 10),
            ('BOTTOMPADDING', (0, 0), (0, 0), 10),
            ('LEFTPADDING',   (0, 0), (0, 0), 15),
            ('RIGHTPADDING',  (0, 0), (0, 0), 15),
        ]))

        story.append(KeepTogether([disclaimer_box]))

        doc.build(story)
        return True

    except Exception as e:
        print(f"Error generating PDF report: {e}")
        return False
