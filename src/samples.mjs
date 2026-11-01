import workshopFields from "../samples/workshop.json" with { type: "json" };
import libraryFields from "../samples/library.json" with { type: "json" };
import photosFields from "../samples/photos.json" with { type: "json" };
import monitoringFields from "../samples/monitoring.json" with { type: "json" };
import monitoringSources from "../samples/monitoring-sources.json" with { type: "json" };
import logisticsFields from "../samples/logistics.json" with { type: "json" };
import logisticsSources from "../samples/logistics-sources.json" with { type: "json" };
import serviceDeskFields from "../samples/service-desk.json" with { type: "json" };
import serviceDeskSources from "../samples/service-desk-sources.json" with { type: "json" };
import { assertWorksheet } from "./core.mjs";

function prepareTrainerGuide({ sources: documents, fields, ...sample }) {
  const sources = Object.freeze(Object.fromEntries(Object.entries(documents).map(([key, source]) => [
    key, Object.freeze({
      ...source,
      sections: Object.freeze(source.sections.map((section) => Object.freeze(section))),
      text: source.sections.map(({ label, text }) => `${label}\n${text}`).join("\n\n") + "\n",
    }),
  ])));
  return Object.freeze({
    ...sample,
    kind: "two-input-trainer-guide",
    sources,
    source: Object.values(sources).map(({ title, text }) => `${title}\n${text}`).join("\n"),
    fields: Object.freeze(assertWorksheet(fields)),
    requiredBoundaries: Object.freeze(fields.Notes.split("\n").slice(0, 2)),
    connections: Object.freeze([
      { source: "assessment-skills", field: "SkillsBasedLearningObjectives", reason: "L&D identifies the skills the trainer needs to teach." },
      { source: "assessment-success", field: "Validation", reason: "L&D defines what each learner must demonstrate, not just what to discuss." },
      { source: "sop-record", field: "Validation", reason: "The engineer's practice records supply the facts for the expected answers." },
      { source: "sop-roles", field: "ActivitySteps", reason: "The engineer's decision rules become practice cases and feedback prompts." },
      { source: "sop-preparation", field: "WhatIsNeeded", reason: "The procedure supplies the materials and record controls." },
      { source: "sop-boundaries", field: "Notes", reason: "The procedure sets the limits of this fictional exercise." },
    ].map((connection) => Object.freeze(connection))),
  });
}

export const DEMO_SAMPLES = Object.freeze([
  prepareTrainerGuide({
    id: "logistics",
    name: "Logistics",
    summary: "Receiving clerks compare reported shipment records with an advance ship notice. A correct result may be a match, a discrepancy, or a request for missing information.",
    sources: logisticsSources,
    fields: logisticsFields,
    suggestedEdit: "Ask: Why can't 48 each be treated as 4 cases without an approved conversion?",
  }),
  prepareTrainerGuide({
    id: "service-desk",
    name: "IT service desk",
    summary: "New agents turn software issue reports into complete intake cards, apply a supplied priority matrix, and choose a practice support queue without guessing missing facts.",
    sources: serviceDeskSources,
    fields: serviceDeskFields,
    suggestedEdit: "Ask: Why isn't knowing the service enough to route an incomplete report?",
  }),
]);

// Legacy fixtures remain for regression coverage, not as alternative browser demos.
const sources = Object.freeze(Object.fromEntries(Object.entries(monitoringSources).map(([key, source]) => [
  key, Object.freeze({
    ...source,
    sections: Object.freeze(source.sections.map((section) => Object.freeze(section))),
    text: source.sections.map(({ label, text }) => `${label}\n${text}`).join("\n\n") + "\n",
  }),
])));
export const LEGACY_MONITORING_SAMPLE = Object.freeze({
  id: "monitoring",
  kind: "two-input-trainer-guide",
  name: "Fictional monitoring alert / practice handoff",
  summary: "This example covers identifying a monitoring alert and writing a practice handoff. The assessment and procedure are both fictional.",
  sources,
  source: Object.values(sources).map(({ title, text }) => `${title}\n${text}`).join("\n"),
  fields: Object.freeze(assertWorksheet(monitoringFields)),
  requiredBoundaries: Object.freeze(monitoringFields.Notes.split("\n").slice(0, 2)),
  connections: Object.freeze([
    Object.freeze({ source: "assessment-skills", field: "SkillsBasedLearningObjectives", reason: "The assessment says which skills participants need to practise." }),
    Object.freeze({ source: "sop-preparation", field: "WhatIsNeeded", reason: "The procedure lists the materials the trainer needs to prepare." }),
    Object.freeze({ source: "sop-boundaries", field: "Notes", reason: "The procedure sets the limits of the fictional exercise." }),
    Object.freeze({ source: "assessment-success", field: "Validation", reason: "The assessment defines what each participant must demonstrate." }),
  ]),
});

// JSON is the single source of expected fields; tests keep these browser-ready
// source strings byte-for-byte aligned with the downloadable text fixtures.
export const SAMPLES = Object.freeze([
  {
    id: "workshop",
    name: "Fictional workshop check-in",
    summary: "Teach new volunteers to welcome people and avoid duplicate check-ins, using a fictional roster and three made-up attendee aliases.",
    source: `FICTIONAL WORKSHOP GUIDE: PAPER-SHAPE WELCOME SESSION

This original, invented guide is for a public portfolio fixture replay, not live AI generation. It describes a pretend welcome desk for a paper-shape workshop. All attendee aliases are synthetic. Never collect real names, contact details, or attendance records.

Worksheet title: Run a fictional workshop check-in
Subtitle: Welcome synthetic attendee aliases to a paper-shape session.
Audience: New community workshop volunteers.
Practice duration: 15 minutes.
No course reference, author, contributor, or update date is supplied. Leave each of these metadata fields as TBD. No external reference is supplied.

The practice roster lists Maple, Cobalt, and Pebble, each with an empty check-in box. Set out that roster, three reusable cards bearing those aliases, a pencil, and a welcome sign for the paper-shape session.

The trainer explains that both the roster and the attendance are fictional, demonstrates one alias lookup, and lets the learner handle the remaining aliases. Pause when an alias is absent or already checked in. Ask for clarification rather than adding a record or checking someone in twice.

Use this five-step outline:
1. Arrange the welcome sign, blank practice roster, alias cards, and pencil.
2. Greet the card holder and read the synthetic alias together.
3. Find the matching roster entry and confirm that its check-in box is empty.
4. Mark one check-in and direct the card holder to the paper-shape session.
5. Repeat for the remaining cards, reconcile the three marks, and reset the roster.

The intended outcome is a welcome, a single accurate check-in, and a reconciled fictional roster without personal-information collection. Practise locating an alias, avoiding a duplicate mark, and comparing the marks with the three cards. Before the reset, each of the three aliases must have exactly one mark. Ask the learner to explain what to do with a missing alias or duplicate check-in, and confirm that no real attendee information was used.

Reference this fictional paper-shape workshop guide only. Missing metadata stays TBD. A human should review the resulting worksheet before use.
`,
    fields: workshopFields,
  },
  {
    id: "library",
    name: "Fictional board-game lending",
    summary: "Help volunteers check an invented game's contents and complete a pretend loan record without guessing missing dates.",
    source: `FICTIONAL WORKSHOP GUIDE: MOON ORCHARD LENDING PRACTICE

This original, invented guide is for a public portfolio fixture replay, not live AI generation. The community library, board game, borrower, and loan are fictional. Moon Orchard is an invented game; River is a synthetic borrower alias. Do not use real borrower information or make a real loan.

Worksheet title: Lend a board game in a fictional library
Subtitle: Practise a paper loan record with a synthetic borrower alias.
Audience: New community library volunteers.
Practice duration: 20 minutes.
No course reference, author, contributor, or update date is supplied. Leave those metadata fields as TBD. No real library policy or external reference is supplied.

Gather a pretend Moon Orchard game containing 12 route tiles and 4 star tokens, a practice inventory card listing those contents, a borrower card labelled River, a blank paper loan record, and a pencil.

The trainer explains the fictional setting and demonstrates comparing contents with the inventory card. If any piece is missing, pause the pretend loan and write down the discrepancy for review. Do not declare incomplete contents complete.

Use this five-step outline:
1. Lay out the pretend game, practice inventory card, borrower card, and blank loan record.
2. Count the 12 route tiles and 4 star tokens against the inventory card. Pause and note any discrepancy.
3. Record Moon Orchard and the synthetic alias River on the practice loan record.
4. Put TBD in both the loan-date and due-date boxes: neither dates nor a borrowing period are supplied.
5. Explain that returned contents are counted against the same inventory card, compare the record with the cards, and reset the materials.

The intended outcome is checking an invented game's contents, recording a fictional loan, and explaining the return check without inventing dates. Practise inventory comparison, synthetic-alias record completion, and flagging a missing piece or unspecified due date. The final contents must match the card, or a discrepancy must be recorded with the loan paused. The record must contain Moon Orchard, River, and TBD in both date boxes. Ask the learner to explain the return count.

Reference this fictional Moon Orchard lending guide only. Missing metadata stays TBD. A human should review the resulting worksheet before use.
`,
    fields: libraryFields,
  },
  {
    id: "photos",
    name: "Fictional photo catalogue",
    summary: "Show archive volunteers how to organize placeholder photo records while keeping unverified image rights visible. No actual photos are supplied.",
    source: `FICTIONAL WORKSHOP GUIDE: PHOTO CATALOGUE PRACTICE

This original, invented guide is for a public portfolio fixture replay, not live AI generation. This is a catalogue exercise, not a verified image collection. No actual photos are supplied. The fictional rights-note cards say public domain for the exercise only; no real licence or provenance claim has been checked. Confirm real provenance before using any real image.

Worksheet title: Organize a fictional public-domain photo catalogue
Subtitle: Practise folder choices, captions, and provenance checks with placeholders.
Audience: Beginner community archive volunteers.
Practice duration: 25 minutes.
No course reference, author, contributor, or update date is supplied. Leave those metadata fields as TBD. No external licence evidence is supplied.

Prepare placeholder filename cards for cloud-study.jpg, garden-path.jpg, and paper-sail.jpg. Also prepare fictional rights-note cards marked public domain for the exercise only, folder labels Sky, Garden, and Objects, and a blank index with original filename, folder, caption, and provenance-status columns.

The trainer distinguishes a fictional rights note from verified provenance for a real image and demonstrates one index row. Do not rename or delete originals. Leave any unsupported caption or provenance detail as TBD and flag it for review.

Use this six-step outline:
1. List the three placeholder filenames, preserving their original spellings.
2. Read each fictional rights note. Mark real-image provenance as TBD rather than inferring a verified licence.
3. Assign cloud-study.jpg to Sky, garden-path.jpg to Garden, and paper-sail.jpg to Objects.
4. Plan a working copy in each chosen folder without renaming or deleting an original.
5. Record each original filename, chosen folder, filename-based practice caption, and TBD provenance status in the index.
6. Check that every placeholder has one index row. Flag all provenance entries for review before any real-image use.

The intended outcome is organizing placeholder photo records while preserving names and making unverified provenance visible. Practise folder selection, original-name preservation, and distinguishing exercise-only notes from evidence for a real image. The completed index must list all three filenames once with the specified folders. Original filenames remain intact, no original is renamed or deleted, and all provenance-status entries remain TBD and flagged for verification.

Reference this fictional photo catalogue guide and its exercise-only rights-note cards, not an actual image collection. Missing metadata stays TBD. A human should review the resulting worksheet before use.
`,
    fields: photosFields,
  },
].map((sample) => Object.freeze({
  ...sample,
  fields: Object.freeze(assertWorksheet(sample.fields)),
})));
