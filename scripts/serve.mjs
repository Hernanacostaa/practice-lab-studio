import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const routes = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/lab.html", "lab.html"],
  ["/case-study.html", "case-study.html"],
  ["/social-preview.png", "social-preview.png"],
]);
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("PORT must be an integer between 1024 and 65535.");
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (!routes.has(pathname)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }
  try {
    const filename = routes.get(pathname);
    const file = fileURLToPath(new URL(`../dist/${filename}`, import.meta.url));
    const content = await readFile(file);
    const contentType = filename.endsWith(".png") ? "image/png" : "text/html; charset=utf-8";
    res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end(content);
  } catch (error) {
    console.error(`Unable to serve portfolio: ${error.message}`);
    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("Site build unavailable. Run npm run build first.");
  }
});
server.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
server.listen(port, "127.0.0.1", () => console.log(`Hernan Acosta portfolio: http://127.0.0.1:${port}`));
