# Practice Lab Studio: from source documents to training exercises

[Try the local demo](../README.md) | [Architecture](ARCHITECTURE.md) | [Optional platform build](DEPLOYMENT.md)

For the recruiter-facing narrative, role, prioritization, proposed success measures, and interactive economics, read [Why I built this on the demo site](https://hernanacostaa.github.io/practice-lab-studio/case-study.html). Its numeric pilot thresholds and calculator defaults are newly invented planning assumptions, not historical results, private business figures, or forecasts.

**This case study is based on a real solution I created at Microsoft.** I identified a manual training-authoring problem, built a working version, shared it, presented and demoed the solution, and redesigned the workflow for production needs.

Practice Lab Studio is the public adaptation of that work. Its examples, infrastructure placeholders, browser implementation, and published configuration blueprints are replacements, not original organizational assets. The project history is real; the public scenarios are fictional. This is my personal case study, not an official Microsoft product or endorsement.

## The problem

The source documents already existed, but a training author still had to turn them into an exercise someone could teach or complete. That meant identifying the relevant tasks, defining learning objectives, listing prerequisites and materials, writing step-by-step learner instructions, adding completion checks, and formatting a consistent worksheet.

I identified that repeated translation and assembly work as the problem to solve. My solution was to assist the author with a structured draft while keeping source accuracy, missing information, review, and editable delivery visible.

The design question was: **How can I turn reference material into a usable training exercise without replacing the author's judgment or creating more reviewer rework?**

## What I did

1. **Identified the authoring gap.** Focused on the repeated work between having a reference document and having a training exercise.
2. **Defined the output.** Made the worksheet's 17 fields a shared contract for drafting, revision, preview, and document generation.
3. **Built a working version.** Iterated on AI-assisted drafting, field mapping, and document output so supplied source content could become an editable training worksheet.
4. **Shared, presented, and demoed it.** Put the working solution and its approach in front of others after creating the first working version.
5. **Redesigned for production needs.** Focused on clearer responsibilities, consistent structure, source checks, review, failure handling, and document delivery.
6. **Created the public adaptation.** Replaced internal content and infrastructure with original examples and a disconnected browser walkthrough.

## Public examples

The scenarios are deliberately ordinary and fictional. The `workshop`, `library`, and `photos` fixture identifiers in [src/samples.mjs](../src/samples.mjs) provide a bounded evaluation surface without needing a connected content library.

The paired artifacts are [workshop source](../samples/workshop.txt) and [worksheet](../samples/workshop.json), [library source](../samples/library.txt) and [worksheet](../samples/library.json), and [photos source](../samples/photos.txt) and [worksheet](../samples/photos.json). Each text file is a complete original fictional guide. Each JSON file is the expected flat 17-field worksheet, not a sample wrapper or evidence of an AI run.

## People the workflow serves

| Role | Need | Design response |
| --- | --- | --- |
| Training author | Turn source material into an editable exercise rather than manually assembling every section | Visible 17-field draft, `TBD` values, supported activity steps, and field editing |
| Peer reviewer | See whether the draft reflects the supplied material and which revision is being exported | Source-aware review, explicit confirmation, and approval invalidation when a change starts |
| Training lead | Maintain consistent exercise quality and understand the cost and reliability of producing accepted worksheets | Shared structure, clear review responsibilities, and a proposed measurement framework |

These role descriptions are generalized for the public case study. The underlying authoring problem and working solution came from my work at Microsoft; internal team identities, documents, and operational details are not published.

## How the public adaptation works

The local demo makes the workflow inspectable without access to the original environment. It replays clearly labeled, pre-authored sample responses rather than calling an AI service. Users can make real local field edits and download JSON or Word after review. This browser implementation is a separate, offline adaptation of work built with Copilot Studio and Power Automate.

The browser does not upload entered content or persist drafts in browser storage. Changes to fields or sources invalidate export approval, and a visible source failure offers retry rather than a substitute draft. Downloads are deliberately local files, not cloud delivery. Keeping drafts in memory also means an unfinished session is not restored after a reload.

The optional platform design assigns control to one topic. Source intake precedes extraction; extraction precedes schema validation; review precedes generation. Four logical prompts have separate responsibilities: `ExtractPA` extracts, `EditPA` changes selected fields using full source grounding, `FormatPreview` formats the draft for display, and `GeneratePA` fills a Word layout without authoring new content.

The [worksheet contract](../schemas/worksheet.schema.json) has exactly 17 string fields. The same contract connects preview, edits, document inputs, and exports. Approval and source metadata stay outside the worksheet rather than gradually expanding its shape.

## Key design decisions

| Decision | Benefit sought | Tradeoff or remaining limitation |
| --- | --- | --- |
| Offline illustrative responses | A low-friction, inspectable portfolio experience with no cloud account required | Does not measure model quality, retrieval quality, or platform latency |
| One deterministic topic | A visible owner for validation, review, and generation order | More explicit state and conditions to configure; routing alone does not make model content deterministic |
| Preserve complete raw source bodies | Editing retains the context needed to evaluate factual changes | Larger inputs consume more capacity; oversize content must stop or be explicitly rescoped, not silently shortened |
| `TBD` for missing facts | Makes uncertainty visible rather than hiding it behind plausible text | Some drafts remain incomplete and require reviewer input |
| Label derived objectives | Allows useful instructional proposals without presenting them as extracted facts | Human review must judge whether the derivation is appropriate |
| Exact field-scoped edits | Prevents an unrelated author, duration, or reference from drifting during a rewrite | Ambiguous and partly applied requests require clarification |
| Approval bound to payload and revision | Prevents exporting an older approval after a new change | Adds a deliberate review step after edits, even unsuccessful ones |
| Separate formatting from authoring | Makes it easier to identify where content changed unexpectedly | A model-based formatter can still drift; direct preview comparison and Word inspection remain necessary |
| Manually configured platform blueprints | Exposes the intended bindings and responsibilities without implying a packaged deployment | Requires a builder to create real resources and collect tenant evidence |

The three-input edit contract is particularly important: `SourceContent`, `CurrentJSON`, and `EditRequest` all travel to `EditPA`. This is an explicit improvement in the public design, not an assertion that an existing deployed action already implements it.

## Failure handling is part of the product

A retrieved title or citation is not the full source. URL-only, denied, partial, or failed retrieval must stop drafting with a clear message. A short but meaningful pasted outline can be accepted; a long error page cannot. Additional sources use the same guard as initial sources, so adding a link after a draft exists cannot bypass validation.

Malformed output never becomes the current worksheet simply because it looks plausible. A single schema-correction retry is bounded; a second invalid result leaves the previous draft intact. A field-scoped edit that changes an unrelated value is rejected.

Starting a change clears approval before the operation runs. A failed edit therefore cannot leave the impression that the previous approval still covers an active revision request. A formatter failure produces a visible warning and direct display of the validated fields, not a replacement draft.

Document failure likewise does not erase the draft. A created file with no resolved link is a partial outcome. A timeout is an unknown outcome that requires checking the run and destination before retrying. Returning a link is not evidence of email delivery or participant learning.

## What the public artifacts let you inspect

Use these artifacts to inspect the design decisions and behavior of the public adaptation.

| Claim area | Evidence available to inspect | Boundary |
| --- | --- | --- |
| Interaction design | Local source-to-review walkthrough, visible field edits, approval behavior, and local downloads | Fixture-driven demonstration, not live AI |
| Data contract | Shared schema and explicit prompt/flow field mappings | Static agreement does not prove a model will always follow it |
| Orchestration design | Topic states, guards, scoped edit rules, and failure outcomes | Descriptive blueprints, not a deployed or importable solution |
| Reproducibility | Original prompt text, template requirements, public documentation links, and manual build guide | The builder must configure resources and verify actual bindings |
| Connected platform behavior | Acceptance checklist for source handoff, prompts, review, document fidelity, and permissions | Internal execution records are not published; a new builder must verify their own environment |

Repository tests, where provided, should be read for the behavior they actually exercise. A passing local download test is not a passing Power Automate document-generation test. A valid 17-key JSON object is not a factual-accuracy score.

## Acceptance criteria

The full [acceptance matrix](DEPLOYMENT.md#6-run-acceptance-before-claiming-a-connected-build-works) is a release gate, not a results report. Its central requirements are:

1. Every accepted source reaches drafting as complete raw content; failed requested sources stop the operation visibly.
2. Every current draft and generated input obeys the same 17-string-field contract.
3. Missing facts remain `TBD`; proposed objectives and review methods remain identifiable as proposals.
4. A scoped edit preserves every unrequested decoded value and retains full source grounding.
5. Generation uses only the exact current revision explicitly approved after its latest change.
6. Generated Word content matches the approved values, and failure or partial delivery is reported without losing the draft.

These criteria deliberately test the requirement itself: field preservation, complete handoff, current approval, actual file content, and real access. File existence or a successful-looking chat message alone is insufficient.

## Impact and roadmap

The product goal is less repetitive drafting and formatting, a consistent training worksheet, and a clearer review process. This portfolio describes the actual build and design work without publishing internal adoption, financial results, or operational data. The proposed targets and calculator assumptions on the site are planning aids, not reported outcomes.

A useful next evaluation would measure reviewer corrections by field, unchanged-field preservation during edits, time to an approved worksheet, model and connector latency, and document fidelity using a versioned fictional test set. Results would need a defined baseline, sample size, and failure accounting before supporting an impact claim.

For someone rebuilding the public design, the next steps are to validate their optional tenant build, evaluate models against the same grounded cases, confirm a full-content retrieval method before enabling connected source routes, and assess whether deterministic formatting should replace model-based formatting. Any future importable solution package would need to be created from an actual configured development solution and validated separately; the current descriptive JSON must not be relabeled as one.

For a hiring reviewer, the story demonstrates identifying a real problem, building a working solution, communicating it through sharing and demonstrations, and redesigning for reliable use. The public artifacts make the requirements, AI boundaries, data contract, review controls, and document experience inspectable.
