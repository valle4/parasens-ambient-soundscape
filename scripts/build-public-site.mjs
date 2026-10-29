import { build } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const mode = process.argv.includes("--development") ? "development" : "production";
await build({ mode });
const template = await readFile("dist/index.html", "utf8");
if (!template.includes('<div id="root"></div>')) throw new Error("Missing HTML rendering outlet.");
const version = createHash("sha256").update(template).digest("hex").slice(0, 16);
await build({
  mode,
  define: {
    __HTML_TEMPLATE__: JSON.stringify(template),
    __RENDER_VERSION__: JSON.stringify(version),
  },
  ssr: { target: "webworker", noExternal: true },
  build: {
    ssr: "src/server/worker.tsx",
    outDir: "dist",
    emptyOutDir: false,
    copyPublicDir: false,
    minify: true,
    rollupOptions: { output: { entryFileNames: "_worker.js", inlineDynamicImports: true } },
  },
});
// Only homepage requests spend Function invocations. Portal and static assets
// keep the existing Pages SPA routing, without a server-rendered music list.
await writeFile("dist/_routes.json", JSON.stringify({ version: 1, include: ["/", "/index.html"], exclude: [] }));
