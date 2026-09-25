"""Evidence-backed PDF Settlement Assessment Report — presentation layer only.

Task 34. Builds "VIKALP — Settlement Evidence Assessment Report" using
ReportLab from the already-computed, already-validated results of
`services.risk.assess_settlement_risk()`, `services.decision.
assess_settlement_decision()`, and `services.destination.
get_settlement_destinations()` (via their Pydantic response schemas —
the exact same objects `api/risk.py`, `api/decision.py`, and
`api/destination.py` already return). This module never recomputes a
hazard score, risk score, weight, risk level, decision pathway, or
destination/capacity value — it only formats what those services
already produced. There is exactly one source of truth for every
number in this report: the same services the live API already calls.

Everything else in this file (source/provenance descriptions, license
names, known limitations, the CartoDEM-derived slope discrepancy) is
static, already-documented project fact — see docs/DATA_PROVENANCE.md
and docs/DECISIONS.md — never invented here.

No fabrication rule: a null/pending/not_evaluated/no_data/
no_scoring_rule/no_evidence_found value is always shown as exactly
that. This module never substitutes 0, "Low", "Safe", "Approved", or
"Recommended" for a value the underlying API did not itself provide.
"""

from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.platypus import (
    HRFlowable,
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from ..models.settlement import Settlement
from ..schemas.decision import SettlementDecision
from ..schemas.destination import SettlementDestinationAnalysis
from ..schemas.risk import RiskAssessment

REPORT_TITLE = "VIKALP — Settlement Evidence Assessment Report"
PILOT_DEMO_LABEL = "PILOT / DEMO"

# Matches schemas/settlement.py's SettlementGeoJSONProperties wording
# verbatim (that module's private _DEMO_PLANNING_INPUT_NOTE constant) —
# duplicated as a literal label string here (presentation text, not
# business logic) rather than importing a private cross-module name.
DEMO_PLANNING_INPUT_NOTE = "Demo planning input — source validation pending"

# Documented (docs/DATA_PROVENANCE.md / docs/DECISIONS.md Task 15/27),
# not recalculated here — the processed CartoDEM-derived slope value at
# Bhitai Malli, distinct from and unreconciled with the DB/demo value
# exposed via the Settlement API.
CARTODEM_DERIVED_SLOPE_DEGREES = 22.58

# ---------------------------------------------------------------------------
# Visual design — restrained black/gold on a white/neutral document
# background, per Task 34 §6. Not the web app's own navy/white palette
# (docs/UI_SPEC.md) — a report-specific, print-oriented treatment.
# ---------------------------------------------------------------------------
_INK = colors.HexColor("#1A1917")
_GOLD = colors.HexColor("#A8822F")
_GOLD_DARK = colors.HexColor("#7C611F")
_MUTED = colors.HexColor("#5B584F")
_BORDER = colors.HexColor("#D8D3C2")
_PANEL_BG = colors.HexColor("#FAF8F2")
_WHITE = colors.white


class ReportGenerationError(Exception):
    """Raised when PDF generation fails for a reason that must not leak
    internal details (stack traces, file paths) to an API response."""


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    styles: dict[str, ParagraphStyle] = {}
    styles["Title"] = ParagraphStyle(
        "VIKALPTitle",
        parent=base["Title"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=21,
        textColor=_INK,
        spaceAfter=2,
    )
    styles["Subtitle"] = ParagraphStyle(
        "VIKALPSubtitle",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=_MUTED,
        spaceAfter=10,
    )
    styles["Section"] = ParagraphStyle(
        "VIKALPSection",
        parent=base["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12.5,
        leading=15,
        textColor=_GOLD_DARK,
        spaceBefore=14,
        spaceAfter=4,
    )
    styles["Body"] = ParagraphStyle(
        "VIKALPBody",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=_INK,
        spaceAfter=6,
    )
    styles["Muted"] = ParagraphStyle(
        "VIKALPMuted",
        parent=styles["Body"],
        fontName="Helvetica-Oblique",
        fontSize=8.5,
        leading=12,
        textColor=_MUTED,
    )
    styles["CellLabel"] = ParagraphStyle(
        "VIKALPCellLabel",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=_INK,
    )
    styles["Cell"] = ParagraphStyle(
        "VIKALPCell",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=_INK,
    )
    styles["CellHeader"] = ParagraphStyle(
        "VIKALPCellHeader",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=_WHITE,
    )
    styles["NoticeHeading"] = ParagraphStyle(
        "VIKALPNoticeHeading",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=_GOLD_DARK,
        spaceAfter=4,
    )
    return styles


def _hr(color=_GOLD, thickness=1.1, space_before=0, space_after=8):
    return HRFlowable(
        width="100%",
        thickness=thickness,
        color=color,
        spaceBefore=space_before,
        spaceAfter=space_after,
    )


def _section(story: list, styles: dict, title: str) -> None:
    story.append(_hr(color=_BORDER, thickness=0.6, space_before=2, space_after=0))
    story.append(Paragraph(title, styles["Section"]))


def _kv_table(styles: dict, rows: list[tuple[str, str]], label_width=4.6 * cm) -> Table:
    data = [
        [Paragraph(label, styles["CellLabel"]), Paragraph(str(value), styles["Cell"])]
        for label, value in rows
    ]
    table = Table(data, colWidths=[label_width, None], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LINEBELOW", (0, 0), (-1, -2), 0.4, _BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return table


def _data_table(styles: dict, header: list[str], rows: list[list[str]], col_widths=None) -> Table:
    header_row = [Paragraph(h, styles["CellHeader"]) for h in header]
    body_rows = [[Paragraph(str(cell), styles["Cell"]) for cell in row] for row in rows]
    table = Table([header_row] + body_rows, colWidths=col_widths, hAlign="LEFT", repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), _INK),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.4, _BORDER),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [_WHITE, _PANEL_BG]),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def _bullets(styles: dict, items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(item, styles["Body"]), spaceAfter=3) for item in items],
        bulletType="bullet",
        bulletColor=_GOLD_DARK,
        leftIndent=12,
    )


def _fmt(value, fallback: str = "Not available") -> str:
    if value is None:
        return fallback
    return str(value)


def _fmt_score(score: float | None) -> str:
    return "Not scored" if score is None else f"{score:.2f} / 100"


def _fmt_bool(value: bool) -> str:
    return "Yes" if value else "No"


# ---------------------------------------------------------------------------
# Section builders
# ---------------------------------------------------------------------------


def _build_metadata_section(
    story: list,
    styles: dict,
    settlement: Settlement,
    report_id: str,
    generated_at: datetime,
) -> None:
    story.append(Paragraph(REPORT_TITLE, styles["Title"]))
    story.append(
        Paragraph(
            "This report is not a relocation order, disaster declaration, "
            "government approval, evacuation order, autonomous AI decision, "
            "or final risk certification.",
            styles["Subtitle"],
        )
    )
    rows = [
        ("Report ID", report_id),
        ("Generated (UTC)", generated_at.strftime("%Y-%m-%d %H:%M:%S UTC")),
        ("Designation", f"{PILOT_DEMO_LABEL} — SIH 2026 prototype"),
        ("Officer identity", "Not authenticated in current MVP"),
        ("Settlement", settlement.name),
        ("State", settlement.state),
        ("District", settlement.district),
        (
            "Coordinates",
            f"{settlement.latitude:.6f}, {settlement.longitude:.6f} (WGS84 lat, lon)",
        ),
    ]
    story.append(_kv_table(styles, rows))
    story.append(Spacer(1, 6))


def _build_disclaimer_section(story: list, styles: dict) -> None:
    notice = [
        "VIKALP is a decision-support platform for identifying and "
        "explaining settlement risk — it does not make autonomous "
        "government decisions.",
        "This report presents currently available evidence and the "
        "current assessment status; it does not certify a final risk "
        "level.",
        "Pending or unavailable evidence is never interpreted as low "
        "risk. Absence of evidence is not evidence of safety.",
        "Officer review is required before any protection, adaptation, "
        "or relocation decision is made.",
        "This is a pilot/demo assessment for a single settlement "
        "(Bhitai Malli, Pauri Garhwal, Uttarakhand) under the SIH 2026 "
        "prototype scope.",
    ]
    panel = Table(
        [[Paragraph("Important status and disclaimer", styles["NoticeHeading"])],
         [_bullets(styles, notice)]],
        colWidths=[None],
        hAlign="LEFT",
    )
    panel.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), _PANEL_BG),
                ("BOX", (0, 0), (-1, -1), 0.9, _GOLD),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(panel)


def _build_settlement_context_section(story: list, styles: dict, settlement: Settlement) -> None:
    _section(story, styles, "Settlement Context")
    rows = [
        ("Population", f"{settlement.population} — {DEMO_PLANNING_INPUT_NOTE}"),
        ("Households", f"{settlement.households} — {DEMO_PLANNING_INPUT_NOTE}"),
        ("Elevation", f"{settlement.elevation_m:.0f} m — {DEMO_PLANNING_INPUT_NOTE}"),
        (
            "Slope (DB/demo value)",
            f"{settlement.slope_degrees:.2f}° — {DEMO_PLANNING_INPUT_NOTE}",
        ),
    ]
    story.append(_kv_table(styles, rows))
    story.append(
        Paragraph(
            "No official Census-certified population/household figure is "
            "used above; no household-size statistic is calculated or "
            "displayed.",
            styles["Muted"],
        )
    )
    story.append(Spacer(1, 4))
    story.append(
        Paragraph(
            "<b>Terrain slope discrepancy (disclosed, not resolved):</b> "
            f"the settlement record's demo slope value is "
            f"{settlement.slope_degrees:.2f}°, while the separately "
            f"processed CartoDEM-derived slope at this location is "
            f"{CARTODEM_DERIVED_SLOPE_DEGREES:.2f}° (Task 15 raster "
            "analysis; not exposed via any current API). VIKALP does not "
            "silently choose one value as authoritative. Terrain risk "
            "scoring remains pending until this discrepancy and the "
            "underlying scoring methodology are resolved through "
            "governance review.",
            styles["Body"],
        )
    )


def _build_evidence_sources_section(story: list, styles: dict) -> None:
    _section(story, styles, "GIS / Evidence Sources")

    story.append(Paragraph("<b>A. Administrative boundary context</b>", styles["Body"]))
    story.append(
        _bullets(
            styles,
            [
                "geoBoundaries — India ADM2 (district-level administrative "
                "boundaries), publisher: geoBoundaries (William &amp; Mary "
                "geoLab).",
                "Filtered to the Uttarakhand subset for this pilot; "
                "district-level context only — village-level boundary "
                "data is not currently available.",
                "License: Open Data Commons Open Database License 1.0 "
                "(ODbL 1.0), per this dataset's own recorded metadata.",
            ],
        )
    )

    story.append(Paragraph("<b>B. Terrain</b>", styles["Body"]))
    story.append(
        _bullets(
            styles,
            [
                "ISRO/NRSC Bhuvan CartoDEM v3 R1 (Cartosat-1 Digital "
                "Elevation Model) — processed elevation raster and a "
                "derived slope raster (Task 14/15).",
                "Terrain data exists, but terrain risk scoring is "
                "currently pending because the scoring governance/data "
                "issue (the slope-value discrepancy above) has not been "
                "resolved.",
            ],
        )
    )

    story.append(Paragraph("<b>C. Landslide evidence</b>", styles["Body"]))
    story.append(
        _bullets(
            styles,
            [
                "Geological Survey of India (GSI) / National Landslide "
                "Forecasting Centre (NLFC) — “Landslide Inventory "
                "(Field Validated)”, Pauri Garhwal pilot extraction "
                "(813 records).",
                "Referred to throughout this report as field-validated "
                "landslide inventory evidence — not current landslide "
                "probability, not complete landslide risk, and not a "
                "real-time landslide forecast.",
            ],
        )
    )


def _dimension_row(dim) -> list[str]:
    evidence_available = "Yes" if dim.inputs_used else "No"
    missing = ", ".join(dim.missing_inputs) if dim.missing_inputs else "—"
    return [
        dim.dimension,
        dim.status,
        _fmt_score(dim.score),
        evidence_available,
        missing,
    ]


def _build_risk_status_section(story: list, styles: dict, risk: RiskAssessment) -> None:
    _section(story, styles, "Risk Assessment Status")
    summary_rows = [
        ("Assessment status", risk.assessment_status),
        ("Overall score", _fmt_score(risk.overall_score)),
        ("Risk level", _fmt(risk.risk_level, "Not classified (no overall score)")),
        ("Data completeness", risk.data_completeness),
    ]
    story.append(_kv_table(styles, summary_rows))
    story.append(Spacer(1, 4))
    if risk.overall_score is None:
        story.append(
            Paragraph(
                "Overall risk score not computed because the complete "
                "five-dimensional assessment is not currently scoreable. "
                "This is not a zero score and not a low-risk finding — "
                "it is an honest absence of a computable result.",
                styles["Body"],
            )
        )
    story.append(Spacer(1, 4))
    story.append(
        _data_table(
            styles,
            ["Dimension", "Status", "Score", "Evidence used", "Missing inputs"],
            [_dimension_row(d) for d in risk.dimensions],
            col_widths=[4.6 * cm, 2.5 * cm, 2.2 * cm, 2.0 * cm, None],
        )
    )
    story.append(Spacer(1, 3))
    story.append(
        Paragraph(
            "Weights shown are prototype policy configuration (see "
            "docs/DECISIONS.md), not an official government standard.",
            styles["Muted"],
        )
    )


def _build_hazard_exposure_section(story: list, styles: dict, risk: RiskAssessment) -> None:
    _section(story, styles, "Hazard Exposure Evidence")
    hazard_dim = next((d for d in risk.dimensions if d.dimension == "Hazard Exposure"), None)
    detail = hazard_dim.hazard_exposure_detail if hazard_dim else None

    if detail is None:
        story.append(
            Paragraph(
                "Structured Hazard Exposure evidence is not available for "
                "this settlement.",
                styles["Body"],
            )
        )
        return

    if detail.qualifying_record_count == 0:
        story.append(
            Paragraph(
                "No qualifying GSI landslide inventory record was found "
                f"within the approved {detail.scoring_radius_km:.0f} km "
                "scoring radius. This means <b>no qualifying evidence was "
                "found within the scoring radius</b> — it does not mean "
                "no hazard exists. VIKALP does not state that Bhitai "
                "Malli is safe, and does not state that landslide risk is "
                "zero.",
                styles["Body"],
            )
        )

    rows = [
        ("Status", detail.status),
        ("Qualifying record count", str(detail.qualifying_record_count)),
        (
            "Nearest qualifying distance",
            _fmt(
                f"{detail.nearest_qualifying_distance_km:.3f} km"
                if detail.nearest_qualifying_distance_km is not None
                else None,
                "None within scoring radius",
            ),
        ),
        ("Contextual (1–" f"{detail.context_radius_km:.0f} km) record count", str(detail.contextual_record_count)),
        (
            "Nearest contextual distance",
            _fmt(
                f"{detail.nearest_contextual_distance_km:.3f} km"
                if detail.nearest_contextual_distance_km is not None
                else None
            ),
        ),
        ("Source dataset", detail.source_dataset),
        ("Source feature count", _fmt(detail.source_feature_count)),
    ]
    story.append(_kv_table(styles, rows))
    story.append(Spacer(1, 4))
    story.append(Paragraph(detail.inventory_bias_disclaimer, styles["Muted"]))
    story.append(Paragraph(detail.policy_disclaimer, styles["Muted"]))
    if detail.limitations:
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>Limitations</b>", styles["Body"]))
        story.append(_bullets(styles, detail.limitations))


def _build_decision_section(story: list, styles: dict, decision: SettlementDecision) -> None:
    _section(story, styles, "Decision Workspace Status")
    story.append(
        _kv_table(
            styles,
            [
                ("Decision status", decision.decision_status),
                ("Risk assessment status", decision.risk_assessment_status),
                ("Officer review required", _fmt_bool(decision.officer_review_required)),
            ],
        )
    )
    story.append(Spacer(1, 4))
    story.append(
        _data_table(
            styles,
            ["Pathway", "Status", "Recommended"],
            [[p.pathway, p.status, _fmt_bool(p.recommended)] for p in decision.pathways],
            col_widths=[4 * cm, 5 * cm, None],
        )
    )
    story.append(Spacer(1, 4))
    story.append(
        Paragraph(
            "VIKALP does not automatically recommend relocation from the "
            "current evidence. Incomplete evidence is never treated as a "
            "basis for inferring that relocation is warranted.",
            styles["Body"],
        )
    )
    if decision.missing_evidence:
        story.append(Spacer(1, 2))
        story.append(Paragraph("<b>Evidence required before evaluation</b>", styles["Body"]))
        story.append(_bullets(styles, decision.missing_evidence))


def _build_destination_section(
    story: list, styles: dict, destination: SettlementDestinationAnalysis
) -> None:
    _section(story, styles, "Destination / Capacity Status")
    candidate_count = len(destination.candidates)
    story.append(
        _kv_table(
            styles,
            [
                ("Analysis status", destination.analysis_status),
                ("Ranking status", destination.ranking_status),
                ("Candidate count", str(candidate_count)),
                (
                    "Suitability dimensions defined",
                    str(len(destination.suitability_dimensions)),
                ),
            ],
        )
    )
    story.append(Spacer(1, 4))
    if candidate_count == 0:
        story.append(
            Paragraph(
                "No candidate destination data is currently available for "
                "assessment. This is not a statement that no safe "
                "destinations exist — no government-curated candidate "
                "dataset has been provided to VIKALP yet.",
                styles["Body"],
            )
        )
        story.append(
            Paragraph(
                "Capacity assessment has not been initiated. No developable "
                "land, service, or capacity figure — including zero — "
                "is reported for this settlement's relocation destinations.",
                styles["Body"],
            )
        )
    else:
        story.append(
            Paragraph(
                f"{candidate_count} candidate destination(s) are recorded; "
                "see the Destination Explorer for full detail (not "
                "reproduced here).",
                styles["Body"],
            )
        )


_PROVENANCE_ROWS = [
    (
        "Administrative boundaries",
        "geoBoundaries India ADM2 (William &amp; Mary geoLab), ODbL 1.0",
        "District-level map context (Uttarakhand)",
        "Village-level boundaries not available",
    ),
    (
        "CartoDEM terrain",
        "NRSC/ISRO CartoDEM v3 R1, via Bhuvan (registered-user access)",
        "Source elevation raster for slope derivation",
        "Terrain risk scoring pending governance decision",
    ),
    (
        "Derived slope",
        "Derived from CartoDEM via Horn's method (Task 15)",
        "Reference terrain evidence",
        "22.58° derived value vs. 18.91° demo value — "
        "discrepancy disclosed, not resolved",
    ),
    (
        "GSI landslide inventory",
        "GSI/NLFC Landslide Inventory (Field Validated), Bhusanket portal",
        "Hazard Exposure landslide-proximity evidence",
        "813 records, Pauri Garhwal extraction; documented inventory, "
        "not a complete hazard probability model",
    ),
    (
        "Population/household demo inputs",
        "Settlement seed record (backend/app/database.py)",
        "Population/Household Exposure raw inputs",
        DEMO_PLANNING_INPUT_NOTE + "; no scoring rule approved yet",
    ),
]


def _build_provenance_section(story: list, styles: dict) -> None:
    _section(story, styles, "Data Governance / Provenance")
    story.append(
        _data_table(
            styles,
            ["Data / Evidence", "Source", "Current use", "Status / limitation"],
            [list(row) for row in _PROVENANCE_ROWS],
            col_widths=[3.6 * cm, 4.2 * cm, 3.6 * cm, None],
        )
    )


_LIMITATIONS = [
    "Pilot geography is one selected region/settlement (Bhitai Malli, "
    "Pauri Garhwal, Uttarakhand).",
    "Full five-dimensional risk scoring is not yet available.",
    "Terrain scoring is pending.",
    "Historical disaster scoring is pending.",
    "Population exposure scoring is pending.",
    "Vulnerability data is unavailable.",
    "No government-curated destination candidate dataset is currently "
    "integrated.",
    "Carrying-capacity calculation is pending.",
    "Relocation recommendation is not produced.",
    "Current landslide evidence is an inventory, not a complete current "
    "hazard probability model.",
    "Population/household demo inputs require source validation.",
    "Terrain slope discrepancy remains unresolved.",
    "Officer review remains necessary.",
]


def _build_limitations_section(story: list, styles: dict) -> None:
    _section(story, styles, "Current Limitations")
    story.append(_bullets(styles, _LIMITATIONS))


def _build_officer_review_section(story: list, styles: dict) -> None:
    _section(story, styles, "Officer Review")
    story.append(
        _kv_table(
            styles,
            [
                ("Officer review status", "REQUIRED"),
                (
                    "Reason",
                    "Current evidence is incomplete for a complete "
                    "multi-dimensional assessment and no autonomous "
                    "intervention decision is issued.",
                ),
                (
                    "Officer action",
                    "Review available evidence, verify missing inputs, "
                    "and determine whether further departmental "
                    "assessment is required.",
                ),
            ]
        )
    )
    story.append(Spacer(1, 14))
    story.append(Paragraph("Officer review / acknowledgement:", styles["Body"]))
    story.append(Spacer(1, 22))
    story.append(_hr(color=_BORDER, thickness=0.7, space_before=0, space_after=2))
    story.append(
        Paragraph(
            "Name / designation / signature / date (to be completed by "
            "reviewing officer)",
            styles["Muted"],
        )
    )


# ---------------------------------------------------------------------------
# Page decoration — header/footer with "Page X of Y" (Task 34 §5, Section 12)
# ---------------------------------------------------------------------------


class _NumberedCanvas(pdfcanvas.Canvas):
    """Defers the footer's page count until every page has been drawn,
    using ReportLab's standard two-pass recipe (buffer each page's state
    via showPage, replay + stamp the footer in save())."""

    def __init__(self, *args, **kwargs):
        pdfcanvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states: list[dict] = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_decoration(total_pages)
            pdfcanvas.Canvas.showPage(self)
        pdfcanvas.Canvas.save(self)

    def _draw_decoration(self, total_pages: int) -> None:
        width, _height = A4
        # Footer
        self.setStrokeColor(_BORDER)
        self.setLineWidth(0.6)
        self.line(1.8 * cm, 1.7 * cm, width - 1.8 * cm, 1.7 * cm)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(_MUTED)
        footer_text = (
            f"VIKALP · Settlement Evidence Assessment Report · "
            f"{PILOT_DEMO_LABEL} · Page {self._pageNumber} of {total_pages}"
        )
        self.drawCentredString(width / 2.0, 1.15 * cm, footer_text)
        # Header (skip decorative header rule on the title page itself)
        if self._pageNumber > 1:
            self.setStrokeColor(_GOLD)
            self.setLineWidth(0.8)
            self.line(1.8 * cm, A4[1] - 1.5 * cm, width - 1.8 * cm, A4[1] - 1.5 * cm)
            self.setFont("Helvetica-Bold", 7.5)
            self.setFillColor(_INK)
            self.drawString(1.8 * cm, A4[1] - 1.35 * cm, "VIKALP")
            self.setFont("Helvetica", 7.5)
            self.setFillColor(_MUTED)
            self.drawRightString(
                width - 1.8 * cm,
                A4[1] - 1.35 * cm,
                "Settlement Evidence Assessment Report — " + PILOT_DEMO_LABEL,
            )


def _report_id(settlement_id: int, generated_at: datetime) -> str:
    return f"VIKALP-RPT-{settlement_id:04d}-{generated_at.strftime('%Y%m%dT%H%M%SZ')}"


def generate_settlement_report(
    settlement: Settlement,
    risk: RiskAssessment,
    decision: SettlementDecision,
    destination: SettlementDestinationAnalysis,
) -> bytes:
    """Build the PDF report and return its raw bytes.

    `pageCompression=0` is used deliberately: it keeps the PDF's text
    content streams uncompressed so both this module's own tests and
    any future inspection can verify report content (e.g. that the
    settlement name and title appear) by searching the raw PDF bytes
    directly, without adding a PDF-parsing dependency.
    """
    try:
        generated_at = datetime.now(timezone.utc)
        report_id = _report_id(settlement.id, generated_at)
        styles = _styles()

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=2.6 * cm,
            bottomMargin=2.2 * cm,
            leftMargin=1.8 * cm,
            rightMargin=1.8 * cm,
            title=REPORT_TITLE,
            author="VIKALP",
            pageCompression=0,
        )

        story: list = []
        _build_metadata_section(story, styles, settlement, report_id, generated_at)
        _build_disclaimer_section(story, styles)
        _build_settlement_context_section(story, styles, settlement)
        _build_evidence_sources_section(story, styles)
        _build_risk_status_section(story, styles, risk)
        _build_hazard_exposure_section(story, styles, risk)
        _build_decision_section(story, styles, decision)
        _build_destination_section(story, styles, destination)
        _build_provenance_section(story, styles)
        _build_limitations_section(story, styles)
        _build_officer_review_section(story, styles)

        doc.build(story, canvasmaker=_NumberedCanvas)
        return buffer.getvalue()
    except ReportGenerationError:
        raise
    except Exception as exc:  # noqa: BLE001 - intentionally broad; re-raised safely
        raise ReportGenerationError(
            "Report generation failed while building the PDF."
        ) from exc
