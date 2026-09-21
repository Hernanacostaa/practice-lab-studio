# Third-party notices

The public demo bundles **docx** and its runtime dependencies to generate Word documents in the browser. They are open-source dependencies, not organizational infrastructure. Their versions and integrity hashes are recorded in `package-lock.json`.

- [docx](https://github.com/dolanmiu/docx) is distributed under the MIT License.
- Runtime transitive dependencies retain their respective notices and licenses in their npm packages.
- [esbuild](https://github.com/evanw/esbuild), [Playwright](https://github.com/microsoft/playwright), and [fflate](https://github.com/101arrowz/fflate) are development/build/test tools, not external services used by the running demo.

The production bundler preserves legal comments inline. Distribution license texts for bundled runtime packages are generated into `dist/third-party-licenses.txt` during the build and retained in the HTML as an inert license notice.

Microsoft Copilot Studio, Power Automate, SharePoint, and other product names mentioned in the optional deployment guide belong to their respective owners. This project includes no original organizational templates or proprietary operational material and is not an official product of, or endorsed by, those organizations.

## Employer identification marks

The homepage uses locally bundled WebP renderings of the following public SVG marks solely to identify current and prior work experience. Wikimedia Commons' source records label these files **Public domain** and **trademarked**; copyright status does not remove trademark restrictions. Verified on September 20, 2026.

| Local derivative | Source record |
| --- | --- |
| `assets/portfolio/microsoft-logo.webp` | [Microsoft logo (2012).svg](https://commons.wikimedia.org/wiki/File:Microsoft_logo_%282012%29.svg) |
| `assets/portfolio/paypal-logo.webp` | [PayPal.svg](https://commons.wikimedia.org/wiki/File:PayPal.svg) |
| `assets/portfolio/amazon-logo.webp` | [Amazon logo.svg](https://commons.wikimedia.org/wiki/File:Amazon_logo.svg) |

The marks are not the portfolio's own branding. Their inclusion does not imply sponsorship, approval, or endorsement by Microsoft, PayPal, or Amazon and grants no trademark rights. They are embedded as static local images; no third-party asset service is contacted by the page. Brand colors and proportions are preserved.

## Personal photograph rights

The following personal-photo derivatives under `assets/portfolio/` are **not offered under the repository's MIT code license**: `headshot.webp`, `community-speaker.webp`, `community-group.webp`, `mountains.webp`, `campus.webp`, `waterfall.webp`, and `friends.webp`.

This exception also applies to those photographs when cropped, resized, encoded, or embedded in `social-preview.png` and built HTML. Embedding a photo in an otherwise MIT-licensed page does not place that photo under MIT. Rights remain with the respective rights holders; this repository grants no additional license to those photographs. Inclusion does not imply endorsement by a photographer, a depicted person or organization, or another rights holder, nor does it establish permission for reuse.

`assets/portfolio/lab-preview.webp` is a screenshot of this repository's own public application, not one of the personal photographs above. It remains separate from the personal-photo exception; the existing project-material licensing and applicable dependency notices apply.

No photographer identity or completed consent check is asserted here. Before publication, the author must confirm public-use permissions for the photographs, recognizable people, and any third-party artwork. Metadata removal and inclusion in the repository are not permission evidence. See the [public-release review requirements](docs/PUBLIC_RELEASE.md#portfolio-image-review).
