"""Check public DOCX package integrity using only the Python standard library."""

from pathlib import Path
import json
import zipfile
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parent.parent
SCHEMA = json.loads((ROOT / "schemas" / "worksheet.schema.json").read_text(encoding="utf-8"))
NAMESPACES = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def validate(file):
    with zipfile.ZipFile(file) as archive:
        damaged = archive.testzip()
        if damaged:
            raise ValueError(f"{file.name}: damaged archive part {damaged}")
        for part in archive.namelist():
            if part.endswith((".xml", ".rels")):
                tree = ET.fromstring(archive.read(part))
                if part.endswith(".rels"):
                    for relationship in tree:
                        if relationship.get("TargetMode") == "External":
                            raise ValueError(f"{file.name}: external relationship in {part}")
        document = ET.fromstring(archive.read("word/document.xml"))
        text = "\n".join(node.text or "" for node in document.findall(".//w:t", NAMESPACES))
        size = document.find(".//w:sectPr/w:pgSz", NAMESPACES)
        if size is None:
            raise ValueError(f"{file.name}: missing explicit page size")
        width = size.get(f"{{{NAMESPACES['w']}}}w")
        height = size.get(f"{{{NAMESPACES['w']}}}h")
        if (width, height) != ("12240", "15840"):
            raise ValueError(f"{file.name}: unexpected page size {width} x {height}")
        if file.name == "worksheet-template.docx":
            for key in SCHEMA["required"]:
                if f"{{{{{key}}}}}" not in text:
                    raise ValueError(f"{file.name}: missing {key} placeholder")
        if not text.strip():
            raise ValueError(f"{file.name}: empty document")
    print(f"Valid package/XML/page size: {file.name}")


if __name__ == "__main__":
    documents = sorted((ROOT / "samples").glob("*.docx"))
    if len(documents) != 4:
        raise ValueError(f"Expected three examples and one template, found {len(documents)}.")
    for document in documents:
        validate(document)
