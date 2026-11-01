# Public-release boundaries

## What is included

The site's entry point is Hernan Acosta's personal portfolio at `index.html`. The primary combined case study and two-input demo are at `lab.html`; the secondary evidence and optional planning deep dive is at `case-study.html`. Portfolio photographs are curated personal-image derivatives, separate from the fictional training scenarios and subject to the publication review below. Locally bundled Microsoft, PayPal, and Amazon marks identify current/prior experience only; see their separate [provenance and trademark boundaries](../THIRD_PARTY_NOTICES.md#employer-identification-marks). The architecture-inspired visual theme is an artistic choice, not an assertion of personal identity or organizational branding.

Practice Lab Studio is a newly authored public adaptation of a real solution Hernan Acosta created at Microsoft. The problem identification, working version, sharing, presentations, demos, and production-oriented redesign are real project history. The sample content and infrastructure are replacements, not the original organizational assets.

The adaptation preserves reusable concepts: source grounding, a 17-field contract, four distinct prompt responsibilities, controlled orchestration, human revision, and document delivery. The public browser runtime is separate from the original implementation.

The public release uses:

- A newly invented monitoring alert / handoff simulation with a training-needs assessment and fictional SOP; older workshop assets are legacy regression fixtures.
- Pre-authored sample outputs, explicitly labeled as an illustrative replay.
- An original Word layout and template.
- Descriptive low-code blueprints with unbound configuration placeholders.
- Screenshots taken only from the public fictional demo.
- Curated personal portfolio photographs and a purpose-made social preview, re-encoded without identifying image metadata.
- A new Git repository with no inherited commit history.

## What is deliberately absent

Internal project and team names, organizational procedures, operational details, course catalogs, private staff and customer information, tenant and environment identifiers, internal URLs, support cases, telemetry, credentials, solution archives, videos, private document metadata, and screenshots of organizational systems are not part of this release. Public portfolio content does not authorize publishing additional employer or third-party material.

No original operational source document was used as a sample with a few names changed. The sample material was authored from scratch for low-risk, fictional learning scenarios.

## Portfolio image review

Only prepared derivatives belong in `assets/portfolio/`; original photographs are not copied into the repository. Workplace-equipment and office-monitor photographs are excluded. The current candidate set has the following declared contexts:

| Derivative | Intended public context |
| --- | --- |
| `headshot.webp` | Personal portrait |
| `community-speaker.webp`, `community-group.webp` | ASU career speaking and a student-event gathering |
| `mountains.webp`, `campus.webp`, `waterfall.webp`, `friends.webp` | Personal scenes, a public sculpture, and time with friends |
| `lab-preview.webp` | Screenshot of the fictional public demo, not an organizational system |
| `social-preview.png` | Purpose-made link-preview artwork, subject to the same image review |

These are publication candidates, not a record of completed permission checks. Review every final crop, caption, and inline copy for readable badges, screens, signage, location clues, and unintended disclosure. Confirm photographer rights and appropriate permission to publish recognizable people. Publicly displayed artwork may have separate rights; a public setting alone does not settle permission. Omit any image whose suitability or rights are unresolved.

Re-encoding without EXIF/XMP removes embedded metadata, not visible private information or third-party rights. Inclusion in the working tree, a clean scanner result, or a successful local build does not authorize a push or publication. Obtain the author's final approval after reviewing the finished site and social preview.

The personal-photo derivatives and their embedded copies in the social preview or built HTML are **not offered under the repository's MIT code license**. Rights remain with their respective rights holders; inclusion implies neither endorsement nor permission to reuse them. The exact photo scope and the separate treatment of the public-app screenshot `lab-preview.webp` are recorded in [personal photograph rights](../THIRD_PARTY_NOTICES.md#personal-photograph-rights). The author must confirm public-use permissions before publication.

## Data behavior

Each built site page is a self-contained HTML document. Portfolio images are embedded locally; the homepage, demo, and product-story calculator make no API calls, retrieve no remote documents, and do not send entered contents to a server. There is no analytics, local storage, session storage, or cookie-based application state. Navigation between pages is a normal document request; only the selected color theme is passed in the URL. The separate social-preview image is available to link-preview services but is not fetched by page code.

Field content remains in the current page's memory until the page is reset or closed. The lab's portfolio and case-study links open in new tabs to preserve that draft. A user-requested download creates a local file. GitHub Pages receives normal web-hosting requests, and following an external portfolio or documentation link leaves the local site; this is not a promise that hosting providers or external sites have no access logs.

Source extraction is a replay of authored fixtures, not an AI service. Word generation uses a bundled open-source library locally. Independent assessment and SOP failure controls exercise simulated failures, not a real document service. Curated passage connections are manually authored, not model-generated citations or proof of an internal UI.

The author reports that the trainer guide was a global standard document in a context spanning hundreds of datacenters. This is document scope, not a claim of tool deployment at those sites, universal adoption, measured savings, or certified staff. The public guide is a read-only paper simulation, not approved operational instruction. No actual internal assessments, SOPs, monitoring records, or operational advice are published.

The product story describes a real authoring problem and working solution; public role descriptions are generalized. The calculator assumptions are newly invented, and proposed pilot thresholds are not reported achievements. The interactive model reports potential reusable labor capacity, charges for unsuccessful attempts and manual fallback, and includes adjustable operating/setup costs; it does not establish cash savings, financial ROI, or actual platform pricing. Calculator values are neither persisted nor placed in navigation URLs.

## Release checks

`npm run check:public` inspects text files and XML inside generated Word documents for selected credential, tenant-link, local-path, and external-document-relationship patterns. It also checks PNG/WebP container boundaries and rejects EXIF/XMP metadata chunks or flags; PNG text and timestamp metadata are rejected as well. WebP files are restricted to lowercase, hyphen-separated image names under `assets/portfolio/`. Unexpected archives, recordings, diagnostics, and credential file types still fail the check. It is a narrow regression guard, not proof of confidentiality, valid image pixels, ownership, or permission to publish.

Before publishing changes:

1. Inspect every changed file, photograph, social preview, and screenshot, including the built inline images.
2. Confirm sample and image provenance and publication rights; remove private content rather than merely relabeling it.
3. Inspect generated documents, relationships, and image metadata. Re-encode approved images without private metadata before adding them.
4. Run the tests, build, and public-release check.
5. Inspect the staged changes and commit history. Do not import a private repository's history.
6. Obtain final author approval before pushing or publishing. Keep unresolved image or content questions out of the release.

Do not publish original exports to make these blueprints look more complete. If an optional cloud build has not been configured and tested, say so.

## Rights and claims

This is the author's personal portfolio and project case study, not an official Microsoft product or endorsement. Describing the author's contribution does not assert ownership of employer materials or permission to redistribute them. The release presents newly authored public project artifacts and reviewed personal-image derivatives rather than original organizational assets. Publishing a sanitized repository does not erase prior disclosures or copies elsewhere, and it is not a substitute for any applicable organizational approval.

The repository does not publish internal business results, customer adoption, independent audits, or production certifications. Its offline demo and unbound blueprints do not deploy a live cloud service. That public-runtime boundary does not mean the original solution was never built; production-oriented redesign is distinct from a claim of production rollout.

Professional descriptions on the personal homepage stay broad: they do not expose internal counts, business results, dates, or operational detail. Personal AI-building and community or mentorship work do not imply an official employer product, endorsement, or an unverified job title.
