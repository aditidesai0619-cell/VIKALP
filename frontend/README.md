# VIKALP

### Intelligent Decision Support for Hazard-Prone Habitations & Proactive Relocation Planning

VIKALP is a government-focused GIS decision-support platform designed to help disaster management authorities identify vulnerable habitations, understand hazard exposure, evaluate **Protect / Adapt / Relocate** pathways, and plan safer relocation using evidence-based geographic and settlement information.

> **VIKALP is designed for proactive disaster-risk planning — helping authorities move from identifying risk to evaluating what should happen next.**

---

## Overview

Disaster management decisions are often supported by fragmented datasets, maps, hazard information, demographic data, and administrative records.

VIKALP brings these information layers into a single decision-support workflow.

Instead of only answering:

> **"Where is the risk?"**

VIKALP is designed to help answer:

> **"What can be done about the risk, where could people move, and what evidence supports that decision?"**

The platform connects:

**Settlement Risk → Evidence → Protect / Adapt / Relocate → Destination Analysis → Carrying Capacity → Relocation Planning → Officer Review**

---

## Problem Statement

### Intelligent Identification of Hazard-Based Red Zones, Carrying Capacity Assessment, and Immediate Relocation Needs for Vulnerable Habitations

Hazards such as:

- Landslides
- Floods
- Coastal erosion
- Cloudbursts

can make existing habitation locations increasingly unsafe.

Traditional disaster-risk workflows may identify hazards or vulnerable areas, but proactive relocation requires additional decision support around:

- settlement vulnerability
- available evidence
- possible intervention pathways
- safer destinations
- destination capacity
- infrastructure and accessibility
- relocation planning
- administrative review

VIKALP is designed around this complete decision workflow.

---

## What VIKALP Does

### 1. Settlement Assessment

View a selected habitation together with its geographic and settlement context.

The platform can surface information such as:

- Population
- Households
- Elevation
- Terrain
- Slope
- Hazard evidence
- Historical evidence
- Infrastructure
- Roads
- Buildings
- Weather information

---

### 2. Evidence-Based Risk Analysis

VIKALP separates risk into multiple evidence dimensions rather than hiding everything behind a single unexplained score.

Current assessment dimensions include:

- Terrain / Physical Susceptibility
- Hazard Exposure
- Historical Disaster Evidence
- Population / Household Exposure
- Vulnerability

Each dimension is governed by the availability and quality of its underlying evidence.

Where approved inputs are incomplete, VIKALP does **not** fabricate or infer a final risk score.

---

### 3. Evidence & Provenance

VIKALP provides an evidence-oriented view of the information supporting an assessment.

Evidence can include:

- Terrain datasets
- Hazard datasets
- Disaster records
- Population information
- Infrastructure
- Roads
- Geographic features

The system distinguishes between:

- Source-backed information
- Derived information
- Available evidence
- Missing evidence
- Planned / future integrations

This allows officers to understand **why information is being shown and what its limitations are**.

---

### 4. Protect / Adapt / Relocate Decision Support

VIKALP does not automatically decide that a settlement should be relocated.

Instead, it provides a structured comparison of three pathways:

| Pathway | Purpose |
|---|---|
| **Protect** | Explore measures that may reduce exposure or protect the existing settlement |
| **Adapt** | Explore adaptation measures that allow continued habitation under identified risks |
| **Relocate** | Evaluate the possibility of moving the affected population to a safer destination |

The final decision remains with the responsible authority.

---

### 5. Destination Exploration

For relocation scenarios, VIKALP provides a framework for exploring potential destinations.

Destination analysis can consider information such as:

- Geographic suitability
- Available land
- Infrastructure
- Access
- Essential services
- Carrying capacity
- Destination evidence

The platform only presents destination information when supported by available data.

---

### 6. Relocation Planning

VIKALP extends beyond identifying a possible destination.

The relocation planning workflow can organize considerations such as:

- Land acquisition and tenure
- Compensation and benefits
- Asset transfer
- Infrastructure and access
- Community support
- Relocation readiness
- Officer review

This connects geographic risk analysis with the practical planning required for relocation.

---

### 7. GIS & Village-Level Visualization

VIKALP provides an interactive GIS environment for understanding settlement-level geography.

The current prototype integrates real geographic datasets including:

- Settlement boundaries
- Terrain
- DEM-derived slope
- Landslide evidence
- Building footprints
- Road networks
- Geographic features
- Weather information

The village-level visualization is designed to provide spatial context around the settlement rather than functioning as a standalone map viewer.

---

## Current Pilot

The current prototype demonstrates the complete workflow using detailed data for a selected region of **Uttarakhand, India**.

### Pilot Settlement

**Bhitai Malli**

| Attribute | Value |
|---|---|
| District | Pauri Garhwal |
| State | Uttarakhand |
| Population | 383 |
| Households | 86 |
| Elevation | 991 m |
| Coordinates | 30.167112, 78.781266 |
| Demo slope value | 18.91° |

The prototype demonstrates how VIKALP can be scaled conceptually to broader geographic coverage while using a focused pilot region for validation and demonstration.

---

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- MapLibre GL JS
- Lucide Icons

### Backend

- Python
- FastAPI
- Pydantic

### GIS & Data Processing

- GeoPandas
- Shapely
- Rasterio
- GDAL
- PyProj

### Current Data Storage

- SQLite
- File-based geospatial datasets

### Future / Scalable Infrastructure

- PostgreSQL
- PostGIS

### Reporting

- ReportLab

### Weather

- Open-Meteo

---

