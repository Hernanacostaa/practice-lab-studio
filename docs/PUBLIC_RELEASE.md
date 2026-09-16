# Public-release boundaries

## What is included

Practice Lab Studio is a newly authored public adaptation of a real solution Hernan Acosta created at Microsoft. The problem identification, working version, sharing, presentations, demos, and production-oriented redesign are real project history. The sample content and infrastructure are replacements, not the original organizational assets.

The adaptation preserves reusable concepts: source grounding, a 17-field contract, four distinct prompt responsibilities, controlled orchestration, human revision, and document delivery. The public browser runtime is separate from the original implementation.

The public release uses:

- Newly invented workshop scenarios and source documents.
- Pre-authored sample outputs, explicitly labeled as an illustrative replay.
- An original Word layout and template.
- Descriptive low-code blueprints with unbound configuration placeholders.
- Screenshots taken only from the public fictional demo.
- A new Git repository with no inherited commit history.

## What is deliberately absent

Beyond the author's name and Microsoft as the context of the work, internal project and team names, organizational procedures, operational details, course catalogs, staff and customer information, tenant and environment identifiers, internal URLs, support cases, telemetry, credentials, solution archives, videos, private document metadata, and screenshots of organizational systems are not part of this release.

No original operational source document was used as a sample with a few names changed. The sample material was authored from scratch for low-risk, fictional learning scenarios.

## Data behavior

Each site page is a self-contained HTML document. The demo and the product-story calculator make no API calls, retrieve no remote documents, and do not send entered contents to a server. There is no analytics, local storage, session storage, or cookie-based application state. Navigation between pages is a normal document request; only the selected color theme is passed in the URL.

Field content remains in the current page's memory until the page is reset or closed. A user-requested download creates a local file. GitHub Pages receives normal web-hosting requests, and clicking a GitHub documentation link navigates to GitHub; this is not a promise that the hosting provider has no access logs.

Source extraction is a replay of authored fixtures, not an AI service. Word generation uses a bundled open-source library locally. The unavailable-source control exercises a simulated failure path, not a connection to a real document service.

The product story describes a real authoring problem and working solution; public role descriptions are generalized. The calculator assumptions are newly invented, and proposed pilot thresholds are not reported achievements. The interactive model reports potential reusable labor capacity, charges for unsuccessful attempts and manual fallback, and includes adjustable operating/setup costs; it does not establish cash savings, financial ROI, or actual platform pricing. Calculator values are neither persisted nor placed in navigation URLs.

## Release checks

`npm run check:public` inspects text files and XML inside generated Word documents for selected credential, tenant-link, local-path, and external-document-relationship patterns. Unexpected archives, recordings, diagnostics, and credential file types fail the check. It is a narrow regression guard, not proof of confidentiality or ownership.

Before publishing changes:

1. Inspect every changed file and all screenshot content.
2. Confirm sample provenance and remove private content rather than merely relabeling it.
3. Inspect generated documents, relationships, and metadata.
4. Run the tests, build, and public-release check.
5. Inspect the staged changes and commit history. Do not import a private repository's history.

Do not publish original exports to make these blueprints look more complete. If an optional cloud build has not been configured and tested, say so.

## Rights and claims

This is the author's personal case study, not an official Microsoft product or endorsement. Describing the author's contribution does not assert ownership of employer materials or permission to redistribute them. The release presents newly authored public artifacts rather than original organizational assets. Publishing a sanitized repository does not erase prior disclosures or copies elsewhere, and it is not a substitute for any applicable organizational approval.

The repository does not publish internal business results, customer adoption, independent audits, or production certifications. Its offline demo and unbound blueprints do not deploy a live cloud service. That public-runtime boundary does not mean the original solution was never built; production-oriented redesign is distinct from a claim of production rollout.
