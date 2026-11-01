import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { FIELD_KEYS } from "../src/core.mjs";
import { SAMPLES } from "../src/samples.mjs";
import { inspectImageMetadata } from "../scripts/check-public.mjs";

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

test("lab page declares local-only demo and blocks network connections", async () => {
  const html = await readFile(path.join(root, "lab.html"), "utf8");
  assert.match(html, /No live AI is running here/);
  assert.doesNotMatch(html, /<footer\b/);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+(?:stylesheet|preconnect)/i);
  const source = await readFile(path.join(root, "src", "app.mjs"), "utf8");
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\s*[.(]/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
});

test("technical outline follows the public prompt and retrieval contracts without claiming deployment", async () => {
  const [html, topicText, flowText] = await Promise.all([
    readFile(path.join(root, "lab.html"), "utf8"),
    readFile(path.join(root, "platform", "topic-blueprint.json"), "utf8"),
    readFile(path.join(root, "platform", "flow-blueprint.json"), "utf8"),
  ]);
  const topic = JSON.parse(topicText);
  const flow = JSON.parse(flowText);
  assert.equal(topic.configuration.retrieval_adapter_requirements.implemented_here, false);
  for (const name of Object.keys(topic.configuration.action_bindings)) assert.ok(html.includes(name), `${name} must appear in the outline`);
  const documentPrompt = flow.configuration.actions.find(({ id }) => id === "run_generate_prompt");
  assert.ok(html.includes(documentPrompt.prompt_name));
  assert.equal(documentPrompt.output_mode, "Document (preview)");
  assert.match(html, /<figure class="architecture-flow"/);
  assert.match(html, /<ol class="technical-steps" role="list" aria-label="Trainer-guide workflow">/);
  assert.match(html, /GeneratePA<\/strong> formats the 17 approved fields into Word/);
  assert.match(html, /With connected source retrieval, it follows the RAG pattern/);
  assert.match(html, /repo leaves the reader unconfigured/);
  assert.match(html, /not an export of the original internal system/);
});

test("product story distinguishes real work, public examples, and proposed business measures", async () => {
  const html = await readFile(path.join(root, "case-study.html"), "utf8");
  assert.match(html, /Real project\. Anonymized public version\./);
  assert.match(html, /I created the underlying solution at Microsoft/);
  assert.match(html, /Inside the public demo/);
  assert.match(html, /Built a working version/);
  assert.match(html, /Shared, presented, and demoed it/);
  assert.match(html, /Redesigned for production needs/);
  assert.doesNotMatch(html, /These are illustrative personas and problem hypotheses/);
  assert.match(html, new RegExp(`<strong>${FIELD_KEYS.length}</strong><span>shared trainer-guide fields`));
  assert.match(html, /<strong>2<\/strong><span>required fictional sources/);
  assert.match(html, /Proposed pilot criteria&mdash;not measured results/);
  assert.match(html, /Illustrative assumptions only/);
  assert.match(html, /not revenue, profit, a staffing reduction, or cash saved/);
  assert.match(html, /No such analytics or pilot is running on this site/);
  assert.match(html, /connect-src 'none'/);
  for (const name of ["story.mjs", "business-case.mjs", "theme.mjs"]) {
    const source = await readFile(path.join(root, "src", name), "utf8");
    assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\s*[.(]/);
    assert.doesNotMatch(source, /\.innerHTML\s*=/);
  }
});

test("public entry points describe a real project without reclassifying its examples as real data", async () => {
  for (const filename of ["README.md", path.join("docs", "CASE_STUDY.md"), path.join("docs", "PUBLIC_RELEASE.md")]) {
    const content = await readFile(path.join(root, filename), "utf8");
    assert.match(content, /Microsoft/);
    assert.match(content, /real (?:work|solution|project|authoring)/i);
    assert.match(content, /fictional/i);
    assert.doesNotMatch(content, /is a fictional portfolio project|fictionalized personas/);
  }
  const html = await readFile(path.join(root, "lab.html"), "utf8");
  assert.match(html, /AI-drafted training guides/);
  assert.match(html, /I built this at Microsoft/);
  assert.match(html, /training-needs assessments and operating procedures/);
  assert.match(html, /AI combined the source material into a draft/);
  assert.match(html, /automation assembled the document for review/);
  assert.match(html, /No live AI is running here\. Each source pair and guide is a prepared example/);
  assert.match(html, /Two real industry tasks, with fictional documents and records/);
  assert.match(html, /not projects I deployed in these industries/);
  assert.doesNotMatch(html, /Ready-to-run practice|practical activity worksheet/);
});

test("all pages default to dark before first paint and honor only valid explicit theme overrides", async () => {
  for (const filename of ["index.html", "lab.html", "case-study.html"]) {
    const html = await readFile(path.join(root, filename), "utf8");
    const script = html.match(/<script>([\s\S]*?)<\/script>/);
    assert.ok(script, `${filename} needs an initial theme script`);
    for (const system of ["light", "dark"]) {
      for (const override of [null, "", "light", "dark", "invalid", "DARK"]) {
        let actual;
        runInNewContext(script[1], {
          URLSearchParams,
          window: {
            location: { search: override === null ? "" : `?scoutTheme=${override}` },
            matchMedia: () => ({ matches: system === "dark" }),
          },
          document: {
            documentElement: { setAttribute: (name, value) => { assert.equal(name, "data-theme"); actual = value; } },
          },
        });
        assert.equal(actual, override === "light" || override === "dark" ? override : "dark",
          `${filename}: system ${system}, override ${override}`);
      }
    }
  }
});

test("shared screen colors live in one palette while project components use semantic aliases", async () => {
  const palette = await readFile(path.join(root, "src", "palette.css"), "utf8");
  assert.match(palette, /:root\s*\{/);
  assert.match(palette, /html\[data-theme="dark"\]\s*\{/);
  assert.match(palette, /--cp-secondary:\s*var\(--cp-text-muted\)/);
  assert.match(palette, /--cp-secondary:\s*var\(--cp-text-soft\)/);
  assert.doesNotMatch(palette, /@import/i);
  for (const filename of ["portfolio.css", "style.css", "lab.css", "story.css"]) {
    const css = await readFile(path.join(root, "src", filename), "utf8");
    const screen = css.split("@media print")[0];
    assert.doesNotMatch(screen, /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?)\(/i, `${filename} must use the shared screen palette`);
    assert.doesNotMatch(css, /@import/i);
    for (const [, token, value] of screen.matchAll(/(--cp-[a-z-]+)\s*:\s*([^;]+);/g)) {
      assert.match(value.trim(), /^var\(--cp-[a-z-]+\)$/, `${filename}: ${token} must reference a shared token`);
    }
    if (filename === "style.css") {
      assert.match(css, /--cp-accent-fill:\s*var\(--cp-accent\)/);
      assert.match(css, /--cp-accent-fill-hover:\s*var\(--cp-accent-hover\)/);
      assert.match(css, /--cp-control-border:\s*var\(--cp-border-strong\)/);
      assert.match(css, /h1, h2 \{ font-family: Georgia, "Times New Roman", serif;/);
    }
  }
});

test("project navigation keeps the lab separate from the portfolio and protects in-memory drafts", async () => {
  const [lab, story] = await Promise.all(["lab.html", "case-study.html"].map((filename) => readFile(path.join(root, filename), "utf8")));
  const outgoing = [...lab.matchAll(/<a\b[^>]*href="(?:index|case-study)\.html"[^>]*>/g)];
  assert.equal(outgoing.length, 3);
  for (const [link] of outgoing) {
    assert.match(link, /\bdata-site-link\b/);
    assert.match(link, /\btarget="_blank"/);
    assert.match(link, /\brel="noopener noreferrer"/);
  }
  assert.match(lab, /About Hernan/);
  assert.match(story, /class="brand" href="lab\.html" data-site-link/);
  assert.match(story, /href="index\.html" data-site-link>About Hernan/);
  assert.equal([...story.matchAll(/href="lab\.html#demo" data-site-link/g)].length, 4);
  assert.doesNotMatch(story, /href="index\.html#demo"/);
});

test("image release checks reject PNG EXIF, XMP and text metadata without weakening container checks", async () => {
  const png = await readFile(path.join(root, "docs", "demo-preview.png"));
  assert.deepEqual(inspectImageMetadata(png, ".png"), []);
  for (const type of ["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]) {
    const data = Buffer.from("public test metadata");
    const chunk = Buffer.alloc(12 + data.length);
    chunk.writeUInt32BE(data.length);
    chunk.write(type, 4, 4, "ascii");
    data.copy(chunk, 8);
    const modified = Buffer.concat([png.subarray(0, -12), chunk, png.subarray(-12)]);
    assert.ok(inspectImageMetadata(modified, ".png").includes(`PNG ${type} metadata must be removed`));
  }
  assert.ok(inspectImageMetadata(Buffer.from("not an image"), ".png").includes("invalid PNG signature"));
  assert.ok(inspectImageMetadata(png.subarray(0, -1), ".png").includes("truncated PNG chunk"));
  assert.ok(inspectImageMetadata(Buffer.concat([png, Buffer.from([0])]), ".png").includes("invalid PNG end chunk or trailing data"));
});

test("image release checks reject WebP EXIF/XMP chunks and flags, including after padded chunks", () => {
  const chunk = (type, data = Buffer.alloc(0)) => {
    const bytes = Buffer.alloc(8 + data.length + (data.length % 2));
    bytes.write(type, 0, 4, "ascii");
    bytes.writeUInt32LE(data.length, 4);
    data.copy(bytes, 8);
    return bytes;
  };
  const container = (...chunks) => {
    const data = Buffer.concat([Buffer.from("WEBP"), ...chunks]);
    const header = Buffer.alloc(8);
    header.write("RIFF");
    header.writeUInt32LE(data.length, 4);
    return Buffer.concat([header, data]);
  };
  const image = chunk("VP8L", Buffer.from([0]));
  assert.deepEqual(inspectImageMetadata(container(image), ".webp"), []);
  for (const type of ["EXIF", "XMP "]) {
    assert.ok(inspectImageMetadata(container(image, chunk(type, Buffer.from([1]))), ".webp")
      .includes(`WebP ${type.trim()} metadata must be removed`));
  }
  for (const flag of [0x04, 0x08]) {
    const header = Buffer.alloc(10);
    header[0] = flag;
    assert.ok(inspectImageMetadata(container(chunk("VP8X", header), image), ".webp")
      .includes("WebP EXIF/XMP metadata flags must be removed"));
  }
  const malformed = container(image);
  malformed.writeUInt32LE(100, 16);
  assert.ok(inspectImageMetadata(malformed, ".webp").includes("truncated WebP chunk"));
  assert.ok(inspectImageMetadata(Buffer.from("not an image"), ".webp").includes("invalid WebP RIFF container"));
  assert.ok(inspectImageMetadata(container(image).subarray(0, -1), ".webp").includes("invalid WebP RIFF container"));
  assert.throws(() => inspectImageMetadata(Buffer.alloc(0), ".jpg"), /Unsupported image format/);
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
