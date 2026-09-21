# Project rules

- This is an independent public portfolio adaptation of a real project the author built at Microsoft. Fictional labels apply to the replacement examples and infrastructure, not the underlying problem or project history.
- Distinguish the working project, its production-oriented redesign, the offline public demo, and proposed business metrics. Do not invent research, deployment, adoption, or impact results.
- Never add private content, credentials, tenant bindings, original organizational assets, or inherited Git history.
- Keep the 17 exact worksheet keys synchronized across schema, prompts, fixtures, UI, Word, and tests.
- The browser uses illustrative fixture replay, not a live model. Keep that distinction explicit.
- Source failures stop drafting. Do not return success-shaped fallback content.
- Keep all field values plain strings and render user text without HTML interpretation.
- Human review is required for export; pending/applied edits invalidate approval.
- The browser must run without network calls, persistence, or external runtime assets.
- Platform blueprints are not importable solution exports and are not evidence of deployment.
- Use the existing CSS theme variables and local fonts. Curated employer marks may be bundled locally for factual career identification, with provenance in THIRD_PARTY_NOTICES.md; no remote runtime assets.
- Define concrete on-screen palette values only in `src/palette.css`, shared by the portfolio, demo, and story. Component styles may reference shared tokens through semantic aliases, not create a divergent app palette.
- All three pages default to dark, regardless of system preference, and honor only valid explicit `scoutTheme=light` / `scoutTheme=dark` overrides. Preserve URL propagation without storing the selection.
- Use local Georgia / Times New Roman serif display headings (`h1` / `h2`) alongside the existing system body fonts. Preserve the approved homepage's Mexican-architecture-inspired palette and presentation; its playful voice must not obscure project evidence, formal titles, or public-release boundaries.
- Run `npm run verify` and the browser tests before publishing behavior changes.
- Inspect all generated assets and metadata; automated pattern checks do not prove public suitability.
