# NOTICE

## Tokenomics Foundation content (CC BY 4.0)

This package contains and redistributes text from the **Tokenomics
Foundation** website, <https://www.tokeneconomics.com> (`data/tokenomics/`:
twelve documents — the AI Tokenomics definition, the Five-Layer Tokenomics
Stack explainer and paper, the Big-T Notation explainer and paper, the
Prompt Cache Explainer, the Personas and Operating Model map, Classifying
and Measuring Realized Value from AI, the FOCUS 1.5 AI-cost status page,
two Tokenomics Brief episode pages, and the "What Tokenomics Is, and What It
Isn't" member synthesis).

That content is licensed under the **Creative Commons Attribution 4.0
International license (CC BY 4.0)**:
<https://creativecommons.org/licenses/by/4.0/>. © 2026 Tokenomics Foundation
Project, a Series of LF Projects, LLC. Every record carries the source URL,
the section it came from, and the document's publication status (most are
Working Drafts or Release Candidates, not ratified standards).

The "State of Tokenomics" report is **not** included (it is published as
all rights reserved).

### Modifications

In accordance with CC BY 4.0 §3(a)(1)(B), note that this package **adapts**
the original material: pages are converted from HTML to markdown and split
into sections; tables, formulas (linearized from their stacked-fraction
rendering), and cards are parsed into structured JSON (layers, Big-T
classes, levers, metrics, personas, value categories, glossary terms, FOCUS
tracker items, provider cache snapshot). `data/tokenomics/derived/` holds
this project's own derived works: cross-links to the FinOps Framework and
FOCUS servers (each backed by a verbatim quote from the source page) and a
curated crosswalk marked `official: false`. **The Tokenomics Foundation does
not endorse this package or its use of the material.**

## This package's code

The code in this package (the MCP server implementation) is licensed under
the MIT license — see `LICENSE`. This package is an independent, unofficial
integration and is not affiliated with or endorsed by the Tokenomics
Foundation, the Linux Foundation, the FinOps Foundation, or the FOCUS
project. FOCUS™ is a trademark of the FinOps Foundation.

## Source

Built from the `tokenomics` server in
<https://github.com/aaronmsoto/finops-framework-mcp> — see that repository
for source, tests, and full provenance details.
