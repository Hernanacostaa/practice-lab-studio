import { FIELD_KEYS, FIELD_LABELS, assertWorksheet, assertTrainerGuide, createSampleDraft, updateField } from "./core.mjs";
import { DEMO_SAMPLES as SAMPLES } from "./samples.mjs";
import { createWorksheetDocx } from "./document.mjs";
import { initializeThemeControls } from "./theme.mjs";

const byId = (id) => document.getElementById(id);
const controls = Object.fromEntries([
  "sample-summary", "sample-choice", "suggested-edit", "generate", "reset",
  "retrieval-failure", "status", "error", "empty-state", "draft-content", "fields",
  "worksheet-title", "worksheet-subtitle", "field-count", "draft-state", "edit-mode",
  "edit-help", "revision-count", "approve", "review-note", "export-docx", "export-json",
  "trace", "trace-count", "worksheet-preview",
  "worksheet-facts", "worksheet-sections", "worksheet-metadata", "pending-warning", "download-result",
  "sop-failure", "source-documents", "guide-overview", "connections", "full-guide",
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
let selectedSample = SAMPLES[0];

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
  return selectedSample;
}

function initializeCaseTabs() {
  const tabList = byId("case-tabs");
  const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
  const panels = tabs.map((tab) => byId(tab.getAttribute("aria-controls")));
  panels.forEach((panel, index) => {
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tabs[index].id);
    panel.tabIndex = 0;
  });
  function select(index, focus = false) {
    tabs.forEach((tab, position) => {
      const selected = position === index;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[position].hidden = !selected;
    });
    byId("project-story").scrollTop = 0;
    if (focus) tabs[index].focus({ preventScroll: true });
  }
  tabs.forEach((tab, index) => tab.addEventListener("click", () => select(index)));
  tabList.addEventListener("keydown", (event) => {
    const index = tabs.indexOf(event.target);
    if (index < 0) return;
    const next = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next, true);
  });
  function revealAnchor() {
    const target = byId(window.location.hash.slice(1));
    if (!target) return;
    const index = panels.findIndex((panel) => panel === target || panel.contains(target));
    if (index < 0 || !panels[index].hidden) return;
    select(index);
    (target === panels[index] ? tabList : target).scrollIntoView({ block: "nearest", behavior: "instant" });
  }
  tabList.hidden = false;
  select(0);
  revealAnchor();
  window.addEventListener("hashchange", revealAnchor);
}

function syncReview() {
  const dirty = pendingKeys.size > 0;
  const approved = worksheet !== null && controls.approve.checked && !dirty;
  controls.approve.disabled = !worksheet || dirty || exporting;
  controls["sample-choice"].disabled = exporting;
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
    : "Your preview shows the last applied version. Turn on Edit trainer guide to apply or discard your pending edits before reviewing.";
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
  controls["guide-overview"].replaceChildren();
  controls.connections.replaceChildren();
  controls["full-guide"].open = false;
  for (const id of ["worksheet-title", "worksheet-subtitle", "field-count", "download-result"]) controls[id].textContent = "";
  controls["revision-count"].textContent = "No manual edits";
  setEditing(false);
}

function selectSample() {
  clearDraft();
  const sample = currentSample();
  controls["sample-summary"].textContent = sample.summary;
  controls["suggested-edit"].textContent = sample.suggestedEdit;
  renderSources();
  message(`${sample.name} selected. Inspect the assessment and SOP, then create the prepared trainer guide.`);
}

function resetSample() {
  controls["retrieval-failure"].checked = false;
  controls["sop-failure"].checked = false;
  events = [];
  selectSample();
  controls.trace.replaceChildren();
  controls["trace-count"].textContent = "0 events";
}

function renderSources() {
  const sample = currentSample();
  controls["source-documents"].replaceChildren(...Object.entries(sample.sources).map(([key, source]) => {
    const unavailable = controls[key === "assessment" ? "retrieval-failure" : "sop-failure"].checked;
    const card = document.createElement("section");
    card.className = "input-document";
    card.append(previewText("h4", source.title));
    if (unavailable) {
      card.append(previewText("p", "Unavailable in this simulation. Restore this input below and retry; drafting is blocked."));
      return card;
    }
    const excerpt = source.sections[1];
    card.append(previewText("p", excerpt.label), previewText("blockquote", excerpt.text));
    const details = document.createElement("details");
    details.className = "source-document";
    details.id = `source-${key}`;
    details.append(previewText("summary", `Read full ${key === "assessment" ? "assessment" : "SOP"}`));
    for (const section of source.sections) {
      const passage = document.createElement("section");
      passage.id = section.id;
      passage.append(previewText("h5", section.label), previewText("p", section.text));
      details.append(passage);
    }
    card.append(details);
    return card;
  }));
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
    ["ActivityDescription", "What to teach and why"],
    ["DesiredLearningOutcome", "Intended learning outcome"],
    ["SkillsBasedLearningObjectives", "Required competencies", "ul"],
    ["WhatIsNeeded", "Tooling and trainer preparation", "ul"],
    ["TrainerGuidelines", "Trainer briefing and demonstration", "ul"],
    ["ActivitySteps", "Trainer-led sequence and learner practice", "ol"],
    ["Validation", "Individual exercise completion criteria", "ul"],
    ["DocumentationAndReferences", "Source & references"],
    ["Notes", "Safety callouts and simulation boundaries"],
  ].map(([key, label, list]) => {
    const section = document.createElement("section");
    section.className = "worksheet-section";
    section.id = `guide-${key}`;
    const value = list ? document.createElement(list) : previewText("p", worksheet[key]);
    value.dataset.previewKey = key;
    if (list) {
      for (const line of worksheet[key].split(/\r\n|\r|\n/)) value.append(previewText("li", line));
    }
    section.append(previewText("h5", label), value);
    return section;
  }));
  controls["guide-overview"].replaceChildren(previewText("h5", "What this guide covers"), ...[
    ["SkillsBasedLearningObjectives", "Teach"],
    ["WhatIsNeeded", "Prepare"],
    ["TrainerGuidelines", "Demonstrate", 1],
    ["ActivitySteps", "Practise", 2],
    ["Notes", "Stay within boundaries"],
    ["Validation", "Check each participant"],
  ].map(([key, label, index = 0]) => {
    const section = document.createElement("section");
    section.className = "guide-overview-item";
    section.append(previewText("h5", label), previewText("p", worksheet[key].split(/\r\n|\r|\n/)[index] ?? worksheet[key]));
    return section;
  }));
  controls.connections.replaceChildren(...currentSample().connections.map(({ source, field, reason }) => {
    const section = document.createElement("section");
    const passage = Object.values(currentSample().sources).flatMap(({ sections }) => sections).find(({ id }) => id === source);
    section.append(previewText("p", reason), previewText("blockquote", passage.text));
    const inputLink = document.createElement("a");
    inputLink.href = `#${source}`;
    inputLink.textContent = passage.label;
    inputLink.addEventListener("click", () => { byId(source).closest("details").open = true; });
    const outputLink = document.createElement("a");
    outputLink.href = `#guide-${field}`;
    outputLink.textContent = `${FIELD_LABELS[field]}${editedKeys.has(field) ? " (manually edited; review again)" : ""}`;
    outputLink.addEventListener("click", () => { controls["full-guide"].open = true; });
    section.append(inputLink, previewText("span", " → "), outputLink);
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
        const candidate = updateField(worksheet, key, textarea.value);
        assertTrainerGuide(candidate, currentSample().requiredBoundaries);
        worksheet = candidate;
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
        message(`${FIELD_LABELS[key]} updated. Review the change against BOTH the assessment and SOP.`);
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
    message("Review and approve the current trainer guide before exporting.", true);
    return;
  }
  const exportEpoch = epoch;
  const sample = currentSample();
  const operation = Symbol("export");
  exportToken = operation;
  const snapshot = structuredClone(worksheet);
  exporting = true;
  syncReview();
  try {
    assertWorksheet(snapshot);
    assertTrainerGuide(snapshot, sample.requiredBoundaries);
    const bytes = format === "docx" ? await createWorksheetDocx(snapshot) : JSON.stringify(snapshot, null, 2);
    if (epoch !== exportEpoch || currentSample() !== sample || !controls.approve.checked || pendingKeys.size) {
      message("The draft changed during export. Review it again before downloading.", true);
      return;
    }
    download(bytes, format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/json", `practice-lab-${sample.id}.${format}`);
    exportedEpoch = epoch;
    controls["download-result"].textContent = format === "docx"
      ? "Word download prepared from the current reviewed trainer guide. Fictional simulation only, not approved operational instruction."
      : "JSON download prepared. It contains the same 17 plain-text fields as the reviewed trainer guide.";
    log(`Local ${format.toUpperCase()} export prepared from the approved 17-field draft. No cloud delivery.`);
    message(`${format.toUpperCase()} download prepared from the reviewed trainer guide. Fictional exercise only, not operational approval.`);
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

controls.generate.addEventListener("click", () => {
  clearDraft();
  try {
    const sample = currentSample();
    log(`Source requested: ${sample.name}.`);
    worksheet = createSampleDraft(sample, { sourceAvailability: {
      assessment: !controls["retrieval-failure"].checked,
      sop: !controls["sop-failure"].checked,
    } });
    controls["empty-state"].hidden = true;
    controls["draft-content"].hidden = false;
    showSummary();
    renderFields();
    syncReview();
    log("Both source gates passed: complete fictional assessment and SOP available.");
    log("Illustrative extraction replayed: pre-authored sample output, not a model call.");
    log("Contract accepted: exactly 17 nonempty string fields. Human review required.");
    message("Prepared trainer guide ready. Inspect its teaching structure and full guide, optionally edit, then review against BOTH sources.");
    focusResult("draft-heading");
  } catch (error) {
    message(error.message, true);
    log("Source or contract gate failed. Extraction and export blocked; no substitute content generated.");
    focusResult("error");
  }
});
for (const id of ["retrieval-failure", "sop-failure"]) controls[id].addEventListener("change", () => {
  clearDraft();
  renderSources();
  const unavailable = controls["retrieval-failure"].checked || controls["sop-failure"].checked;
  message(unavailable
    ? "A required input is unavailable. Restore it below, or create the example to inspect the stopped workflow."
    : "Both inputs are available again. Retry Create prepared trainer guide to continue.", unavailable);
});
controls.reset.addEventListener("click", () => {
  resetSample();
  log("Demo reset. All manual edits and approval removed from memory.");
});
controls["sample-choice"].replaceChildren(...SAMPLES.map((sample) => {
  const option = previewText("option", sample.name);
  option.value = sample.id;
  return option;
}));
controls["sample-choice"].addEventListener("change", () => {
  const next = SAMPLES.find((sample) => sample.id === controls["sample-choice"].value);
  controls["sample-choice"].value = selectedSample.id;
  if (!next) {
    message("The selected example is unavailable. Choose Logistics or IT service desk; your current draft is unchanged.", true);
    return;
  }
  if (exporting) {
    message("An export is in progress. Wait for it to finish before switching examples.", true);
    return;
  }
  if (next === selectedSample) return;
  if ((pendingKeys.size || editedKeys.size || controls.approve.checked) &&
      !window.confirm(`Switch to ${next.name}? This discards the current draft, pending and applied edits, and approval.`)) {
    message(`Stayed on ${selectedSample.name}. Your draft, edits, and review are unchanged.`);
    return;
  }
  selectedSample = next;
  controls["sample-choice"].value = next.id;
  resetSample();
  log(`${next.name} selected. Previous example state removed; both sources restored.`);
});
controls["edit-mode"].addEventListener("change", () => setEditing(controls["edit-mode"].checked));
controls.approve.addEventListener("change", () => {
  epoch++;
  syncReview();
  message(controls.approve.checked
    ? "Review confirmed for the current fictional trainer guide. Local downloads are enabled."
    : "Review withdrawn. Compare the current trainer guide against BOTH sources before downloading.");
  log(controls.approve.checked ? "Human review confirmed for the current draft. Local export enabled." : "Approval withdrawn. Local export disabled.");
});
controls["export-docx"].addEventListener("click", () => void exportDocument("docx"));
controls["export-json"].addEventListener("click", () => void exportDocument("json"));
initializeThemeControls();
initializeCaseTabs();
selectSample();
