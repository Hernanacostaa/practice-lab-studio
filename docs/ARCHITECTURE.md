# Practice Lab Studio architecture

[Project overview and local demo](../README.md) | [Deployment guide](DEPLOYMENT.md) | [Case study](CASE_STUDY.md)

Practice Lab Studio separates an inspectable, offline portfolio demonstration from a reusable Copilot Studio and Power Automate design. They share a worksheet contract and review principles, not a running backend.

The case study is based on a real working solution the author created at Microsoft and subsequently shared, presented, demoed, and redesigned for production needs. This document describes the replacement public artifacts, not the original environment or its deployment status.

## Two distinct evaluation surfaces

| Surface | What it demonstrates | What it does not establish |
| --- | --- | --- |
| Root browser demo | Illustrative, pre-authored sample responses; real local field edits; reviewer approval; local JSON and Word downloads | Live extraction, live AI editing, connected retrieval, tenant deployment, or delivery through Power Automate |
| `platform/` blueprints | Prompt contracts, topic routing requirements, source guards, approval state, and configurable document creation | Importable solution packages, configured connectors, deployed topics, or passing tenant acceptance tests |

The fictional scenarios are identified by `workshop`, `library`, and `photos` in [the sample module](../src/samples.mjs). Selecting a scenario replays authored material. It does not ask a model to interpret arbitrary new content. The local demo requires no Power Platform tenant; see the root README for its actual run instructions.

| Stable fixture id | Complete fictional source | Expected worksheet |
| --- | --- | --- |
| `workshop` | [samples/workshop.txt](../samples/workshop.txt) | [samples/workshop.json](../samples/workshop.json) |
| `library` | [samples/library.txt](../samples/library.txt) | [samples/library.json](../samples/library.json) |
| `photos` | [samples/photos.txt](../samples/photos.txt) | [samples/photos.json](../samples/photos.json) |

Each `.txt` is the full authored guide. Each `.json` is the flat 17-field worksheet itself, not a sample wrapper or a recorded model response. `SAMPLES` in `src/samples.mjs` imports the expected JSON directly and includes matching copies of the complete source text. Those copies must remain identical to the `.txt` files; bundling them avoids runtime source-file fetches.

The browser keeps worksheet state in memory, does not upload entered content, and does not persist drafts in browser storage. Explicit downloads create local files. Both JSON and Word exports require reviewer approval; edits and source changes invalidate that approval. A source failure remains a visible failure with a retry path, not a successful draft or evidence of connected retrieval.

The platform path is optional. It requires the builder's own development environment, supported prompt features, and explicitly configured resources. Start with pasted fictional text. A newly created sample library or source reader can be added only after its behavior is verified.

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

For multiple sources, require every requested read to succeed. A reviewer may explicitly remove a failed source after seeing the error; the application must not silently drop it. Additional material uses the same registration, retrieval, content, and schema checks as the first source.

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
