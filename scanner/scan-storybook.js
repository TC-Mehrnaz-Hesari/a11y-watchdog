import { chromium } from "playwright";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAxe, slug } from "./scan-lib.js";
import { VIEWPORTS } from "./targets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../data/scans");
const SB_STATIC = path.resolve(__dirname, "../tc-app-theme/storybook-static");
const SAMPLE_SIZE = 40;
const PORT = 6199;

// Minimal static file server for the built Storybook.
function serveStatic(root) {
  const types = {
    ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
    ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml",
    ".woff2": "font/woff2", ".woff": "font/woff", ".png": "image/png",
    ".jpg": "image/jpeg", ".ico": "image/x-icon", ".map": "application/json",
  };
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p === "/") p = "/index.html";
      const fp = path.join(root, p);
      if (!fp.startsWith(root)) { res.writeHead(403).end(); return; }
      const data = await readFile(fp);
      res.writeHead(200, { "Content-Type": types[path.extname(fp)] || "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

// Stratified sample across top-level groups.
function sampleStories(entries, n) {
  const stories = Object.values(entries).filter((v) => v.type === "story");
  const byGroup = {};
  for (const s of stories) {
    const g = s.title.split("/")[0];
    (byGroup[g] ||= []).push(s);
  }
  const groups = Object.keys(byGroup);
  const perGroup = Math.max(1, Math.floor(n / groups.length));
  const picked = [];
  for (const g of groups) {
    const list = byGroup[g];
    // even spread through the group so we hit varied components
    const step = Math.max(1, Math.floor(list.length / perGroup));
    for (let i = 0; i < list.length && picked.length < n; i += step) {
      picked.push(list[i]);
    }
  }
  return picked.slice(0, n);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const index = JSON.parse(await readFile(path.join(SB_STATIC, "index.json"), "utf8"));
  const sample = sampleStories(index.entries, SAMPLE_SIZE);
  console.log(`Sampling ${sample.length} stories across groups.`);

  const server = await serveStatic(SB_STATIC);
  const base = `http://localhost:${PORT}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop });
  const page = await ctx.newPage();

  let done = 0;
  for (const story of sample) {
    const group = story.title.split("/")[0];
    const url = `${base}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      // Wait for Storybook to finish rendering the story root.
      await page.waitForSelector("#storybook-root, #root", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(600);
      const record = await runAxe(page, {
        surface: "component-library",
        name: story.title,
        storyId: story.id,
        group,
        url: `iframe.html?id=${story.id}`,
        viewport: "desktop",
      });
      const fname = `component__${slug(story.id)}.json`;
      await writeFile(path.join(OUT_DIR, fname), JSON.stringify(record, null, 2));
      done++;
      console.log(`[${done}/${sample.length}] ${story.title} -> score ${record.score}, ${record.counts.violations} violations`);
    } catch (err) {
      console.error(`[FAIL] ${story.title}: ${err.message}`);
    }
  }

  await browser.close();
  server.close();
  console.log("Storybook scan complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
