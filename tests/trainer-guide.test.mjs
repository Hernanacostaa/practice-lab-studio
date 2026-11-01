import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DEMO_SAMPLES } from "../src/samples.mjs";
import { FIELD_KEYS, assertTrainerGuide, createSampleDraft, updateField } from "../src/core.mjs";

const sample = DEMO_SAMPLES[0];
test("the one primary fixture has exactly two distinct required sources and 17 plain-string fields", async () => {
  assert.equal(DEMO_SAMPLES.length, 1);
  assert.deepEqual(Object.keys(sample.sources), ["assessment", "sop"]);
  assert.deepEqual(Object.keys(sample.fields), [...FIELD_KEYS]);
  assert.equal(assertTrainerGuide(sample.fields), sample.fields);
  assert.deepEqual(createSampleDraft(sample), sample.fields);
  for (const [key, source] of Object.entries(sample.sources)) {
    assert.equal(await readFile(new URL(`../samples/monitoring-${key}.txt`, import.meta.url), "utf8"), source.text);
    assert.match(source.text, /Original public portfolio example/);
    assert.doesNotMatch(source.text, /Trainer demonstration:|Learner practice:|Worksheet title:|Use this five-step outline/);
  }
  assert.match(sample.fields.ActivitySteps, /Trainer demonstration:/);
  assert.match(sample.fields.ActivitySteps, /Learner practice:/);
  assert.match(sample.fields.Notes, /Simulation only/);
  assert.match(sample.fields.Validation, /each participant meeting every criterion/);
});

test("either missing, blank, link-only or unavailable required source stops replay", () => {
  for (const key of ["assessment", "sop"]) {
    for (const text of [undefined, "", " ", "https://example.invalid/only-a-link"]) {
      assert.throws(() => createSampleDraft({
        ...sample, sources: { ...sample.sources, [key]: { text } },
      }), /Required .* unavailable or missing usable text/);
    }
    const sources = { ...sample.sources };
    delete sources[key];
    assert.throws(() => createSampleDraft({ ...sample, sources }), /Required/);
    assert.throws(() => createSampleDraft(sample, { sourceAvailability: { [key]: false } }), /Required/);
  }
  assert.throws(() => createSampleDraft({ ...sample, sources: null }), /Required/);
  const withoutSources = { ...sample };
  delete withoutSources.sources;
  assert.throws(() => createSampleDraft(withoutSources), /Required/);
});

test("the prepared demo preserves both required simulation-boundary paragraphs while allowing extra trainer notes", () => {
  for (const boundary of sample.requiredBoundaries) {
    assert.throws(() => assertTrainerGuide({
      ...sample.fields, Notes: sample.fields.Notes.replace(boundary, ""),
    }, sample.requiredBoundaries), /Keep the two required simulation-boundary/);
  }
  const edited = updateField(sample.fields, "Notes", `${sample.fields.Notes}\nAdditional fictional trainer note.`);
  assert.equal(assertTrainerGuide(edited, sample.requiredBoundaries), edited);
});

test("required instruction and boundary sections cannot be TBD; unknown metadata and duration remain permitted", () => {
  for (const key of ["TrainerGuidelines", "WhatIsNeeded", "ActivitySteps", "Validation", "Notes"]) {
    for (const text of ["TBD", "TBD.", " \nTBD\n"]) {
      assert.throws(() => assertTrainerGuide(updateField(sample.fields, key, text)), /required instructional or boundary/);
    }
  }
  for (const key of ["CourseReference", "Authors", "Contributors", "LastUpdated", "Duration"]) {
    assert.equal(sample.fields[key], "TBD");
    assert.equal(assertTrainerGuide(updateField(sample.fields, key, "TBD"))[key], "TBD");
  }
});

test("curated source connections point to exact fixture passages and canonical fields outside the schema", () => {
  const passages = new Map(Object.values(sample.sources).flatMap(({ sections }) => sections).map((section) => [section.id, section]));
  assert.equal(sample.connections.length, 4);
  for (const connection of sample.connections) {
    assert.ok(passages.has(connection.source));
    assert.ok(FIELD_KEYS.includes(connection.field));
  }
  assert.equal(Object.hasOwn(sample.fields, "connections"), false);
});
