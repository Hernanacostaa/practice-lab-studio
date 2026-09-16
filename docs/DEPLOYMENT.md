# Practice Lab Studio deployment guide

[Project overview and local demo](../README.md) | [Architecture](ARCHITECTURE.md) | [Case study](CASE_STUDY.md)

**The platform JSON files are blueprints, not import packages.** This guide describes how to run or rebuild the public adaptation; it does not provision an agent, prompt, connection, or flow for you. The underlying case study concerns a real solution the author built at Microsoft, separate from these unbound public artifacts. Follow the local path to try the portfolio without a tenant. Follow the optional platform path only in your own development environment.

## Path A: try the public demo

Use the commands in the [root README](../README.md) to run the browser demo locally. No Power Platform account, cloud credentials, or connected content source is needed for this path.

The scenarios in [src/samples.mjs](../src/samples.mjs), identified by `workshop`, `library`, and `photos`, contain fictional source material and illustrative pre-authored responses. They are not live AI output. Field edits and JSON/Word downloads are real local browser operations. The demo is not a general document reader or a deployed Copilot Studio client.

Use these paired public fixtures when inspecting the demo or preparing optional platform tests:

| Fixture | Full source text | Expected flat worksheet JSON |
| --- | --- | --- |
| `workshop` | [samples/workshop.txt](../samples/workshop.txt) | [samples/workshop.json](../samples/workshop.json) |
| `library` | [samples/library.txt](../samples/library.txt) | [samples/library.json](../samples/library.json) |
| `photos` | [samples/photos.txt](../samples/photos.txt) | [samples/photos.json](../samples/photos.json) |

Each source file is the complete fictional guide; each expected JSON file is the worksheet object itself, without a sample wrapper. The browser imports those expected JSON objects and bundles matching source-text copies. It does not fetch the `.txt` files or extract new worksheets at runtime.

Inspect the displayed fields, make a local edit, review the revised worksheet, and confirm it before downloading JSON or Word. Edits and source changes clear approval, so the revised worksheet needs a new confirmation. If the demo reports a source failure, use its retry path; the failed attempt must not be treated as a completed draft.

The browser does not upload entered content or persist drafts in browser storage. Downloaded files are saved locally through the browser; they are not cloud deliveries. Do not rely on a page reload to restore an unfinished draft. Do not interpret the offline walkthrough as evidence that a connected platform prompt or flow passed acceptance.

## Path B: manually build the optional platform design

### 1. Establish a development-only scope

Use your own Power Platform development environment and confirm that you are permitted to create an agent, prompts, and a solution-aware flow. Availability, licensing, capacity, connector policies, and charges depend on that environment. The local demo does not include or grant these entitlements.

Start with pasted fictional workshop text. If you want stored document output, create a new sample SharePoint site and empty output library in your own tenant. If you later want library retrieval, create a separate sample content location containing only newly authored fictional material.

For prompt tests, pass a fixture's full `.txt` body as source content, not its expected JSON. Use the `.json` for field and grounding expectations, allowing supported wording differences from a real extraction. Document-fidelity tests instead require preservation of the exact approved input values. Never return an expected fixture as a substitute for a failed platform retrieval, prompt, or flow.

Do not enable a source route until its reader is configured and its complete-text behavior is verified. No source reader, storage connection, or sharing policy is prebound in this repository.

| Placeholder | What the builder supplies |
| --- | --- |
| `${EXTRACT_PROMPT_ID}` | The newly created `ExtractPA` prompt binding |
| `${EDIT_PROMPT_ID}` | The newly created three-input `EditPA` prompt binding |
| `${PREVIEW_PROMPT_ID}` | The newly created `FormatPreview` prompt binding |
| `${GENERATE_PROMPT_ID}` | The newly created `GeneratePA` prompt binding |
| `${GENERATE_DOC_FLOW_ID}` | The newly created `GenerateDoc` flow binding |
| `${YOUR_APPROVED_SOURCE_READER}` | An optional, authorized full-content reader; leave the route disabled if unavailable |
| `${YOUR_SHAREPOINT_SITE_URL}` | The new sample site in your own tenant |
| `${YOUR_OUTPUT_LIBRARY}` / `${YOUR_OUTPUT_FOLDER}` | An empty sample output location |
| `${YOUR_STORAGE_CONNECTION}` | Your explicitly configured, appropriately scoped connection |

These placeholders are documentation notation. Do not paste them into a field expecting a working resource or native identifier. Keep actual deployment bindings in your own environment rather than the public blueprint files.

### 2. Create four prompts with explicit inputs

The official prompt documentation supports **Agents**, **Topics**, **Add node**, and **Add a tool > New prompt** for a topic-level prompt. To add a Text input inside the prompt editor, use the **Instructions** panel, type **/** or select **Add content**, choose **Text**, and set its **Name**. See [prompt nodes][1] and [prompt inputs][2].

Create the logical prompts below using the corresponding original text files. Replace each `<<INSERT TEXT INPUT TOKEN: ...>>` marker with the actual named input token. The marker itself is not a binding.

| Prompt file | Named Text inputs | Output |
| --- | --- | --- |
| [ExtractPA.txt](../platform/prompts/ExtractPA.txt) | `SourceContent` | JSON |
| [EditPA.txt](../platform/prompts/EditPA.txt) | `SourceContent`, `CurrentJSON`, `EditRequest` | JSON |
| [FormatPreview.txt](../platform/prompts/FormatPreview.txt) | `CurrentJSON` | Text |
| [GeneratePA.txt](../platform/prompts/GeneratePA.txt) | All 17 worksheet keys, separately | Document (preview) |

Choose a model available in your environment and evaluate it with fictional material. No particular model, response time, capacity allocation, or cost is promised by this blueprint.

For `ExtractPA` and `EditPA`, choose **JSON** as the output. Open the settings beside **Output: JSON**, use the 17-key example from the prompt file, then **Apply**, **Test**, and **Save custom**. Verify that every value is a string and every exact key is present. Microsoft documents that the generated JSON schema in this editor is read-only; do not assume you can paste the repository's JSON Schema into that editor. The saved custom example establishes the prompt format; separate runtime validation enforces the [worksheet schema](../schemas/worksheet.schema.json). See [JSON output][3].

Test both prompts with a short supported outline, missing metadata, a conflicting fact, and source text containing an instruction to override the output format. A concise activity can be valid even when most metadata is `TBD`.

For `EditPA`, explicitly inspect all three inputs on the saved topic action. Bind `SourceContent` as well as `CurrentJSON` and `EditRequest`. If the action does not expose the intended contract after a prompt change, refresh or recreate its binding using the available designer controls and test again. Do not assume that saving a prompt updates every caller.

### 3. Prepare the new Word layout

Confirm that [samples/worksheet-template.docx](../samples/worksheet-template.docx) exists and is the newly authored unfilled layout. This blueprint does not create or upload the file.

The layout must contain one replacement field for each exact worksheet key, using double braces: for example `{{PATitle}}`, `{{ActivitySteps}}`, and `{{Notes}}`. Keep scalar fields in ordinary paragraphs for the simplest layout. Give them readable labels and apply visual formatting in Word. Do not use an empty file or an already populated worksheet as the layout.

In `GeneratePA`, choose **Document (preview)**, open **Document settings**, select **select to browse**, and upload the layout. Inspect the detected fields. Match each to its identically named Text input; there must be 17. Select **Test** and inspect the downloaded result.

Microsoft documents that a layout is required; document output currently produces Word files, and layout styling cannot be specified through prompt instructions. It also documents that the layout does not move with the prompt through Solutions and may need to be re-uploaded after saving. Reopen and test the saved prompt; repeat this check in each target environment. See [Document output][4].

Compare all 17 generated values against their input values, including `TBD`, multiline text, quotes, and reference text. A file that opens is not sufficient evidence of faithful content.

### 4. Author the single topic and its guards

Use [topic-blueprint.json](../platform/topic-blueprint.json) as a checklist for one **Create Worksheet** topic. It is not native topic code.

Define the exposed topic input **`SearchQuery`**, type string. A populated input means full raw source text. Bind **`ExtractPA.SourceContent = Topic.SearchQuery`**. Do not replace this with a different exposed input name.

Create topic-owned state for the source ledger, current and candidate JSON, requested edit fields, revision counters, and approved payload snapshot. The ledger must receive actual retrieval results, not status claims written by the model or embedded in source content. If a complete retrieved handoff cannot be verified, request a paste or repeat the selected read.

Implement the following gates before connecting the success path:

| Gate | Required implementation |
| --- | --- |
| Source intake | Route pasted text, selected library items, links, mixed sources, and additional content into the same source-resolution and content guard |
| Retrieval | Require authorized success and a complete body for every requested resource; stop on URL-only, failed, partial, or unknown results |
| Content | Accept a short clear activity/goal; reject empty, error-only, and non-content bodies; use explicit intake questions for ambiguous material, never a character-count-only test |
| Schema | Parse one object; require all 17 exact keys, no extras, and string values; enforce the shared worksheet schema |
| Correction | At most two total calls per extraction/edit operation: initial attempt plus one schema-correction retry with identical trusted inputs |
| Editing | Confirm the targeted fields, bind the complete source, compare decoded values, reject unrelated changes, and explain unapplied requests |
| Preview | Display every value; detect formatting changes and visibly fall back to direct rendering of validated fields |
| Approval | Capture explicit confirmation after preview; clear it on edit/source-change intent; compare both revision and exact payload before generation |

Use supported parsing and condition facilities in the designer. The JSON blueprints do not install validators or expressions. If your chosen facilities cannot enforce a gate, keep the dependent path disabled rather than describing the design as implemented.

Use [agent-instructions.txt](../platform/agent-instructions.txt) for the agent's routing instructions. Configure tool entries to **Only when referenced by topics or agents** where that option is exposed. Keep all prompt/flow calls on the topic path, with no freely callable agent-level duplicates. `GeneratePA` belongs inside the flow. Topic-level flow addition is documented to make that flow available to the topic; see [flow tools][5].

For the initial paste-only trial, present unavailable search/link routes as unavailable. Do not simulate a successful read. Later, test a selected resource through the real reader and prove that the topic receives the complete raw body, not only a search excerpt.

### 5. Configure GenerateDoc in your environment

Use [flow-blueprint.json](../platform/flow-blueprint.json) as the action and failure-branch specification. In Power Automate, choose your development environment. A flow callable by an agent must be in a solution in the same environment. The documented creation path includes **Solutions > New solution**; select your own publisher and version. See [solution-aware agent flows][6].

Configure the flow with **When an agent calls the flow** and **Respond to the agent**. Define the blueprint's `ApprovedJSON`, `ApprovalConfirmed`, `DraftRevision`, and `ApprovedRevision` inputs with their stated types. These approval metadata values are separate from the worksheet's all-string contract.

Add approval conditions and **Parse JSON** before any document or storage operation. Use the repository schema's required fields, string types, `additionalProperties: false`, and supported per-field constraints in the runtime schema. Enforce any unsupported constraint with a separate explicit guard rather than silently dropping it. Inspect a generated schema instead of assuming a sample-derived schema rejects missing keys or extras. This flow must reject invalid approved data; it must not rewrite or re-extract it after approval.

Add **Run a prompt**, select `GeneratePA`, and map each parsed worksheet field to the identically named Text input. Do not let orchestration fill these inputs from conversation context.

Require successful, nonempty document output. Add the storage connector's **Create file** action using your new sample destination. In **File content**, select the actual **Document Output Content Bytes** value. Do not paste an assumed nested response expression. If the available output is base64 text rather than a typed file value, inspect the actual run shape and convert once as required by that action; do not double-decode. See [document output in flows][4].

Use a platform-generated filename that does not overwrite an existing file. Resolve the actual created file's web URL using supported outputs/actions for your selected connector. Prefer existing permissions. Configure any sharing-link action separately, deliberately choose its access policy, and test using the reviewer's identity. Do not guess a URL from the worksheet title.

Implement explicit error branches for prompt failure, empty output, file creation failure, link failure, and uncertain outcomes. Every **Respond to the agent** branch must return the same four string outputs: `Status`, `DocumentURL`, `ArtifactReference`, and `UserMessage`. Return `succeeded` only after creation and URL resolution finish. No email action is included.

In the response action's **Settings**, set **Asynchronous response** to **Off**. Microsoft documents a 100-second agent action limit. Measure your synchronous path rather than assuming document generation will fit. Do not return success and place the promised file creation after the response. A topic-side timeout must show an unknown result and retain the draft. See [agent flow requirements][5].

After configuration and development testing, make the flow available as required by the platform, then add it at the topic's **Add node > Add a tool** path and map its inputs and outputs explicitly. Saving or publishing this development flow does not publish the portfolio, certify the design, or establish production readiness.

### 6. Run acceptance before claiming a connected build works

The following are **acceptance criteria, not recorded results**. Record actual outcomes in your own development evidence. The repository demo and static contract checks cannot substitute for these tenant tests.

| Test | Required observation |
| --- | --- |
| Full paste | `ExtractPA.SourceContent` receives all accepted raw text |
| Short supported outline | Drafting is permitted; unsupported metadata is `TBD` |
| URL-only with no configured reader | Visible source error; no extraction or successful-looking draft |
| Failed or incomplete read | Visible error; no content inferred from the title, citation, or general knowledge |
| Mixed input with one failed link | No draft until that source is resolved or explicitly removed |
| Additional content with a failed link | Same source guard as initial intake; prior draft retained and approval cleared |
| Source asks to bypass review | Request is ignored as an instruction; review remains mandatory |
| Wrong key, missing key, extra key, or non-string value | Runtime schema rejection; at most one correction attempt; visible failure if still invalid |
| Scoped edit | Full source reaches `EditPA`; decoded unrequested field values remain identical |
| Unsupported factual edit | Change remains unapplied and is explained; reviewer can add a factual correction as source |
| Edit started after approval | Approval clears before the model/action runs, even if the edit fails or is abandoned |
| Preview mismatch | Visible formatting warning and complete direct field display |
| Stale approval/payload | No flow invocation |
| Word generation | All 17 input values preserved; no unresolved placeholders or added facts |
| Prompt failure or empty bytes | No placeholder file or fake success URL |
| File exists but link fails | Partial outcome reported; recovery targets the existing file |
| Timeout | Unknown outcome shown; operator checks run and destination before creating another file |
| Reviewer access | The intended reviewer can open the actual returned file |

If a test fails, leave that route disabled, retain the draft where applicable, and correct the configuration before continuing. Use the actual result rather than a pre-authored success response.

## Scope and maintenance

The platform files contain no executable solution export. The builder must supply live bindings, retrieval implementation, validation logic, connection permissions, an uploaded layout, and measured acceptance evidence. Public documentation labels below were checked on 2026-09-15; region, feature availability, and designer behavior still require verification in the chosen environment.

Changes to field names must be coordinated across the [schema](../schemas/worksheet.schema.json), all four prompts, action mappings, layout, fixtures, local editors, downloads, and tests. For this blueprint version the contract remains exactly 17 string fields.

[1]: https://learn.microsoft.com/en-us/microsoft-copilot-studio/nlu-prompt-node
[2]: https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-inputs-prompt
[3]: https://learn.microsoft.com/en-us/microsoft-copilot-studio/process-responses-json-output
[4]: https://learn.microsoft.com/en-us/microsoft-copilot-studio/generate-document-output-prompt
[5]: https://learn.microsoft.com/en-us/microsoft-copilot-studio/flow-agent
[6]: https://learn.microsoft.com/en-us/microsoft-copilot-studio/flow-modify-use-with-agent
