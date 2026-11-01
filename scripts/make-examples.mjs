import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { FIELD_KEYS } from "../src/core.mjs";
import { DEMO_SAMPLES } from "../src/samples.mjs";
import { createWorksheetDocx } from "../src/document.mjs";

const destination = fileURLToPath(new URL("../samples/", import.meta.url));
await mkdir(destination, { recursive: true });
for (const sample of DEMO_SAMPLES) {
  await writeFile(path.join(destination, `${sample.id}-trainer-guide.docx`), await createWorksheetDocx(sample.fields));
  for (const [key, source] of Object.entries(sample.sources)) {
    await writeFile(path.join(destination, `${sample.id}-${key}.txt`), source.text);
  }
}
const placeholders = Object.fromEntries(FIELD_KEYS.map((key) => [key, `{{${key}}}`]));
await writeFile(path.join(destination, "worksheet-template.docx"), await createWorksheetDocx(placeholders));
console.log(`Generated ${DEMO_SAMPLES.length} fictional two-input trainer guide, source text copies, and the original 17-field template. Legacy examples are unchanged.`);
