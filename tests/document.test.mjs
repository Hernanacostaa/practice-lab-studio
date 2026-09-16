import test from "node:test";
import assert from "node:assert/strict";
import { strFromU8, unzipSync } from "fflate";
import { FIELD_KEYS, FIELD_LABELS, createSampleDraft, updateField } from "../src/core.mjs";
import { createWorksheetDocx } from "../src/document.mjs";
import { SAMPLES } from "../src/samples.mjs";

function decodeXml(text) {
  const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(parseInt(entity.slice(1), 10));
    return entities[entity];
  });
}

function paragraphs(xml) {
  return Array.from(xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g), ([paragraph]) => ({
    xml: paragraph,
    text: Array.from(paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g), ([, text]) => decodeXml(text)).join(""),
  }));
}

async function unpack(worksheet) {
  const bytes = await createWorksheetDocx(worksheet);
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.byteLength > 1000);
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4B);
  const entries = unzipSync(bytes);
  return Object.fromEntries(Object.entries(entries)
    .filter(([name]) => name.endsWith(".xml") || name.endsWith(".rels"))
    .map(([name, content]) => [name, strFromU8(content)])
    .concat([["entryNames", Object.keys(entries)]]));
}

function assertLocalPackage(parts) {
  for (const required of [
    "[Content_Types].xml", "_rels/.rels", "docProps/core.xml", "docProps/app.xml",
    "word/document.xml", "word/_rels/document.xml.rels", "word/styles.xml",
    "word/numbering.xml", "word/settings.xml",
  ]) {
    assert.ok(parts[required], `Missing package part: ${required}`);
  }
  assert.match(parts["[Content_Types].xml"], /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document\.main\+xml/);
  for (const name of parts.entryNames) {
    assert.doesNotMatch(name, /vba|activex|embeddings|\.bin$/i);
    if (name.endsWith(".rels")) {
      assert.doesNotMatch(parts[name], /TargetMode\s*=\s*["']External["']/i);
      assert.doesNotMatch(parts[name], /Type=["'][^"']*\/hyperlink["']/i);
      assert.doesNotMatch(parts[name], /Target=["'](?:https?:|file:|ftp:|mailto:|\\\\)/i);
    }
  }
  assert.doesNotMatch(parts["[Content_Types].xml"], /macroEnabled|vbaProject|activeX/i);
  assert.doesNotMatch(parts["word/document.xml"], /<w:(?:hyperlink|altChunk|object|attachedTemplate)\b/);
}

for (const sample of SAMPLES) {
  test(`${sample.id}: the Word document contains every label and full field content in order`, async () => {
    const worksheet = createSampleDraft(sample);
    const snapshot = { ...worksheet };
    const parts = await unpack(worksheet);
    assertLocalPackage(parts);
    const body = paragraphs(parts["word/document.xml"]);
    const headings = body.filter(({ xml }) => /<w:pStyle w:val="Heading1"\s*\/>/.test(xml));
    assert.deepEqual(headings.map(({ text }) => text), FIELD_KEYS.map((key) => FIELD_LABELS[key]));
    let cursor = -1;
    for (const key of FIELD_KEYS) {
      const index = body.findIndex(({ text }, i) => i > cursor && text === FIELD_LABELS[key]);
      assert.ok(index > cursor, `Missing or out-of-order label ${key}`);
      const lines = worksheet[key].split(/\r\n|\r|\n/);
      assert.deepEqual(body.slice(index + 1, index + 1 + lines.length).map(({ text }) => text), lines, key);
      cursor = index + lines.length;
    }
    assert.equal(body.filter(({ text }) => text === worksheet.PATitle).length, 1);
    assert.equal(body.filter(({ text }) => text === worksheet.PASubtitle).length, 1);
    assert.ok(body.some(({ text }) => text === "From source documents to training exercises"));
    assert.match(body.map(({ text }) => text).join("\n"), /FICTIONAL DEMO.*not live AI/);
    assert.ok(body.some(({ text }) => text.startsWith("Source: ")));
    assert.ok(body.some(({ text }) => text.startsWith("Reviewer: TBD. Review date: TBD.")));
    assert.deepEqual(worksheet, snapshot);
  });
}

test("Word uses US Letter, one-inch margins, Arial 11-point body text, and real headings", async () => {
  const parts = await unpack(SAMPLES[0].fields);
  const document = parts["word/document.xml"];
  const pageSize = document.match(/<w:pgSz\b[^>]*\/>/)?.[0];
  assert.ok(pageSize);
  assert.match(pageSize, /w:w="12240"/);
  assert.match(pageSize, /w:h="15840"/);
  const margins = document.match(/<w:pgMar\b[^>]*\/>/)?.[0];
  assert.ok(margins);
  for (const side of ["top", "right", "bottom", "left"]) {
    assert.match(margins, new RegExp(`w:${side}="1440"`));
  }
  const styles = parts["word/styles.xml"];
  const defaults = styles.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/)?.[0];
  assert.ok(defaults);
  assert.match(defaults, /<w:rFonts\b[^>]*w:ascii="Arial"/);
  assert.match(defaults, /<w:sz w:val="22"\s*\/>/);
  const styleIds = Array.from(styles.matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"/g), ([, id]) => id);
  assert.equal(new Set(styleIds).size, styleIds.length, "Style identifiers must not be duplicated.");
  const headingStyle = styles.match(/<w:style\b[^>]*w:styleId="Heading1"[^>]*>[\s\S]*?<\/w:style>/)?.[0];
  assert.ok(headingStyle);
  assert.match(headingStyle, /<w:outlineLvl w:val="0"\s*\/>/);
  assert.match(headingStyle, /<w:keepNext\b/);
  assert.match(document, /<w:pStyle w:val="Title"\s*\/>/);
  assert.match(document, /<w:pStyle w:val="Subtitle"\s*\/>/);
});

test("each list line is its own numbered paragraph with a real bullet definition", async () => {
  const sample = SAMPLES[0];
  const parts = await unpack(sample.fields);
  const body = paragraphs(parts["word/document.xml"]);
  const listKeys = ["TrainerGuidelines", "WhatIsNeeded", "SkillsBasedLearningObjectives", "ActivitySteps", "Validation"];
  const listParagraphs = body.filter(({ xml }) => xml.includes("<w:numPr>"));
  const expectedItems = listKeys.flatMap((key) => sample.fields[key].split("\n"));
  assert.deepEqual(listParagraphs.map(({ text }) => text), expectedItems);
  assert.match(parts["word/numbering.xml"], /<w:numFmt w:val="bullet"\s*\/>/);
  for (const item of listParagraphs) {
    assert.match(item.xml, /<w:ilvl w:val="0"\s*\/>/);
    assert.match(item.xml, /<w:numId w:val="\d+"\s*\/>/);
    assert.doesNotMatch(item.text, /[\r\n\u2022]/);
  }
});

test("the footer contains actual PAGE and NUMPAGES fields, not fixed page numbers", async () => {
  const parts = await unpack(SAMPLES[0].fields);
  const footerName = parts.entryNames.find((name) => /^word\/footer\d+\.xml$/.test(name));
  assert.ok(footerName);
  assert.match(parts[footerName], /<w:instrText[^>]*>\s*PAGE\s*<\/w:instrText>/);
  assert.match(parts[footerName], /<w:instrText[^>]*>\s*NUMPAGES\s*<\/w:instrText>/);
  assert.match(parts[footerName], /Fictional demo/);
  assert.match(parts["word/_rels/document.xml.rels"], /\/footer["']/);
  assert.match(parts["word/document.xml"], /<w:footerReference\b/);
});

test("XML-like edits, quotes, Unicode, and URLs stay escaped plain text with no external relationships", async () => {
  const fields = Object.fromEntries(FIELD_KEYS.map((key) => [
    key,
    `${key}: <injected attribute="quoted"> & 'literal' \u00E9 \u4E2D \u{1F308} https://example.invalid/?a=1&b=2`,
  ]));
  const parts = await unpack(fields);
  assertLocalPackage(parts);
  const document = parts["word/document.xml"];
  assert.match(document, /&lt;injected/);
  assert.match(document, /&amp;/);
  assert.doesNotMatch(document, /<injected\b/);
  const text = paragraphs(document).map((paragraph) => paragraph.text);
  for (const key of FIELD_KEYS) assert.ok(text.includes(fields[key]), `Escaping changed ${key}`);
  assert.doesNotMatch(parts["docProps/core.xml"], /example\.invalid|injected/);
});

test("all supported newline forms become separate paragraphs, including empty lines", async () => {
  const worksheet = updateField(SAMPLES[0].fields, "Notes", "First & line\r\nSecond <line>\rThird\n\nFifth");
  const parts = await unpack(worksheet);
  const body = paragraphs(parts["word/document.xml"]);
  const index = body.findIndex(({ text }) => text === FIELD_LABELS.Notes);
  assert.deepEqual(body.slice(index + 1).map(({ text }) => text), [
    "First & line", "Second <line>", "Third", "", "Fifth",
  ]);
  for (const [, text] of parts["word/document.xml"].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)) {
    assert.doesNotMatch(text, /[\r\n]/);
  }
});

test("document properties use neutral project metadata, never worksheet identities or local paths", async () => {
  const worksheet = updateField(SAMPLES[0].fields, "Authors", "Fictional reviewer alias");
  const parts = await unpack(worksheet);
  const core = parts["docProps/core.xml"];
  assert.match(core, /<dc:creator>Practice Lab Studio<\/dc:creator>/);
  assert.match(core, /<cp:lastModifiedBy>Practice Lab Studio<\/cp:lastModifiedBy>/);
  assert.match(core, /<dc:title>Practice Lab Studio - fictional training worksheet<\/dc:title>/);
  assert.doesNotMatch(core, /Fictional reviewer alias|file:|\b[A-Z]:[\\/]|\\Users\\|\/home\//i);
  assert.doesNotMatch(parts["docProps/app.xml"], /Fictional reviewer alias|file:|\b[A-Z]:[\\/]|\\Users\\|\/home\//i);
});

test("export validates first and rejects invalid fields rather than silently repairing them", async () => {
  for (const invalid of [
    null,
    { ...SAMPLES[0].fields, PA_Title: "Wrong key" },
    { ...SAMPLES[0].fields, Notes: [] },
    { ...SAMPLES[0].fields, Notes: "" },
    { ...SAMPLES[0].fields, Notes: "bad\u0000text" },
    { ...SAMPLES[0].fields, Notes: "\uD800" },
    { ...SAMPLES[0].fields, Notes: "x".repeat(20001) },
  ]) {
    await assert.rejects(createWorksheetDocx(invalid), Error);
  }
});

test("a field at the permitted size exports completely, without clipping its stored content", async () => {
  const longNote = `${"x".repeat(19996)}END!`;
  assert.equal(longNote.length, 20000);
  const worksheet = updateField(SAMPLES[0].fields, "Notes", longNote);
  const parts = await unpack(worksheet);
  assert.ok(paragraphs(parts["word/document.xml"]).some(({ text }) => text === longNote));
});
