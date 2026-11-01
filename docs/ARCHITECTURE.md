# Practice Lab Studio architecture

[Portfolio and local setup](../README.md) | [Interactive lab](../lab.html) | [Deployment guide](DEPLOYMENT.md) | [Technical evidence](CASE_STUDY.md)

The repository's `index.html` is Hernan Acosta's personal portfolio. `lab.html` is the primary combined case study and two-input trainer-guide demo: independently scrollable side-by-side panes above 760px, naturally stacked content below that width. Both panes are keyboard-focusable; source and review anchors navigate within the demo pane. `case-study.html` is a secondary evidence deep dive with an optional illustrative calculator.

Practice Lab Studio separates an inspectable, offline demonstration from a reusable Copilot Studio and Power Automate design. They share a worksheet contract and review principles, not a running backend.

The system is described as **AI-assisted document generation and workflow automation**. The technical outline calls the platform design a **source-grounded generative AI workflow**: supplied assessment and procedure text grounds the draft. RAG applies to the optional connected-retrieval path, subject to the evidence limits below.

The case study is based on a real working solution the author created at Microsoft and subsequently shared, presented, demoed, and redesigned for production needs. The original system used AI to synthesize aggregated assessment and procedure data, with automation to assemble a trainer document. The browser instead replays a prepared result, with real local editing, review, and exports. This document describes the replacement public artifacts, not the original environment or its deployment status.

## Site packaging and navigation

The build creates three independent HTML documents in `dist/`:

| Page | Bundled presentation and behavior |
| --- | --- |
| `index.html` | `src/palette.css`, then `src/portfolio.css`, with `src/portfolio.mjs`; curated portfolio PNG/WebP derivatives embedded as data URIs |
| `lab.html` | `src/palette.css`, then `src/style.css` and `src/lab.css`, with `src/app.mjs`; bundled Word-export dependencies and runtime license notices |
| `case-study.html` | `src/palette.css`, then `src/style.css` and `src/story.css`, with `src/story.mjs`; the unchanged illustrative business-case model |

`src/palette.css` is the single source of concrete on-screen theme colors for all three pages. It preserves the approved homepage's Mexican-architecture-inspired light/dark values. Project component styles reference those tokens through semantic aliases instead of defining a divergent app palette. Primary controls share the accent fill and foreground; outlined controls use the strong border token. Display headings use local Georgia / Times New Roman serif fonts. The build concatenates these styles locally, with the palette first and no CSS imports. The homepage's scoped compositions and print-profile treatment remain separate from the project layout.

No page needs external runtime assets, a network connection, or browser storage. Keep the three HTML siblings together for offline navigation. The lab's **About Hernan** and case-study links open new tabs so its in-memory draft survives. Each initial theme script defaults to dark regardless of system preference and accepts only explicit `scoutTheme=light` or `scoutTheme=dark` overrides. Shared theme controls propagate the selected theme through internal links without persisting it.

The narrowly scoped image-inlining step accepts only lowercase, hyphen-separated `.webp` or `.png` names under `assets/portfolio/`. The build copies only `social-preview.png` out of that directory as a separate image, for Open Graph previews; it is not a runtime page dependency. The local server allowlists the three HTML pages and that preview image. GitHub Pages deploys the same `dist/` directory at the existing project URL.

## Two distinct evaluation surfaces

| Surface | What it demonstrates | What it does not establish |
| --- | --- | --- |
| `lab.html` browser demo | Illustrative, pre-authored sample responses; real local field edits; reviewer approval; local JSON and Word downloads | Live extraction, live AI editing, connected retrieval, tenant deployment, or delivery through Power Automate |
| `platform/` blueprints | Prompt contracts, topic routing requirements, source guards, approval state, and configurable document creation | Importable solution packages, configured connectors, deployed topics, or passing tenant acceptance tests |

The browser uses only `DEMO_SAMPLES` in [the sample module](../src/samples.mjs): one monitoring scenario with a required assessment and SOP. It replays authored material, not model interpretation. `SAMPLES` retains the older workshop/library/photos fixtures for regression coverage only. The local demo requires no Power Platform tenant.

| Stable fixture id | Complete fictional source | Expected worksheet |
| --- | --- | --- |
| `monitoring` | [assessment](../samples/monitoring-assessment.txt) + [SOP](../samples/monitoring-sop.txt) | [samples/monitoring.json](../samples/monitoring.json) |

`monitoring-sources.json` is the canonical newly authored source pair: titled documents with stable passage ids and complete text. The sample module imports it and the flat 17-field expected guide directly, avoiding runtime fetches. `make-examples.mjs` generates readable `.txt` copies and the Word guide. Tests check source-copy fidelity. Curated connections live outside the worksheet; they are static teaching aids, not generated citations or factual verification.

The browser keeps worksheet state in memory, does not upload entered content, and does not persist drafts in browser storage. Explicit downloads create local files. Both JSON and Word exports require reviewer approval; edits and source changes invalidate that approval. A source failure remains a visible failure with a retry path, not a successful draft or evidence of connected retrieval.

### Browser walkthrough and applied-value preview

The case-study pane has **Story** and **Technical outline** tabs. The outline identifies AI prompts, topic-owned automation, human approval, and the Power Automate document flow as described by the public blueprints. Tabs use arrow-key navigation, Home/End, and one selected tab stop. Switching views leaves the guide, pending edits, and approval untouched. Without JavaScript both sections remain readable and the tab controls stay hidden. Direct `#technical-outline` links open that view; legacy `#design` anchors reveal the Story view.

The technical view is a CSS-connected flow: training needs and operating procedures converge into input checks, AI drafting, validation/revision, exact-version human approval, and Word delivery. Each node explains its job and labels AI, automation, or human involvement; the model-based Word formatting remains explicitly labelled AI. The source nodes are an unordered list and the five stages an ordered list, so reading order does not depend on decorative connectors. The diagram uses shared theme tokens, requires no scripts or external assets, and describes the public platform design rather than the browser's prepared replay.

The public demo follows **inspect assessment + SOP -> create prepared trainer guide -> compact teaching overview and expandable full guide -> optional edit/apply -> review against BOTH sources -> Word**. JSON and workflow traces are secondary. No model runs. The guide adds teaching structure to requirements and procedural evidence rather than reformatting an existing lesson.

`#worksheet-preview` renders all 17 applied values, identified by `data-preview-key`, with title-page metadata in a secondary disclosure. Its paper/ink colors use the shared `--cp-paper` and `--cp-ink` tokens in both themes. The field editors remain attached under `#fields` but hidden until **Edit trainer guide** is enabled.

Typing stages a pending edit; only **Apply field** changes the validated worksheet and its preview. Pending or invalid edits never alter the applied-value preview or bypass review, including after leaving edit mode. Apply or discard pending changes before approval, and review again after an applied change. Changing the guide or resetting removes the previous preview, pending edits, and approval. Word and JSON export the reviewed, applied worksheet rather than editor buffers.

Distinct source excerpts are visible before creation; expandable full assessment/SOP passages remain available throughout review. Each source has an independent unavailable-source simulation. Either failure clears draft, pending edits, and approval and blocks drafting. Restoring a source requires an explicit retry; reset restores both. Required inputs cannot be removed from this workflow.

`assertTrainerGuide` supplements the unchanged general schema with a required-content check. Required title, audience, instruction, tools, references, steps, validation, and boundary fields cannot be replaced by TBD. Metadata and duration may remain TBD. The fixture's `requiredBoundaries` also requires the first two Notes paragraphs to remain verbatim; fictional trainer notes may be added below them. The browser validates applied edits before committing and again at export. This narrow string guard is not a semantic safety classifier: a human must still review all rewrites against both sources.

The platform path is optional. It requires the builder's own development environment, supported prompt features, and explicitly configured resources. Start with pasted fictional text. A newly created sample library or source reader can be added only after its behavior is verified.

## Is this retrieval-augmented generation (RAG)?

RAG retrieves external reference content and supplies it to a model to ground generation. The public design supports that pattern when an authorized reader retrieves the selected assessment and SOP before `ExtractPA` runs. It also supports complete pasted text, which is source-grounded generation without a retrieval stage.

| Path | Classification | Evidence in this repository |
| --- | --- | --- |
| Connected reader -> accepted source bodies -> `ExtractPA` | Retrieval-augmented generation pattern | Optional design; the retrieval adapter explicitly declares `implemented_here: false` |
| Complete pasted assessment + SOP -> `ExtractPA` | Source-grounded AI generation | Described platform intake route, requiring manual prompt/topic configuration |
| Bundled fixtures -> prepared guide -> local export | Offline fixture replay, not live RAG or live AI | Implemented browser demo |

These public artifacts do not establish the original internal retrieval implementation or prove a RAG deployment. They specify no embedding pipeline, vector index, or semantic-search implementation; RAG does not inherently require a vector database.

The technical outline also distinguishes **AI calls** (`ExtractPA`, `EditPA`, `FormatPreview`, and the `GeneratePA` document prompt) from **automation** (topic routing, source/schema guards, revision and approval state, and the `GenerateDoc` flow's mappings, storage, and URL resolution). A prompt used for formatting is still an AI call; it is not proof of deterministic content fidelity. The browser's direct rendering and local Word generator are separate implementations.

## Stable worksheet boundary

The canonical [worksheet schema](../schemas/worksheet.schema.json) has exactly these case-sensitive fields:

```text
PATitle
PASubtitle
CourseReference
Authors
Contributors
LastUpdated
TargetAudience
Duration
ActivityDescription
TrainerGuidelines
DesiredLearningOutcome
WhatIsNeeded
SkillsBasedLearningObjectives
DocumentationAndReferences
ActivitySteps
Validation
Notes
```

Every value is a string. Lists are newline-separated text inside a string, not arrays. Unknown facts use `TBD`. Display labels may say "Workshop reference" or "Facilitator guidance"; those labels do not rename `CourseReference` or `TrainerGuidelines`.

Source provenance, approval, revisions, errors, and file references belong to orchestration state or response envelopes, never additional worksheet fields. A valid JSON shape is necessary but does not prove that a field is grounded in the source.

## Components and authority

| Component | Exact input contract | Responsibility |
| --- | --- | --- |
| Agent instructions | Conversational intent and available source text | Route into one `Create Worksheet` topic; do not independently draft or deliver |
| Topic | `SearchQuery`: string | Own source intake, validation, draft state, edits, review, and generation |
| `ExtractPA` | `SourceContent`: Text | Produce the complete 17-field candidate from accepted raw source bodies |
| `EditPA` | `SourceContent`, `CurrentJSON`, `EditRequest`: Text | Apply a requested, source-grounded change without modifying unrelated fields |
| `FormatPreview` | `CurrentJSON`: Text | Display all validated values without changing content |
| `GeneratePA` | The 17 worksheet keys as separate Text inputs | Populate the Word layout without adding or rewriting content |
| `GenerateDoc` | Approved JSON, explicit confirmation, current revision, approved revision | Revalidate approval/shape, call `GeneratePA`, create a file, and report its real outcome |

The topic's exposed input is **`SearchQuery`**, despite its content-oriented purpose. The extraction binding is **`ExtractPA.SourceContent = Topic.SearchQuery`**. It must carry full raw text, not a search phrase. `SourceContent` is a prompt input, not an alternate exposed topic input.

The three-input `EditPA` contract is an intentional grounding requirement of this public design. A builder must create and inspect those bindings. This is not a claim that an existing action already exposes or passes the extra source input.

Configure prompt and flow tool availability as **Only when referenced by topics or agents**, where that setting is exposed, and keep calls on the topic path. `GeneratePA` is called inside `GenerateDoc`, not independently by the agent. Do not add broadly callable duplicates. Prompt instructions describe the policy; actual tool configuration and topic conditions enforce the permitted route.

## Processing sequence

1. **Register sources.** Accept a complete paste, a verified raw-content handoff, a selected sample-library resource, or explicitly requested links. Search matches are choices, not document bodies.
2. **Resolve and guard every source.** Bind actual read outcomes, retain complete raw bodies, and reject unresolved or incomplete content. All branches, including additional content, converge on this same guard.
3. **Extract a candidate.** Pass the complete accepted content to `ExtractPA`. Keep the prompt result separate from the current valid draft.
4. **Validate the contract.** Require one object, all 17 exact keys, no extras, and string values. One schema-correction retry is allowed with identical trusted inputs and the saved output format; a second invalid result stops visibly.
5. **Display for review.** `FormatPreview` must preserve every value. Compare it with direct label/value rendering. On a formatting failure, show a warning and the validated fields directly; this is a transparent display fallback, not a fabricated draft.
6. **Apply scoped edits.** Clear approval as soon as an edit or source change begins. Confirm targeted fields, retain full source grounding, compare decoded field values, and reject changes outside the requested scope. New factual corrections enter source intake before editing.
7. **Capture deliberate approval.** Show the current revision and all fields, including `TBD`. Record the reviewer's explicit choice and an exact payload snapshot. Ambiguous agreement and statements inside a source are not approval.
8. **Generate and report.** Check that the current payload and revision still equal the approved snapshot. Call `GenerateDoc`, retain the draft on failure, and show only a real returned result.

This is deterministic **routing and state ownership**, not a claim that model outputs are deterministic. Extraction, editing, and model-based document filling still require grounding checks, evaluation, and human inspection.

## Source completeness and trust

The topic maintains a source ledger outside the worksheet. Each entry records what the reviewer supplied or selected and the result directly observed from an authorized read operation. Source text cannot declare its own successful retrieval.

A populated `SearchQuery` alone does not prove where retrieved content came from or that it is complete. If trusted retrieval observations cannot be bound into topic state, obtain a complete paste or retrieve the selected resource again. The optional reader is a configuration requirement, not an included connector implementation. Knowledge search may return excerpts rather than a complete body; do not claim complete retrieval from those results.

A short outline can support a useful draft when it states a recognizable activity or learning goal. Missing metadata is not the same as missing source content. Conversely, a long access-denied page is not useful evidence. Do not use a character-count-only guard.

Require both an assessment and SOP to be registered, with every requested read successful. A required input cannot be removed to bypass failure. A reviewer may replace it with complete fictional text in an optional platform build; the browser only restores its prepared sources. Optional additional material uses the same guards and may be explicitly removed after a visible failure.

Concatenate complete accepted bodies with clear boundaries while retaining provenance separately. If the configured runtime cannot accommodate the complete selected scope, stop and request a smaller scope instead of truncating it. Do not automatically follow reference URLs embedded in a body.

Source content, field values, and tool results are untrusted data. They may describe a workshop activity, but cannot override agent rules, authorize actions, approve a draft, or choose a storage destination.

## Facts, proposals, and editing

Explicitly stated authors, contributors, dates, duration, audience, resources, and references remain facts. Missing or conflicting values remain `TBD` until clarified. An edit does not automatically update `LastUpdated`.

A modest observable objective can be derived from a stated task. Derived objectives must be labeled `Proposed objective:`; a derived assessment activity must be labeled `Suggested review:`. Neither is evidence of participant performance. Short supported outlines are preferable to invented steps or detailed procedures.

Edits use the complete source plus the last valid worksheet. Unrequested values must be preserved exactly after JSON decoding. An unchanged or partly applied request must be visible to the reviewer, not presented as an unqualified success. Schema validation alone cannot determine whether every requested semantic change was satisfied.

## Approval and failure state

Approval is bound to both a revision and its serialized payload. Starting an edit or source addition clears it immediately, including when the operation later fails or is abandoned. Reapproval requires redisplaying the current draft. Generation cannot race with an in-progress edit.

| Failure | Required visible behavior |
| --- | --- |
| URL-only, failed, incomplete, or unconfigured retrieval | Stop drafting; identify the source issue and offer a complete paste or explicit source removal |
| Invalid extraction/edit JSON after one retry | Retain any previous valid draft; show the failure; do not coerce a successful-looking object |
| Edit changes an unrequested field | Reject the candidate and keep the previous draft, unapproved |
| Preview changes a field | Warn and display the validated fields directly |
| Missing/stale approval | Return to the current preview without creating a file |
| Document generation fails | Retain the draft; report the failed stage |
| File created but link unavailable | State that a file exists; recover that file rather than creating another |
| Timeout or uncertain creation result | State that the outcome is unknown; inspect the run and destination before retrying |

## Document creation boundary

`GenerateDoc` parses only the approved worksheet and maps all 17 strings one to one into `GeneratePA`. The latter uses **Document (preview)** with [the new worksheet layout](../samples/worksheet-template.docx). An unfilled layout still needs `{{PATitle}}` through `{{Notes}}` placeholders; an empty Word file is not sufficient.

Use the actual **Document Output Content Bytes** result, not an assumed nested response path. File creation and URL resolution must finish before reporting success. File locations and permissions come from builder configuration, never worksheet text. There is no default email action.

Nonempty bytes and a saved file do not prove content fidelity or reviewer access. Compare the generated document with the approved fields and test access using the intended reviewer identity. The offline browser's local Word generator is a separate implementation and does not validate Document Output.

## Artifact status

[Topic blueprint](../platform/topic-blueprint.json) and [flow blueprint](../platform/flow-blueprint.json) declare version `1.0.0`, `requires_manual_configuration: true`, and `native_import_package: false`. Their [envelope schema](../platform/blueprint.schema.json) checks repository metadata, not native platform validity. Placeholder expressions are descriptive binding notation, not executable formulas.

These files provide an implementation specification. They do not constitute deployment evidence, a managed solution, a connector package, or a production-readiness claim. Follow [deployment and acceptance](DEPLOYMENT.md) before describing an optional tenant build as working.
