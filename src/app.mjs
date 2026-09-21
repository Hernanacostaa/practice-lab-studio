import { FIELD_KEYS, FIELD_LABELS, assertWorksheet, createSampleDraft, updateField } from "./core.mjs";
import { SAMPLES } from "./samples.mjs";
import { createWorksheetDocx } from "./document.mjs";
import { initializeThemeControls } from "./theme.mjs";

const byId = (id) => document.getElementById(id);
const controls = Object.fromEntries([
  "sample-select", "source-text", "sample-summary", "source-length", "generate", "reset",
  "retrieval-failure", "status", "error", "empty-state", "draft-content", "fields",
  "worksheet-title", "worksheet-subtitle", "field-count", "draft-state", "edit-mode",
  "edit-help", "revision-count", "approve", "review-note", "export-docx", "export-json",
  "trace", "trace-count", "source-audience", "source-duration", "worksheet-preview",
  "worksheet-facts", "worksheet-sections", "worksheet-metadata", "pending-warning", "download-result",
].map((id) => [id, byId(id)]));

let worksheet = null;
let revision = 0;
let exporting = false;
let exportToken = null;
let epoch = 0;
let exportedEpoch = null;
const editedKeys = new Set();
const pendingKeys = new Set();
let events = [];

function log(message) {
  events.push(message);
  if (events.length > 100) events.shift();
  controls.trace.replaceChildren(...events.map((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }));
  controls["trace-count"].textContent = `${events.length} events`;
}

function message(text, isError = false) {
  controls.status.textContent = isError ? "The workflow stopped. No new document was created." : text;
  controls.error.hidden = !isError;
  controls.error.textContent = isError ? text : "";
}

function currentSample() {
  const sample = SAMPLES.find(({ id }) => id === controls["sample-select"].value);
  if (!sample) throw new Error("Choose one of the available fictional scenarios.");
  return sample;
}

function syncReview() {
  const dirty = pendingKeys.size > 0;
  const approved = worksheet !== null && controls.approve.checked && !dirty;
  controls.approve.disabled = !worksheet || dirty || exporting;
  controls["export-docx"].disabled = !approved || exporting;
  controls["export-json"].disabled = !approved || exporting;
  controls["review-note"].textContent = dirty
    ? "Apply or discard all pending edits before approving and exporting."
    : approved
      ? "Reviewed for this demo. Export is enabled; any edit will clear approval."
      : "Approval is required before exporting. Any content change requires a new review.";
  controls["draft-state"].textContent = worksheet ? approved ? "Reviewed" : dirty ? "Unsaved edits" : "Needs review" : "Ready when you are";
  controls["draft-state"].classList.toggle("neutral", !worksheet);
  controls["pending-warning"].hidden = !dirty;
  controls["pending-warning"].textContent = controls["edit-mode"].checked
    ? "Apply or discard your pending edits. Only applied changes appear in the preview and downloads."
    : "Your preview shows the last applied version. Turn on Edit worksheet to apply or discard your pending edits before reviewing.";
  controls["download-result"].hidden = !approved || exportedEpoch !== epoch;
  const currentStep = !worksheet ? "progress-source" : dirty ? "progress-draft" : approved ? "progress-export" : "progress-review";
  for (const [id, active] of [
    ["progress-source", true], ["progress-draft", Boolean(worksheet)],
    ["progress-review", approved], ["progress-export", approved && exportedEpoch === epoch],
  ]) {
    const step = byId(id);
    step.classList.toggle("active", active);
    if (id === currentStep) step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
  }
}

function clearDraft() {
  epoch++;
  worksheet = null;
  revision = 0;
  exporting = false;
  exportToken = null;
  exportedEpoch = null;
  editedKeys.clear();
  pendingKeys.clear();
  controls.approve.checked = false;
  controls["edit-mode"].checked = false;
  controls["edit-help"].hidden = true;
  controls["empty-state"].hidden = false;
  controls["draft-content"].hidden = true;
  controls.fields.replaceChildren();
  for (const id of ["worksheet-facts", "worksheet-sections", "worksheet-metadata"]) controls[id].replaceChildren();
  for (const id of ["worksheet-title", "worksheet-subtitle", "field-count", "download-result"]) controls[id].textContent = "";
  controls["revision-count"].textContent = "No manual edits";
  setEditing(false);
}

function selectSample() {
  clearDraft();
  const sample = currentSample();
  controls["source-text"].textContent = sample.source;
  controls["sample-summary"].textContent = sample.summary;
  controls["source-length"].textContent = `${sample.source.trim().split(/\s+/u).length} words`;
  controls["source-audience"].textContent = sample.fields.TargetAudience;
  controls["source-duration"].textContent = sample.fields.Duration;
  message("Ready when you are. Create the example worksheet to see what the learner gets.");
}

function showSummary() {
  controls["worksheet-title"].textContent = worksheet.PATitle;
  controls["worksheet-subtitle"].textContent = worksheet.PASubtitle;
  const missing = FIELD_KEYS.filter((key) => worksheet[key].trim() === "TBD").length;
  controls["field-count"].textContent = `17 fields / ${missing} TBD`;
  controls["revision-count"].textContent = revision ? `${revision} applied edit${revision === 1 ? "" : "s"}` : "No manual edits";
  renderPreview();
}

function previewText(tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

function previewDetails(keys) {
  return keys.map((key) => {
    const group = document.createElement("div");
    const value = previewText("dd", worksheet[key]);
    value.dataset.previewKey = key;
    group.append(previewText("dt", FIELD_LABELS[key]), value);
    return group;
  });
}

function renderPreview() {
  const facts = document.createElement("dl");
  facts.append(...previewDetails(["TargetAudience", "Duration"]));
  controls["worksheet-facts"].replaceChildren(facts);
  controls["worksheet-metadata"].replaceChildren(...previewDetails(["CourseReference", "Authors", "Contributors", "LastUpdated"]));
  controls["worksheet-sections"].replaceChildren(...[
    ["ActivityDescription", "The exercise"],
    ["DesiredLearningOutcome", "The learning goal"],
    ["SkillsBasedLearningObjectives", "What learners will practise", "ul"],
    ["WhatIsNeeded", "Before you start", "ul"],
    ["TrainerGuidelines", "For the trainer", "ul"],
    ["ActivitySteps", "Try it, step by step", "ol"],
    ["Validation", "How to check it worked", "ul"],
    ["DocumentationAndReferences", "Source & references"],
    ["Notes", "Notes & limits"],
  ].map(([key, label, list]) => {
    const section = document.createElement("section");
    section.className = "worksheet-section";
    const value = list ? document.createElement(list) : previewText("p", worksheet[key]);
    value.dataset.previewKey = key;
    if (list) {
      for (const line of worksheet[key].split(/\r\n|\r|\n/)) value.append(previewText("li", line));
    }
    section.append(previewText("h5", label), value);
    return section;
  }));
}

function focusResult(id) {
  const element = byId(id);
  element.focus({ preventScroll: true });
  element.scrollIntoView({
    block: "start",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  });
}

function renderFields() {
  const previouslyOpen = new Set(Array.from(controls.fields.querySelectorAll("details[open]"), (el) => el.dataset.key));
  controls.fields.replaceChildren();
  const metadata = document.createElement("details");
  metadata.className = "metadata-group";
  const metadataSummary = document.createElement("summary");
  metadataSummary.textContent = "Document details / 8 fields";
  const metadataFields = document.createElement("div");
  metadataFields.className = "metadata-fields";
  metadata.append(metadataSummary, metadataFields);
  controls.fields.append(metadata);
  for (const [index, key] of FIELD_KEYS.entries()) {
    const container = document.createElement("details");
    container.className = "field";
    container.dataset.key = key;
    container.open = previouslyOpen.has(key) || ["ActivityDescription", "ActivitySteps"].includes(key);
    const summary = document.createElement("summary");
    const label = document.createElement("span");
    label.textContent = `${String(index + 1).padStart(2, "0")} / ${FIELD_LABELS[key]}`;
    summary.append(label);
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = editedKeys.has(key) ? "Manually edited" : worksheet[key] === "TBD" ? "Not supplied" : "";
    summary.append(badge);
    const value = document.createElement("p");
    value.className = "field-value";
    value.textContent = worksheet[key];
    value.hidden = controls["edit-mode"].checked;
    const editor = document.createElement("div");
    editor.className = "field-editor";
    editor.hidden = !controls["edit-mode"].checked;
    const textarea = document.createElement("textarea");
    textarea.id = `edit-${key}`;
    textarea.setAttribute("aria-label", `Edit ${FIELD_LABELS[key]}`);
    textarea.maxLength = 20000;
    textarea.value = worksheet[key];
    textarea.rows = Math.min(12, Math.max(3, worksheet[key].split("\n").length + 1));
    const actions = document.createElement("div");
    actions.className = "editor-actions";
    const apply = document.createElement("button");
    apply.type = "button";
    apply.className = "button secondary";
    apply.textContent = "Apply field";
    apply.disabled = true;
    const discard = document.createElement("button");
    discard.type = "button";
    discard.className = "button secondary";
    discard.textContent = "Discard edit";
    discard.disabled = true;
    const fieldError = document.createElement("p");
    fieldError.className = "field-error";
    fieldError.id = `error-${key}`;
    fieldError.setAttribute("role", "alert");
    fieldError.hidden = true;
    textarea.setAttribute("aria-describedby", fieldError.id);
    const clearFieldError = () => {
      fieldError.hidden = true;
      fieldError.textContent = "";
      textarea.removeAttribute("aria-invalid");
    };
    textarea.addEventListener("input", () => {
      if (textarea.value !== worksheet[key]) pendingKeys.add(key);
      else pendingKeys.delete(key);
      controls.approve.checked = false;
      apply.disabled = !pendingKeys.has(key);
      discard.disabled = !pendingKeys.has(key);
      clearFieldError();
      syncReview();
    });
    discard.addEventListener("click", () => {
      textarea.value = worksheet[key];
      pendingKeys.delete(key);
      apply.disabled = true;
      discard.disabled = true;
      clearFieldError();
      syncReview();
      textarea.focus();
    });
    apply.addEventListener("click", () => {
      try {
        worksheet = updateField(worksheet, key, textarea.value);
        pendingKeys.delete(key);
        editedKeys.add(key);
        revision++;
        epoch++;
        controls.approve.checked = false;
        value.textContent = worksheet[key];
        badge.textContent = "Manually edited";
        apply.disabled = true;
        discard.disabled = true;
        clearFieldError();
        showSummary();
        syncReview();
        log(`Edit ${revision}: ${FIELD_LABELS[key]} updated manually; remaining fields preserved. Approval cleared.`);
        message(`${FIELD_LABELS[key]} updated. Review the change against the sample source.`);
      } catch (error) {
        fieldError.textContent = error.message;
        fieldError.hidden = false;
        textarea.setAttribute("aria-invalid", "true");
        log(`Edit rejected for ${FIELD_LABELS[key]}: worksheet contract not satisfied.`);
      }
    });
    actions.append(apply, discard);
    editor.append(textarea, actions, fieldError);
    container.append(summary, value, editor);
    (index < 8 ? metadataFields : controls.fields).append(container);
  }
}

function setEditing(enabled) {
  controls["edit-help"].hidden = !enabled;
  controls.fields.hidden = !enabled;
  controls["worksheet-preview"].hidden = enabled;
  for (const el of controls.fields.querySelectorAll(".field-value")) el.hidden = enabled;
  for (const el of controls.fields.querySelectorAll(".field-editor")) el.hidden = !enabled;
  syncReview();
}

function download(bytes, mime, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function exportDocument(format) {
  if (!worksheet || !controls.approve.checked || pendingKeys.size || exporting) {
    message("Review and approve the current worksheet before exporting.", true);
    return;
  }
  const exportEpoch = epoch;
  const operation = Symbol("export");
  exportToken = operation;
  const snapshot = structuredClone(worksheet);
  exporting = true;
  syncReview();
  try {
    assertWorksheet(snapshot);
    const bytes = format === "docx" ? await createWorksheetDocx(snapshot) : JSON.stringify(snapshot, null, 2);
    if (epoch !== exportEpoch || !controls.approve.checked || pendingKeys.size) {
      message("The draft changed during export. Review it again before downloading.", true);
      return;
    }
    download(bytes, format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/json", `practice-lab-${currentSample().id}.${format}`);
    exportedEpoch = epoch;
    controls["download-result"].textContent = format === "docx"
      ? "Word download prepared. Open it to edit the training worksheet, or keep exploring another fictional guide."
      : "JSON download prepared. It contains the same 17 plain-text fields as the reviewed worksheet.";
    log(`Local ${format.toUpperCase()} export prepared from the approved 17-field draft. No cloud delivery.`);
    message(`${format.toUpperCase()} download prepared. The worksheet remains available for another review.`);
  } catch (error) {
    message(`Export failed: ${error.message}. Your current draft is still available.`, true);
    log(`${format.toUpperCase()} export failed; draft retained.`);
  } finally {
    if (exportToken === operation) {
      exporting = false;
      exportToken = null;
    }
    syncReview();
  }
}

for (const sample of SAMPLES) {
  const option = document.createElement("option");
  option.value = sample.id;
  option.textContent = sample.name;
  controls["sample-select"].append(option);
}
controls["sample-select"].addEventListener("change", () => {
  selectSample();
  log("Scenario changed. Previous draft, edits, and approval cleared.");
});
controls.generate.addEventListener("click", () => {
  clearDraft();
  try {
    const sample = currentSample();
    log(`Source requested: ${sample.name}.`);
    worksheet = createSampleDraft(sample, { retrievalAvailable: !controls["retrieval-failure"].checked });
    controls["empty-state"].hidden = true;
    controls["draft-content"].hidden = false;
    showSummary();
    renderFields();
    syncReview();
    log("Source gate passed: full fictional source text is available.");
    log("Illustrative extraction replayed: pre-authored sample output, not a model call.");
    log("Contract accepted: exactly 17 nonempty string fields. Human review required.");
    message("Example worksheet ready. Read the preview, optionally edit it, then review and download.");
    focusResult("draft-heading");
  } catch (error) {
    message(error.message, true);
    log("Source or contract gate failed. Extraction and export blocked; no substitute content generated.");
    focusResult("error");
  }
});
controls["retrieval-failure"].addEventListener("change", () => {
  clearDraft();
  message(controls["retrieval-failure"].checked
    ? "Unavailable-source simulation enabled. Create the example to see why the workflow stops."
    : "The source is available again. Create the example worksheet to continue.");
});
controls.reset.addEventListener("click", () => {
  controls["retrieval-failure"].checked = false;
  controls["sample-select"].selectedIndex = 0;
  events = [];
  selectSample();
  log("Demo reset. All manual edits and approval removed from memory.");
});
controls["edit-mode"].addEventListener("change", () => setEditing(controls["edit-mode"].checked));
controls.approve.addEventListener("change", () => {
  epoch++;
  syncReview();
  log(controls.approve.checked ? "Human review confirmed for the current draft. Local export enabled." : "Approval withdrawn. Local export disabled.");
});
controls["export-docx"].addEventListener("click", () => void exportDocument("docx"));
controls["export-json"].addEventListener("click", () => void exportDocument("json"));
initializeThemeControls();
selectSample();
