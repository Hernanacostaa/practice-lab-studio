# Practice Lab Studio: a review-first worksheet workflow

[Try the local demo](../README.md) | [Architecture](ARCHITECTURE.md) | [Optional platform build](DEPLOYMENT.md)

**Practice Lab Studio is a fictional portfolio project about converting workshop notes into a structured, human-reviewed activity worksheet.** It pairs an offline browser demonstration with original Copilot Studio and Power Automate configuration blueprints. It is not presented as a customer deployment or evidence of production use.

## The problem

A community-workshop facilitator may start with an informal outline: what participants will make, materials available, and a few discussion prompts. A reusable worksheet needs more structure, but the missing structure should not become invented facts. A polished output can hide an unsupported duration, a guessed author, or an assessment method nobody approved.

The design question is therefore not simply "Can a model write a worksheet?" It is: **How can a facilitator see what is supported, correct the draft without losing context, and export only the revision they reviewed?**

The scenarios are deliberately ordinary and fictional. The `workshop`, `library`, and `photos` fixture identifiers in [src/samples.mjs](../src/samples.mjs) provide a bounded evaluation surface without needing a connected content library.

The paired artifacts are [workshop source](../samples/workshop.txt) and [worksheet](../samples/workshop.json), [library source](../samples/library.txt) and [worksheet](../samples/library.json), and [photos source](../samples/photos.txt) and [worksheet](../samples/photos.json). Each text file is a complete original fictional guide. Each JSON file is the expected flat 17-field worksheet, not a sample wrapper or evidence of an AI run.

## Illustrative personas

| Persona | Need | Design response |
| --- | --- | --- |
| Workshop facilitator | Turn a rough outline into something editable without silently supplying missing facts | Visible 17-field draft, `TBD` values, short supported activity steps, and local field editing |
| Peer reviewer | See whether the draft reflects the supplied material and which revision is being exported | Source-aware review, explicit confirmation, and approval invalidation when a change starts |
| Platform builder | Recreate the workflow in their own development environment and understand its failure paths | Explicit prompt contracts, a single topic specification, configurable flow bindings, and acceptance criteria |

These personas frame design choices. They are not claims about interviews, participant counts, or observed adoption.

## The solution

The local demo makes the workflow inspectable without a tenant. It replays clearly labeled, pre-authored sample responses rather than pretending to call an AI service. Users can make real local field edits and download JSON or Word after review. That separation allows a reviewer to evaluate interaction design and artifact structure without mistaking fixture playback for model performance.

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

## What counts as evidence

| Claim area | Evidence available to inspect | Boundary |
| --- | --- | --- |
| Interaction design | Local source-to-review walkthrough, visible field edits, approval behavior, and local downloads | Fixture-driven demonstration, not live AI |
| Data contract | Shared schema and explicit prompt/flow field mappings | Static agreement does not prove a model will always follow it |
| Orchestration design | Topic states, guards, scoped edit rules, and failure outcomes | Descriptive blueprints, not a deployed or importable solution |
| Reproducibility | Original prompt text, template requirements, public documentation links, and manual build guide | The builder must configure resources and verify actual bindings |
| Connected platform behavior | Acceptance checklist for source handoff, prompts, review, document fidelity, and permissions | No tenant execution results are claimed by this case study |

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

The intended benefit is less repetitive formatting and a clearer review boundary. This project does not claim measured time savings, return on investment, adoption, learning gains, factual-accuracy rates, or production readiness.

A useful next evaluation would measure reviewer corrections by field, unchanged-field preservation during edits, time to an approved worksheet, model and connector latency, and document fidelity using a versioned fictional test set. Results would need a defined baseline, sample size, and failure accounting before supporting an impact claim.

The roadmap is to validate the optional tenant build, evaluate models against the same grounded cases, confirm a full-content retrieval method before enabling connected source routes, and assess whether deterministic formatting should replace model-based formatting. Any future importable solution package would need to be created from an actual configured development solution and validated separately; the current descriptive JSON must not be relabeled as one.

For a hiring reviewer, the project is evidence of requirements decomposition, explicit AI boundaries, data-contract design, human-review controls, and honest treatment of failure and uncertainty. It is not evidence of an unmeasured business outcome.
