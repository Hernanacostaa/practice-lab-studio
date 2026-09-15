import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
} from "docx";
import { FIELD_KEYS, FIELD_LABELS, assertWorksheet } from "./core.mjs";

const listFields = new Set([
  "TrainerGuidelines",
  "WhatIsNeeded",
  "SkillsBasedLearningObjectives",
  "ActivitySteps",
  "Validation",
]);
const listReference = "practice-worksheet-lists";

function fieldParagraphs(key, value) {
  return value.split(/\r\n|\r|\n/).map((line) => new Paragraph({
    ...(key === "PATitle" ? { heading: HeadingLevel.TITLE } : {}),
    ...(key === "PASubtitle" ? { style: "Subtitle" } : {}),
    ...(listFields.has(key) && line.trim()
      ? { numbering: { reference: listReference, level: 0 } }
      : {}),
    children: [new TextRun({ text: line })],
  }));
}

/** Build a new, local-only document; URLs remain ordinary text, never relationships. */
export async function createWorksheetDocx(worksheet) {
  assertWorksheet(worksheet);
  const children = [
    new Paragraph({ style: "PracticeBrand", text: "Practice Lab Studio" }),
    new Paragraph({ text: "Workshop guides to practical activity worksheets" }),
    new Paragraph({
      style: "PracticeNotice",
      text: "FICTIONAL DEMO - Original portfolio fixtures, not live AI output or verified operating instructions. Human review is required. Manual edits must be checked against the source; export is not evidence of approval.",
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Source: ", bold: true }),
        new TextRun("See Documentation and references below. Provenance verification: TBD."),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Reviewer: ", bold: true }),
        new TextRun("TBD. Review date: TBD. Complete these details during human review."),
      ],
    }),
  ];
  for (const key of FIELD_KEYS) {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, text: FIELD_LABELS[key] }),
      ...fieldParagraphs(key, worksheet[key]),
    );
  }

  const document = new Document({
    creator: "Practice Lab Studio",
    lastModifiedBy: "Practice Lab Studio",
    title: "Practice Lab Studio - fictional practical activity worksheet",
    subject: "Fictional workshop guide worksheet for human review",
    description: "Original public portfolio demonstration. No review or provenance verification is implied.",
    keywords: "fictional, demo, practical activity",
    revision: 1,
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 22, color: "202B35" },
          paragraph: { spacing: { after: 120, line: 276 } },
        },
        title: {
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: "Arial", size: 44, bold: true, color: "111827" },
          paragraph: { spacing: { before: 0, after: 180 }, keepNext: true },
        },
        heading1: {
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: "Arial", size: 22, bold: true, color: "1D615E" },
          paragraph: {
            outlineLevel: 0,
            keepNext: true,
            spacing: { before: 240, after: 80 },
          },
        },
      },
      paragraphStyles: [
        {
          id: "Subtitle",
          name: "Subtitle",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: "Arial", size: 24, color: "485566" },
          paragraph: { spacing: { after: 180 }, keepNext: true },
        },
        {
          id: "PracticeBrand",
          name: "Practice brand",
          basedOn: "Normal",
          next: "Normal",
          run: { font: "Arial", size: 22, bold: true, color: "1D615E" },
          paragraph: {
            keepNext: true,
            spacing: { after: 180 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 8, color: "1D615E", space: 8 },
            },
          },
        },
        {
          id: "PracticeNotice",
          name: "Fictional demo notice",
          basedOn: "Normal",
          next: "Normal",
          run: { font: "Arial", size: 22, color: "485566" },
          paragraph: { spacing: { after: 180 } },
        },
      ],
    },
    numbering: {
      config: [{
        reference: listReference,
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: {
            run: { font: "Arial", size: 22 },
            paragraph: { indent: { left: 360, hanging: 180 } },
          },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440,
            header: 720,
            footer: 720,
          },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun("Practice Lab Studio | Fictional demo | Page "),
              new TextRun({ children: [PageNumber.CURRENT] }),
              new TextRun(" of "),
              new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
            ],
          })],
        }),
      },
      children,
    }],
  });
  const blob = await Packer.toBlob(document);
  return new Uint8Array(await blob.arrayBuffer());
}
