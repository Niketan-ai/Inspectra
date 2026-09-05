# 🔍 INSPECTRA

### AI-Assisted Product Inspection & Legal Metrology Quality Assistant

INSPECTRA is an AI-powered product inspection platform designed to help users inspect packaged products by analyzing product label images, extracting visible text, identifying important declarations, and checking the available information against applicable compliance requirements.

The system focuses on **evidence-based inspection** rather than guessing product information.

## 🚀 Problem Statement

Checking packaged products manually for mandatory declarations and label information can be:

- Time-consuming
- Error-prone
- Difficult for non-technical users
- Inconsistent across different inspections
- Challenging when product labels contain small or dense text

Users often need to inspect information such as:

- Product name
- Brand
- Net quantity
- MRP
- Manufacturer / Packer / Importer
- Manufacturing / Packing information
- Consumer care information
- Country of origin
- Relevant license / registration information
- Other visible mandatory declarations

INSPECTRA aims to simplify this process through AI-assisted image analysis and structured inspection.

# 💡 Our Solution

INSPECTRA converts a product inspection into a simple workflow:

**Capture → Read → Extract → Verify → Highlight → Report**

The user uploads photographs of the product and INSPECTRA analyzes the visible information.

### Primary Images

- 📸 Front Image — **Required**
- 📸 Back Image — **Required**

### Additional Images

- ⬆️ Upper Image — Optional
- ⬇️ Lower Image — Optional

The front and back images are treated as the primary evidence. Upper and lower images are used only when additional information is required.

# 🧠 Key Innovation

Unlike a system that blindly classifies every image, INSPECTRA follows an **evidence-first approach**.

### Evidence-First Inspection

The AI should only report information that can be supported by the uploaded product images.

It does **not**:

- Invent missing information
- Guess product category
- Assume declarations that are not visible
- Generate unsupported compliance claims

If information cannot be confidently extracted from the available images, the system marks it as:

> **Not Clearly Visible / Requires Review**

This reduces hallucination and makes the inspection more explainable.

# ⚙️ How INSPECTRA Works

`
                 PRODUCT
                    │
                    ▼
          ┌───────────────────┐
          │   Capture Images  │
          └─────────┬─────────┘
                    │
          ┌─────────▼─────────┐
          │ Front + Back      │
          │ Required Images   │
          └─────────┬─────────┘
                    │
             Optional Images
             ┌──────┴──────┐
             ▼             ▼
           Upper         Lower
                    │
                    ▼
          ┌───────────────────┐
          │ Image Quality     │
          │ Check & Processing│
          └─────────┬─────────┘
                    │
                    ▼
          ┌───────────────────┐
          │ OCR / Text        │
          │ Extraction        │
          └─────────┬─────────┘
                    │
                    ▼
          ┌───────────────────┐
          │ AI Vision         │
          │ Analysis          │
          └─────────┬─────────┘
                    │
                    ▼
          ┌───────────────────┐
          │ Structured Product│
          │ Information       │
          └─────────┬─────────┘
                    │
                    ▼
          ┌───────────────────┐
          │ Compliance /      │
          │ Consistency Check │
          └─────────┬─────────┘
                    │
          ┌─────────▼─────────┐
          │ Evidence & Issues │
          │ Detection         │
          └─────────┬─────────┘
                    │
                    ▼
          ┌───────────────────┐
          │ Inspection Report │
          └───────────────────┘
