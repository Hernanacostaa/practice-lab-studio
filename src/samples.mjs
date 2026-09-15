import workshopFields from "../samples/workshop.json" with { type: "json" };
import libraryFields from "../samples/library.json" with { type: "json" };
import photosFields from "../samples/photos.json" with { type: "json" };
import { assertWorksheet } from "./core.mjs";

// JSON is the single source of expected fields; tests keep these browser-ready
// source strings byte-for-byte aligned with the downloadable text fixtures.
export const SAMPLES = Object.freeze([
  {
    id: "workshop",
    name: "Fictional workshop check-in",
    summary: "A 15-minute welcome-desk practice using three synthetic attendee aliases. Fixture replay only.",
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
    summary: "A 20-minute paper-loan exercise for an invented game and borrower. Unspecified dates remain TBD.",
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
    summary: "A 25-minute placeholder-file exercise. No actual photos or verified public-domain assets are supplied.",
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
