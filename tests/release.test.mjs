import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FIELD_KEYS } from "../src/core.mjs";
import { SAMPLES } from "../src/samples.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

test("public schema describes exactly the runtime keys with string values", async () => {
  const schema = JSON.parse(await readFile(path.join(root, "schemas", "worksheet.schema.json"), "utf8"));
  assert.deepEqual(Object.keys(schema.properties).sort(), [...FIELD_KEYS].sort());
  assert.deepEqual([...schema.required].sort(), [...FIELD_KEYS].sort());
  assert.equal(schema.additionalProperties, false);
  for (const field of FIELD_KEYS) assert.equal(schema.properties[field].type, "string");
});

test("sample identifiers are stable and all content is explicitly fictional", () => {
  assert.deepEqual(SAMPLES.map(({ id }) => id), ["workshop", "library", "photos"]);
  for (const sample of SAMPLES) {
    assert.match(`${sample.source} ${sample.fields.Notes}`, /fictional/i);
    assert.ok(sample.source.length > 100);
  }
});

test("documentation relative links point to actual public files", async () => {
  const docs = (await readdir(path.join(root, "docs"))).filter((name) => name.endsWith(".md"));
  const files = ["README.md", "THIRD_PARTY_NOTICES.md", ...docs.map((name) => path.join("docs", name))];
  const failures = [];
  for (const filename of files) {
    const content = await readFile(path.join(root, filename), "utf8");
    for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = match[1].split("#")[0];
      if (!target || /^(?:https?:|mailto:)/i.test(target)) continue;
      try {
        await readFile(path.resolve(root, path.dirname(filename), target));
      } catch (error) {
        failures.push(`${filename}: ${target} (${error.code})`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test("page declares local-only demo and blocks network connections", async () => {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  assert.match(html, /No live AI is running here/);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+(?:stylesheet|preconnect)/i);
  const source = await readFile(path.join(root, "src", "app.mjs"), "utf8");
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\s*[.(]/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
});

test("platform blueprints are unbound specifications with the same 17-field contract", async () => {
  const load = async (name) => JSON.parse(await readFile(path.join(root, "platform", name), "utf8"));
  const topic = await load("topic-blueprint.json");
  const flow = await load("flow-blueprint.json");
  for (const blueprint of [topic, flow]) {
    assert.equal(blueprint.requires_manual_configuration, true);
    assert.equal(blueprint.native_import_package, false);
    assert.deepEqual(blueprint.runtime_contract.field_keys, [...FIELD_KEYS]);
    assert.equal(blueprint.runtime_contract.key_count, 17);
    assert.equal(blueprint.runtime_contract.value_type, "string");
    for (const binding of Object.values(blueprint.bindings)) assert.match(binding, /^\$\{[A-Z_]+\}$/);
  }
  assert.equal(topic.configuration.topic_inputs.SearchQuery.type, "string");
  assert.equal(topic.configuration.action_bindings.ExtractPA.inputs.SourceContent, "${Topic.SearchQuery}");
  assert.deepEqual(Object.keys(topic.configuration.action_bindings.EditPA.inputs), ["SourceContent", "CurrentJSON", "EditRequest"]);
  const generation = flow.configuration.actions.find(({ id }) => id === "run_generate_prompt");
  assert.deepEqual(Object.keys(generation.inputs), [...FIELD_KEYS]);
  for (const key of FIELD_KEYS) assert.equal(generation.inputs[key], `\${ParsedWorksheet.${key}}`);
  assert.equal(flow.configuration.security_and_delivery.connections_prebound, false);
  const ids = new Set(topic.configuration.states.map(({ id }) => id));
  for (const state of topic.configuration.states) {
    for (const target of Object.values(state.transitions || {})) {
      assert.ok(ids.has(target), `Unknown topic state ${target}, referenced by ${state.id}`);
    }
  }
});

test("prompt input tokens retain the exact field and grounding contracts", async () => {
  const expected = {
    ExtractPA: ["SourceContent"],
    EditPA: ["SourceContent", "CurrentJSON", "EditRequest"],
    FormatPreview: ["CurrentJSON"],
    GeneratePA: [...FIELD_KEYS],
  };
  for (const [name, keys] of Object.entries(expected)) {
    const text = await readFile(path.join(root, "platform", "prompts", `${name}.txt`), "utf8");
    const tokens = Array.from(text.matchAll(/<<INSERT TEXT INPUT TOKEN: (\w+)>>/g), (match) => match[1]);
    assert.deepEqual(tokens, keys);
  }
});
