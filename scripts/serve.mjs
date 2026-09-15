import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(new URL("../dist/index.html", import.meta.url));
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("PORT must be an integer between 1024 and 65535.");
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname !== "/" && pathname !== "/index.html") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }
  try {
    const content = await readFile(file);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end(content);
  } catch (error) {
    console.error(`Unable to serve demo: ${error.message}`);
    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("Demo build unavailable. Run npm run build first.");
  }
});
server.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
server.listen(port, "127.0.0.1", () => console.log(`Practice Lab Studio: http://127.0.0.1:${port}`));
