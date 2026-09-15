import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { FIELD_KEYS } from "../src/core.mjs";
import { SAMPLES } from "../src/samples.mjs";
import { createWorksheetDocx } from "../src/document.mjs";

const destination = fileURLToPath(new URL("../samples/", import.meta.url));
await mkdir(destination, { recursive: true });
for (const sample of SAMPLES) {
  await writeFile(path.join(destination, `${sample.id}-worksheet.docx`), await createWorksheetDocx(sample.fields));
}
const placeholders = Object.fromEntries(FIELD_KEYS.map((key) => [key, `{{${key}}}`]));
await writeFile(path.join(destination, "worksheet-template.docx"), await createWorksheetDocx(placeholders));
console.log(`Generated ${SAMPLES.length} fictional Word examples and the original 17-field template.`);
