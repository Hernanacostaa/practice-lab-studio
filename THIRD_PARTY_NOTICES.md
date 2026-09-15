# Third-party notices

The public demo bundles **docx** and its runtime dependencies to generate Word documents in the browser. They are open-source dependencies, not organizational infrastructure. Their versions and integrity hashes are recorded in `package-lock.json`.

- [docx](https://github.com/dolanmiu/docx) is distributed under the MIT License.
- Runtime transitive dependencies retain their respective notices and licenses in their npm packages.
- [esbuild](https://github.com/evanw/esbuild), [Playwright](https://github.com/microsoft/playwright), and [fflate](https://github.com/101arrowz/fflate) are development/build/test tools, not external services used by the running demo.

The production bundler preserves legal comments inline. Distribution license texts for bundled runtime packages are generated into `dist/third-party-licenses.txt` during the build and retained in the HTML as an inert license notice.

Microsoft Copilot Studio, Power Automate, SharePoint, and other product names mentioned in the optional deployment guide belong to their respective owners. This project includes no Microsoft logos, original organizational templates, or proprietary operational material and is not affiliated with or endorsed by Microsoft.
