// Scans the Storybook of every org repo that has one. Repos are discovered
// from GitHub (see discover.js), shallow-cloned into work/ (gitignored),
// built, served statically, and sampled with axe.
import { chromium } from "playwright";
import { writeFile, mkdir, readFile, rm, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAxe, slug } from "./scan-lib.js";
import { VIEWPORTS } from "./targets.js";
import { discoverStorybookRepos, cloneUrl, ORG } from "./discover.js";

const exec = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../data/scans");
const WORK_DIR = path.resolve(__dirname, "../work");
const SAMPLE_SIZE = 40;
const PORT = 6199;

// Minimal static file server for a built Storybook.
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
    const step = Math.max(1, Math.floor(list.length / perGroup));
    for (let i = 0; i < list.length && picked.length < n; i += step) {
      picked.push(list[i]);
    }
  }
  return picked.slice(0, n);
}

async function run(cmd, args, cwd) {
  await exec(cmd, args, { cwd, maxBuffer: 64 * 1024 * 1024 });
}

/** Clone/update the repo and return the path of a built storybook-static, or null. */
async function prepareStorybook(repo) {
  const dir = path.join(WORK_DIR, repo);

  if (!existsSync(dir)) {
    console.log(`[${repo}] cloning…`);
    await run("git", ["clone", "--depth", "1", cloneUrl(repo), dir], WORK_DIR);
  } else {
    console.log(`[${repo}] updating…`);
    await run("git", ["pull", "--ff-only"], dir).catch(() =>
      console.log(`[${repo}] pull failed, scanning existing checkout`)
    );
  }

  const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8"));
  const buildScript = Object.keys(pkg.scripts ?? {}).find(
    (k) => k === "build-storybook" || /storybook[:-]?build|build[:-]?storybook/.test(k)
  );
  if (!buildScript) {
    console.log(`[${repo}] has .storybook but no storybook build script — skipping`);
    return null;
  }

  const staticDir = path.join(dir, "storybook-static");
  if (!existsSync(path.join(staticDir, "index.json")) || process.env.FORCE_REBUILD) {
    console.log(`[${repo}] installing deps…`);
    await run("npm", [existsSync(path.join(dir, "package-lock.json")) ? "ci" : "install",
      "--no-audit", "--no-fund"], dir);
    console.log(`[${repo}] building storybook (npm run ${buildScript})…`);
    await run("npm", ["run", buildScript], dir);
  } else {
    console.log(`[${repo}] using existing storybook-static (FORCE_REBUILD=1 to rebuild)`);
  }
  return existsSync(path.join(staticDir, "index.json")) ? staticDir : null;
}

async function scanRepo(repo, staticDir, browser) {
  const index = JSON.parse(await readFile(path.join(staticDir, "index.json"), "utf8"));
  const sample = sampleStories(index.entries, SAMPLE_SIZE);
  console.log(`[${repo}] sampling ${sample.length} stories`);

  const server = await serveStatic(staticDir);
  const base = `http://localhost:${PORT}`;
  const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop });
  const page = await ctx.newPage();

  let done = 0;
  for (const story of sample) {
    const group = story.title.split("/")[0];
    const url = `${base}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector("#storybook-root, #root", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(600);
      const record = await runAxe(page, {
        surface: repo,
        name: story.title,
        storyId: story.id,
        group,
        url: `${ORG}/${repo} iframe.html?id=${story.id}`,
        viewport: "desktop",
      });
      const fname = `component-${slug(repo)}__${slug(story.id)}.json`;
      await writeFile(path.join(OUT_DIR, fname), JSON.stringify(record, null, 2));
      done++;
      console.log(`[${repo} ${done}/${sample.length}] ${story.title} -> score ${record.score}`);
    } catch (err) {
      console.error(`[FAIL] ${repo} ${story.title}: ${err.message}`);
    }
  }

  await ctx.close();
  server.close();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(WORK_DIR, { recursive: true });

  const repos = await discoverStorybookRepos();
  console.log(`GitHub discovery (${ORG}): ${repos.length} repo(s) with a Storybook: ${repos.join(", ") || "none"}`);

  // Old single-repo scan files used the component__ prefix; clear stale data.
  for (const f of await readdir(OUT_DIR)) {
    if (f.startsWith("component__")) await rm(path.join(OUT_DIR, f));
  }

  const browser = await chromium.launch();
  for (const repo of repos) {
    try {
      const staticDir = await prepareStorybook(repo);
      if (staticDir) await scanRepo(repo, staticDir, browser);
    } catch (err) {
      console.error(`[FAIL] ${repo}: ${err.message}`);
    }
  }
  await browser.close();
  console.log("Storybook scan complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
