import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DEMO_SAMPLES, LEGACY_MONITORING_SAMPLE } from "../src/samples.mjs";
import { FIELD_KEYS, assertTrainerGuide, createSampleDraft, updateField } from "../src/core.mjs";

test("exactly two industry scenarios are available, not the legacy monitoring example", () => {
  assert.deepEqual(DEMO_SAMPLES.map(({ id }) => id), ["logistics", "service-desk"]);
});

test("legacy monitoring sources and expected guide remain unchanged regression assets", async () => {
  const sample = LEGACY_MONITORING_SAMPLE;
  assert.deepEqual(JSON.parse(await readFile(new URL("../samples/monitoring.json", import.meta.url), "utf8")), sample.fields);
  for (const [key, source] of Object.entries(sample.sources)) {
    assert.equal(await readFile(new URL(`../samples/monitoring-${key}.txt`, import.meta.url), "utf8"), source.text);
  }
  assert.deepEqual(createSampleDraft(sample), sample.fields);
});

test("unbound platform descriptions reference both complete source pairs and their exact expected guides", async () => {
  for (const name of ["topic-blueprint", "flow-blueprint"]) {
    const blueprint = JSON.parse(await readFile(new URL(`../platform/${name}.json`, import.meta.url), "utf8"));
    assert.equal(blueprint.native_import_package, false);
    assert.equal(blueprint.requires_manual_configuration, true);
    assert.deepEqual(blueprint.configuration.sample_fixtures.cases, DEMO_SAMPLES.map(({ id }) => ({
      id,
      source_text: [`samples/${id}-assessment.txt`, `samples/${id}-sop.txt`],
      expected_worksheet: `samples/${id}.json`,
    })));
  }
});

for (const sample of DEMO_SAMPLES) {
  test(`${sample.id}: two distinct sources support 17 plain-string fields and a trainer-led guide`, async () => {
    assert.equal(sample.kind, "two-input-trainer-guide");
    assert.deepEqual(Object.keys(sample.sources), ["assessment", "sop"]);
    assert.deepEqual(Object.keys(sample.fields), [...FIELD_KEYS]);
    assert.equal(assertTrainerGuide(sample.fields), sample.fields);
    assert.deepEqual(createSampleDraft(sample), sample.fields);
    for (const [key, source] of Object.entries(sample.sources)) {
      assert.equal(await readFile(new URL(`../samples/${sample.id}-${key}.txt`, import.meta.url), "utf8"), source.text);
      assert.match(source.text, /Original public portfolio example/);
      assert.doesNotMatch(source.text, /Trainer demonstration:|Learner practice:|Worksheet title:|Use this five-step outline/);
    }
    assert.match(sample.sources.assessment.text, /Owner: Fictional L&D lead/);
    assert.match(sample.sources.sop.text, /Owner: Fictional .* engineer/);
    for (const key of ["CourseReference", "Authors", "Contributors", "LastUpdated"]) {
      assert.ok(sample.sources.assessment.text.includes(sample.fields[key]), `${key} must be explicitly supplied`);
    }
    assert.match(sample.sources.assessment.text, /Training allocation: 30 minutes/);
    assert.match(sample.fields.ActivitySteps, /Trainer demonstration:/);
    assert.match(sample.fields.ActivitySteps, /Learner practice:/);
    assert.match(sample.fields.Validation, /missed criteri(?:a|on).*another attempt/);
    assert.ok(sample.suggestedEdit.startsWith("Ask: "));
  });

  test(`${sample.id}: either missing, blank, link-only or unavailable required source stops replay`, () => {
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

  test(`${sample.id}: both source-based boundary paragraphs are required even after edits`, () => {
    assert.equal(sample.requiredBoundaries.length, 2);
    for (const boundary of sample.requiredBoundaries) {
      assert.ok(sample.sources.sop.text.includes(boundary));
      assert.throws(() => assertTrainerGuide({
        ...sample.fields, Notes: sample.fields.Notes.replace(boundary, ""),
      }, sample.requiredBoundaries), /Keep the two required simulation-boundary/);
    }
    const edited = updateField(sample.fields, "Notes", `${sample.fields.Notes}\nAdditional fictional trainer note.`);
    assert.equal(assertTrainerGuide(edited, sample.requiredBoundaries), edited);
  });

  test(`${sample.id}: instruction cannot be TBD; metadata and duration may be explicitly unknown`, () => {
    for (const key of ["TrainerGuidelines", "WhatIsNeeded", "ActivitySteps", "Validation", "Notes"]) {
      for (const text of ["TBD", "TBD.", " \nTBD\n"]) {
        assert.throws(() => assertTrainerGuide(updateField(sample.fields, key, text)), /required instructional or boundary/);
      }
    }
    for (const key of ["CourseReference", "Authors", "Contributors", "LastUpdated", "Duration"]) {
      assert.equal(assertTrainerGuide(updateField(sample.fields, key, "TBD"))[key], "TBD");
    }
  });

  test(`${sample.id}: curated connections cover both sources and stay outside the schema`, () => {
    const passages = new Set(Object.values(sample.sources).flatMap(({ sections }) => sections).map(({ id }) => id));
    assert.equal(sample.connections.length, 6);
    for (const connection of sample.connections) {
      assert.ok(passages.has(connection.source));
      assert.ok(FIELD_KEYS.includes(connection.field));
    }
    assert.equal(Object.hasOwn(sample.fields, "connections"), false);
  });
}

test("logistics: every expected case decision follows the actual ASN and reported values", () => {
  const sample = DEMO_SAMPLES.find(({ id }) => id === "logistics");
  const source = sample.sources.sop.text;
  const expected = new Map([...source.matchAll(/^Unit (\d+) \| product (\S+) \| expected (\d+) (\w+)\./gm)]
    .map(([, id, product, quantity, unit]) => [id, { product, quantity, unit }]));
  const reports = [...source.matchAll(/^(R\d) \| unit (\d+) \| product (\S+) \| reported (\d+) (\w+)\./gm)];
  assert.equal(expected.size, 3);
  assert.equal(reports.length, 4);
  const answers = sample.fields.Validation.split("\n");
  for (const [index, [, receipt, id, product, quantity, unit]] of reports.entries()) {
    const entry = expected.get(id);
    const outcome = !entry || entry.unit !== unit ? "Needs clarification"
      : entry.product !== product || entry.quantity !== quantity ? "Discrepancy" : "Matched in exercise";
    const answer = answers[index];
    assert.ok(answer.startsWith(`${receipt}: `));
    for (const fact of [id, product, `${quantity} ${unit}`, `Outcome: ${outcome}`]) assert.ok(answer.includes(fact), fact);
    if (entry) {
      assert.ok(answer.includes(`${entry.quantity} ${entry.unit} expected`));
    } else {
      assert.match(answer, /no matching entry/);
      assert.match(answer, /Do not invent expected values/);
    }
    if (outcome !== "Matched in exercise") assert.ok(answer.includes("Receiving Review"));
    if (entry && entry.unit !== unit) {
      assert.match(answer, /approved each-to-case conversion/);
      assert.match(answer, /Do not assume equality/);
    }
  }
  for (const [, , id] of reports) {
    assert.equal(id.length, 18);
    assert.equal([...id].reverse().reduce((sum, digit, index) => sum + Number(digit) * (index % 2 ? 3 : 1), 0) % 10, 0);
  }
  assert.match(sample.fields.Notes, /not issued GS1 keys/);
});

test("service desk: expected priority and queue follow the supplied matrix and completeness gate", () => {
  const sample = DEMO_SAMPLES.find(({ id }) => id === "service-desk");
  const rules = sample.sources.sop.sections[1].text;
  const matrix = new Map([...rules.matchAll(/^(Team|Individual) \+ (High|Normal) = (P\d)\./gm)]
    .map(([, impact, urgency, priority]) => [`${impact}/${urgency}`, priority]));
  const queues = new Map([...rules.matchAll(/([A-Za-z]+) -> ([A-Za-z]+ Support)/g)].map(([, service, queue]) => [service, queue]));
  assert.equal(matrix.size, 4);
  const reports = sample.sources.sop.sections[0].text.split("\n").filter((line) => /^T\d \|/.test(line));
  assert.equal(reports.length, 3);
  for (const [index, report] of reports.entries()) {
    const [id, ...parts] = report.split(" | ");
    const facts = Object.fromEntries(parts.map((part) => {
      const split = part.indexOf(": ");
      return split < 0 ? part.split(/ (.*)/s).slice(0, 2) : [part.slice(0, split), part.slice(split + 2)];
    }));
    const impact = facts["affected group"] === "one team" ? "Team" : facts["affected group"] === "one user" ? "Individual" : null;
    const urgency = facts.workaround === "none" && facts["work blocked"] === "yes." ? "High"
      : facts.workaround.includes("available") && facts["work blocked"] === "no." ? "Normal" : null;
    const answer = sample.fields.Validation.split("\n")[index];
    assert.ok(answer.startsWith(`${id}: `));
    for (const key of ["reporter", "time", "service"]) assert.ok(answer.includes(facts[key]));
    assert.ok(answer.includes("Category: Application incident"));
    if (impact && urgency) {
      for (const value of [`Impact: ${impact}`, `Urgency: ${urgency}`, `Priority: ${matrix.get(`${impact}/${urgency}`)}`, `Destination: ${queues.get(facts.service)}`]) {
        assert.ok(answer.includes(value), value);
      }
    } else {
      assert.match(answer, /Needs clarification/);
      assert.match(answer, /priority and destination remain unassigned/);
      assert.match(answer, /which group is affected.*workaround.*work is blocked/);
    }
  }
  assert.match(sample.fields.Notes, /not universal ITIL rules/);
});
