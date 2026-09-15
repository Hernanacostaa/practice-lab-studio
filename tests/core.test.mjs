import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  FIELD_KEYS,
  FIELD_LABELS,
  assertWorksheet,
  createSampleDraft,
  hasUsableSource,
  updateField,
} from "../src/core.mjs";
import { SAMPLES } from "../src/samples.mjs";

const expectedKeys = [
  "PATitle", "PASubtitle", "CourseReference", "Authors", "Contributors",
  "LastUpdated", "TargetAudience", "Duration", "ActivityDescription",
  "TrainerGuidelines", "DesiredLearningOutcome", "WhatIsNeeded",
  "SkillsBasedLearningObjectives", "DocumentationAndReferences",
  "ActivitySteps", "Validation", "Notes",
];
const minimalWorksheet = () => Object.fromEntries(FIELD_KEYS.map((key) => [key, "x"]));

test("the public contract has exactly 17 immutable keys and labels in canonical order", () => {
  assert.deepEqual(FIELD_KEYS, expectedKeys);
  assert.deepEqual(Object.keys(FIELD_LABELS), expectedKeys);
  assert.equal(new Set(Object.values(FIELD_LABELS)).size, 17);
  assert.ok(Object.isFrozen(FIELD_KEYS));
  assert.ok(Object.isFrozen(FIELD_LABELS));
  assert.equal(FIELD_KEYS.includes("PA_Title"), false);
});

test("validation returns the original value without trimming or reordering it", () => {
  const worksheet = minimalWorksheet();
  worksheet.Notes = "  Keep this spacing.\nAnd this line.\t  ";
  assert.equal(assertWorksheet(worksheet), worksheet);
  assert.equal(worksheet.Notes, "  Keep this spacing.\nAnd this line.\t  ");
  const reordered = Object.fromEntries(Object.entries(worksheet).reverse());
  assert.equal(assertWorksheet(reordered), reordered);
  assert.equal(assertWorksheet(Object.assign(Object.create(null), worksheet)).Notes, worksheet.Notes);
});

test("validation rejects non-record inputs and class instances", () => {
  class Worksheet {
    constructor() {
      Object.assign(this, minimalWorksheet());
    }
  }
  for (const value of [null, undefined, [], "worksheet", 17, true, () => {}, new Date(), new Worksheet()]) {
    assert.throws(() => assertWorksheet(value), /plain object/);
  }
});

test("every missing field and every extra key is rejected, including inherited and symbol keys", () => {
  for (const key of FIELD_KEYS) {
    const worksheet = minimalWorksheet();
    delete worksheet[key];
    assert.throws(() => assertWorksheet(worksheet), new RegExp(`Missing fields: ${key}`));
  }
  for (const extra of ["PA_Title", "Extra", "__proto__", Symbol("extra")]) {
    const worksheet = minimalWorksheet();
    Object.defineProperty(worksheet, extra, { value: "not permitted", enumerable: true });
    assert.throws(() => assertWorksheet(worksheet), /Unexpected fields/);
  }
  assert.throws(() => assertWorksheet(Object.create(minimalWorksheet())), /plain object/);
});

test("all fields require nonblank primitive strings, not nested or coercible values", () => {
  const invalidValues = ["", " \t\r\n", "\u00A0", null, undefined, 0, false, [], {}, new String("text")];
  for (const key of FIELD_KEYS) {
    for (const value of invalidValues) {
      assert.throws(
        () => assertWorksheet({ ...minimalWorksheet(), [key]: value }),
        new RegExp(`${key} must be a nonempty plain string`),
      );
    }
  }
});

test("accessors are rejected without executing them, and hidden fields are rejected", () => {
  const worksheet = minimalWorksheet();
  let reads = 0;
  Object.defineProperty(worksheet, "Notes", {
    enumerable: true,
    get() { reads++; return "not a plain value"; },
  });
  assert.throws(() => assertWorksheet(worksheet), /Notes.*accessor/);
  assert.equal(reads, 0);
  const hidden = minimalWorksheet();
  Object.defineProperty(hidden, "Notes", { value: "hidden", enumerable: false });
  assert.throws(() => assertWorksheet(hidden), /Notes.*enumerable/);
});

test("the per-field limit permits exactly 20000 UTF-16 code units, including supplementary text", () => {
  const worksheet = minimalWorksheet();
  worksheet.Notes = "x".repeat(20000);
  assert.equal(assertWorksheet(worksheet), worksheet);
  worksheet.Notes += "x";
  assert.throws(() => assertWorksheet(worksheet), /Notes.*20000/);
  worksheet.Notes = "\u{1F308}".repeat(10000);
  assert.equal(worksheet.Notes.length, 20000);
  assert.equal(assertWorksheet(worksheet), worksheet);
  worksheet.Notes += "\u{1F308}";
  assert.throws(() => assertWorksheet(worksheet), /Notes.*20000/);
});

test("the aggregate limit permits exactly 80000 and rejects 80001 characters", () => {
  const worksheet = minimalWorksheet();
  for (const key of FIELD_KEYS.slice(0, 3)) worksheet[key] = "x".repeat(20000);
  worksheet.Authors = "x".repeat(20000 - (FIELD_KEYS.length - 4));
  assert.equal(Object.values(worksheet).reduce((total, text) => total + text.length, 0), 80000);
  assert.equal(assertWorksheet(worksheet), worksheet);
  worksheet.Authors += "x";
  assert.throws(() => assertWorksheet(worksheet), /total 80000/);
});

test("XML 1.0 disallowed controls, noncharacters, and unpaired surrogates are rejected", () => {
  const invalid = [
    ...Array.from({ length: 32 }, (_, i) => i)
      .filter((code) => ![9, 10, 13].includes(code))
      .map((code) => String.fromCharCode(code)),
    "\uFFFE", "\uFFFF", "\uD800", "\uDC00", "\uD800x", "x\uDC00", "\uDC00\uD800",
  ];
  for (const text of invalid) {
    assert.throws(
      () => assertWorksheet({ ...minimalWorksheet(), Notes: `before${text}after` }),
      /Notes.*invalid XML 1.0.*unpaired surrogate/,
    );
  }
  const valid = "Tab\tline\nreturn\r & < > \" ' \u00E9 \u4E2D \u007F \u0085 \u{1F308} \u{10FFFF}";
  assert.equal(assertWorksheet({ ...minimalWorksheet(), Notes: valid }).Notes, valid);
});

test("blank, punctuation-only, link-only, and link-wrapper sources are not usable", () => {
  const longUrl = `https://example.invalid/${"descriptive-but-only-a-url/".repeat(200)}`;
  for (const source of [
    null, undefined, 12, {}, [], "", " \r\n\t", "--- ... !!!", "\u2022",
    "https://example.invalid/guide", longUrl,
    "http://example.invalid/a\nhttps://example.invalid/b",
    "<https://example.invalid/guide>", "www.example.invalid/guide",
    "mailto:reader@example.invalid", "file:///example/guide.txt",
    "[Read the complete workshop guide](https://example.invalid/guide)",
    "[Guide](https://example.invalid/guide \"Workshop guide\")",
    "[Guide][reference]\n[reference]: https://example.invalid/guide",
    '<a href="https://example.invalid/guide">Workshop guide</a>',
    "Text with a bad control: \u0000",
  ]) {
    assert.equal(hasUsableSource(source), false, `Unexpected usable source: ${String(source).slice(0, 100)}`);
  }
});

test("short substantive text and text with optional links are usable without a length threshold", () => {
  for (const source of [
    "Sort cards.", "Count 3 tokens.", "\u5206\u985E\u5361\u7247",
    "Sort cards. https://example.invalid/instructions",
    "https://example.invalid/instructions\nSort cards.",
    "Count the cards using [this guide](https://example.invalid/guide).",
  ]) {
    assert.equal(hasUsableSource(source), true);
  }
  assert.ok("Sort cards.".length < 50);
});

test("fixture replay clones known fields and never pretends to extract from arbitrary source text", () => {
  const first = createSampleDraft(SAMPLES[0]);
  const second = createSampleDraft(SAMPLES[0]);
  assert.deepEqual(first, SAMPLES[0].fields);
  assert.notEqual(first, SAMPLES[0].fields);
  assert.notEqual(first, second);
  first.Notes = "A local review edit.";
  assert.equal(second.Notes, SAMPLES[0].fields.Notes);
  const changedSource = { ...SAMPLES[0], source: "A different sentence, not an extraction request." };
  assert.deepEqual(createSampleDraft(changedSource), SAMPLES[0].fields);
  assert.throws(() => createSampleDraft({ source: "Sort three cards." }), /plain object/);
});

test("retrieval failure stops replay before reading the sample or returning fallback fields", () => {
  let reads = 0;
  const sample = { get source() { reads++; throw new Error("Source must not be read."); } };
  for (const retrievalAvailable of [false, null, 0, 1, "true"]) {
    assert.throws(() => createSampleDraft(sample, { retrievalAvailable }), /retrieval failed/);
  }
  assert.equal(reads, 0);
  assert.deepEqual(createSampleDraft(SAMPLES[0], { retrievalAvailable: true }), SAMPLES[0].fields);
});

test("replay rejects absent, blank, link-only, and invalid-schema fixtures", () => {
  for (const sample of [null, undefined, [], "sample"]) {
    assert.throws(() => createSampleDraft(sample), /sample fixture/);
  }
  for (const source of [undefined, "", "  ", "https://example.invalid/source"]) {
    assert.throws(() => createSampleDraft({ source, fields: SAMPLES[0].fields }), /Usable source text/);
  }
  assert.throws(
    () => createSampleDraft({ ...SAMPLES[0], fields: { ...SAMPLES[0].fields, Notes: [] } }),
    /Notes.*plain string/,
  );
});

test("editing any one of the 17 fields preserves every other value and the original", () => {
  for (const key of FIELD_KEYS) {
    const before = createSampleDraft(SAMPLES[0]);
    const snapshot = { ...before };
    const edited = updateField(before, key, `Reviewed ${key}.`);
    assert.notEqual(edited, before);
    assert.deepEqual(Object.keys(edited), expectedKeys);
    assert.deepEqual(before, snapshot);
    for (const other of FIELD_KEYS) {
      assert.equal(edited[other], other === key ? `Reviewed ${key}.` : before[other]);
    }
  }
});

test("invalid edits and invalid starting worksheets throw without partial mutation", () => {
  const worksheet = createSampleDraft(SAMPLES[0]);
  const snapshot = { ...worksheet };
  for (const key of ["PA_Title", "Extra", "__proto__", Symbol("Notes"), null]) {
    assert.throws(() => updateField(worksheet, key, "Text"), /Unknown worksheet field/);
  }
  for (const value of ["", " ", [], {}, null, 1, "x".repeat(20001), "\uD800"]) {
    assert.throws(() => updateField(worksheet, "Notes", value), /Notes/);
  }
  assert.throws(() => updateField({ ...worksheet, Authors: "" }, "Notes", "Text"), /Authors/);
  assert.deepEqual(worksheet, snapshot);
});

test("an otherwise valid edit cannot breach the aggregate character limit", () => {
  const worksheet = minimalWorksheet();
  for (const key of FIELD_KEYS.slice(0, 3)) worksheet[key] = "x".repeat(20000);
  worksheet.Authors = "x".repeat(20000 - (FIELD_KEYS.length - 4));
  assert.throws(() => updateField(worksheet, "Notes", "xx"), /total 80000/);
  assert.equal(worksheet.Notes, "x");
});

test("all original fictional fixtures exactly match their downloadable source and expected JSON", async () => {
  assert.deepEqual(SAMPLES.map(({ id }) => id), ["workshop", "library", "photos"]);
  assert.ok(Object.isFrozen(SAMPLES));
  for (const sample of SAMPLES) {
    const [source, json] = await Promise.all([
      readFile(new URL(`../samples/${sample.id}.txt`, import.meta.url), "utf8"),
      readFile(new URL(`../samples/${sample.id}.json`, import.meta.url), "utf8"),
    ]);
    assert.equal(source, sample.source);
    assert.deepEqual(JSON.parse(json), sample.fields);
    assert.deepEqual(Object.keys(sample.fields), expectedKeys);
    assert.deepEqual(Object.keys(sample), ["id", "name", "summary", "source", "fields"]);
    assert.ok(Object.isFrozen(sample));
    assert.ok(Object.isFrozen(sample.fields));
    assert.equal(hasUsableSource(source), true);
    assert.equal(assertWorksheet(sample.fields), sample.fields);
    assert.match(source, /original, invented guide/);
    assert.match(source, /fixture replay, not live AI generation/);
    assert.match(sample.name, /Fictional/);
    assert.match(sample.fields.Notes, /Fictional fixture replay, not live AI generation/);
    for (const key of ["CourseReference", "Authors", "Contributors", "LastUpdated"]) {
      assert.equal(sample.fields[key], "TBD");
    }
    const stepCount = sample.fields.ActivitySteps.split("\n").length;
    assert.ok(stepCount >= 4 && stepCount <= 6, `${sample.id} has ${stepCount} steps`);
    assert.equal(sample.fields.SkillsBasedLearningObjectives.split("\n").length, 3);
  }
});

test("the schema matches the canonical runtime fields, nonblank strings, and XML character rules", async () => {
  const schema = JSON.parse(await readFile(new URL("../schemas/worksheet.schema.json", import.meta.url), "utf8"));
  assert.equal(schema.type, "object");
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.minProperties, 17);
  assert.equal(schema.maxProperties, 17);
  assert.deepEqual(schema.required, expectedKeys);
  assert.deepEqual(Object.keys(schema.properties), expectedKeys);
  for (const key of FIELD_KEYS) {
    const field = schema.properties[key];
    assert.equal(field.type, "string");
    assert.equal(field.minLength, 1);
    assert.equal(field.maxLength, 20000);
    assert.equal(new RegExp(field.pattern, "u").test(" \n\t"), false);
    assert.equal(new RegExp(field.pattern, "u").test("TBD"), true);
    assert.equal(field.$ref, "#/$defs/xmlText");
  }
  const xmlText = new RegExp(schema.$defs.xmlText.pattern, "u");
  for (const value of ["x\u0000", "x\u000B", "x\uFFFE", "\uD800", "\uDC00"]) {
    assert.equal(xmlText.test(value), false);
  }
  for (const value of ["TBD", "one\ntwo\tthree\rfour", "\u{1F308}", "\u4E2D\u6587"]) {
    assert.equal(xmlText.test(value), true);
  }
  assert.match(schema.$comment, /80000 UTF-16/);
});
