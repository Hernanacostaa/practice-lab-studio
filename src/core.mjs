export const FIELD_KEYS = Object.freeze([
  "PATitle",
  "PASubtitle",
  "CourseReference",
  "Authors",
  "Contributors",
  "LastUpdated",
  "TargetAudience",
  "Duration",
  "ActivityDescription",
  "TrainerGuidelines",
  "DesiredLearningOutcome",
  "WhatIsNeeded",
  "SkillsBasedLearningObjectives",
  "DocumentationAndReferences",
  "ActivitySteps",
  "Validation",
  "Notes",
]);

export const FIELD_LABELS = Object.freeze({
  PATitle: "Title",
  PASubtitle: "Subtitle",
  CourseReference: "Course reference",
  Authors: "Authors",
  Contributors: "Contributors",
  LastUpdated: "Last updated",
  TargetAudience: "Target audience",
  Duration: "Duration",
  ActivityDescription: "Activity description",
  TrainerGuidelines: "Trainer guidelines",
  DesiredLearningOutcome: "Desired learning outcome",
  WhatIsNeeded: "What is needed",
  SkillsBasedLearningObjectives: "Skills-based learning objectives",
  DocumentationAndReferences: "Documentation and references",
  ActivitySteps: "Activity steps",
  Validation: "Validation",
  Notes: "Notes",
});

const fieldNames = new Set(FIELD_KEYS);
const invalidXmlCharacter = /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u;
const fieldLimit = 20000;
const worksheetLimit = 80000;

/** Validate without coercion, trimming, repairing text, or changing the input. */
export function assertWorksheet(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Worksheet must be a plain object containing exactly 17 string fields.");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("Worksheet must be a plain object, not a class instance.");
  }

  const keys = Reflect.ownKeys(value);
  const missing = FIELD_KEYS.filter((key) => !Object.hasOwn(value, key));
  const extra = keys.filter((key) => !fieldNames.has(key));
  if (missing.length || extra.length) {
    const details = [
      missing.length ? `Missing fields: ${missing.join(", ")}.` : "",
      extra.length ? `Unexpected fields: ${extra.map(String).join(", ")}.` : "",
    ].filter(Boolean).join(" ");
    throw new Error(`Worksheet must contain exactly the 17 supported fields. ${details}`);
  }

  let total = 0;
  for (const key of FIELD_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
      throw new Error(`${key} must be an enumerable plain string value, not an accessor.`);
    }
    const text = descriptor.value;
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new Error(`${key} must be a nonempty plain string. Use TBD for missing information.`);
    }
    if (text.length > fieldLimit) {
      throw new Error(`${key} exceeds the ${fieldLimit}-character limit (UTF-16 code units).`);
    }
    if (invalidXmlCharacter.test(text)) {
      throw new Error(`${key} contains an invalid XML 1.0 character or an unpaired surrogate.`);
    }
    total += text.length;
  }
  if (total > worksheetLimit) {
    throw new Error(`Worksheet exceeds the total ${worksheetLimit}-character limit (UTF-16 code units).`);
  }
  return value;
}

/** Check for text outside links; this is not a source-quality or factuality assessment. */
export function hasUsableSource(text) {
  if (typeof text !== "string" || invalidXmlCharacter.test(text)) return false;
  const content = text
    .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, " ")
    .replace(/!?\[[^\]\r\n]*\]\([^\r\n]*?\)/g, " ")
    .replace(/^\s*\[[^\]\r\n]+\]:\s*\S+.*$/gm, " ")
    .replace(/!?\[[^\]\r\n]*\]\[[^\]\r\n]*\]/g, " ")
    .replace(/\b(?:[a-z][a-z\d+.-]*:\/\/|mailto:|www\.)[^\s<>"']+/gi, " ");
  return /[\p{L}\p{N}]/u.test(content);
}

/** Replay supplied fixture fields only. No model or source-extraction algorithm runs. */
export function createSampleDraft(sample, { retrievalAvailable = true } = {}) {
  if (retrievalAvailable !== true) {
    throw new Error("Source retrieval failed or was unavailable. No fixture draft was created.");
  }
  if (sample === null || typeof sample !== "object" || Array.isArray(sample)) {
    throw new Error("A sample fixture with source text and worksheet fields is required.");
  }
  if (!hasUsableSource(sample.source)) {
    throw new Error("Usable source text is required; blank or link-only input cannot create a fixture draft.");
  }
  const fields = assertWorksheet(sample.fields);
  return Object.fromEntries(FIELD_KEYS.map((key) => [key, fields[key]]));
}

export function updateField(worksheet, key, value) {
  assertWorksheet(worksheet);
  if (typeof key !== "string" || !fieldNames.has(key)) {
    throw new Error("Unknown worksheet field. Choose an exact key from FIELD_KEYS.");
  }
  return assertWorksheet(Object.fromEntries(
    FIELD_KEYS.map((field) => [field, field === key ? value : worksheet[field]]),
  ));
}
