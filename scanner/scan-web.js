import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WEB_TARGETS, VIEWPORTS } from "./targets.js";
import { runAxe, slug } from "./scan-lib.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../data/scans");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  let done = 0;
  const total = WEB_TARGETS.length * 2;

  for (const target of WEB_TARGETS) {
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const ctx = await browser.newContext({
        viewport: vp,
        userAgent:
          "Mozilla/5.0 (A11yWatchdog/1.0; internal accessibility audit; +mehrnazh@trilogycare.com.au)",
      });
      const page = await ctx.newPage();
      const label = `${target.name} [${vpName}]`;
      try {
        // domcontentloaded (not networkidle): these sites keep analytics/chat
        // sockets open so networkidle never fires. Then settle for late content.
        await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForLoadState("load", { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2500); // let JS-rendered/late content settle
        const record = await runAxe(page, {
          surface: target.surface,
          name: target.name,
          url: target.url,
          viewport: vpName,
        });
        const fname = `${target.surface}__${slug(target.name)}__${vpName}.json`;
        await writeFile(path.join(OUT_DIR, fname), JSON.stringify(record, null, 2));
        done++;
        console.log(
          `[${done}/${total}] ${label} -> score ${record.score}, ${record.counts.violations} violations (${record.counts.violationNodes} nodes)`
        );
      } catch (err) {
        console.error(`[FAIL] ${label}: ${err.message}`);
      } finally {
        await ctx.close();
      }
    }
  }
  await browser.close();
  console.log("Web scan complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
