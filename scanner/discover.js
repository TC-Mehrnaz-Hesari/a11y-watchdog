// GitHub-driven target discovery. Instead of bundling repo clones, the
// scanner asks GitHub (via the authed `gh` CLI) what exists in the org:
//   - repos with a `.storybook/` directory  -> component-library surfaces
//   - repos with a homepage URL set          -> live web surfaces
// New repos are picked up automatically on the next scan.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export const ORG = process.env.WATCHDOG_ORG || "Trilogy-Care";

async function gh(args) {
  const { stdout } = await exec("gh", args, { maxBuffer: 16 * 1024 * 1024 });
  return stdout;
}

async function ghJson(args) {
  return JSON.parse(await gh(args));
}

let repoCache = null;

export async function listRepos() {
  if (repoCache) return repoCache;
  repoCache = (
    await ghJson([
      "repo",
      "list",
      ORG,
      "--limit",
      "300",
      "--json",
      "name,description,homepageUrl,isArchived,primaryLanguage",
    ])
  ).filter((r) => !r.isArchived);
  return repoCache;
}

async function hasStorybook(repo) {
  try {
    await gh(["api", `repos/${ORG}/${repo}/contents/.storybook`, "--silent"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Repos that ship a Storybook. Override discovery with
 * WATCHDOG_REPOS=repo1,repo2 to scan a fixed set.
 */
export async function discoverStorybookRepos() {
  if (process.env.WATCHDOG_REPOS)
    return process.env.WATCHDOG_REPOS.split(",").map((s) => s.trim()).filter(Boolean);

  const jsLangs = new Set(["TypeScript", "JavaScript", "Vue", "HTML"]);
  const candidates = (await listRepos()).filter((r) =>
    jsLangs.has(r.primaryLanguage?.name)
  );

  const found = [];
  const queue = [...candidates];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      let r;
      while ((r = queue.pop())) {
        if (await hasStorybook(r.name)) found.push(r.name);
      }
    })
  );
  return found.sort();
}

/** Live sites advertised by repos via GitHub's homepage field. */
export async function discoverHomepageTargets() {
  return (await listRepos())
    .filter((r) => r.homepageUrl && /^https?:\/\//.test(r.homepageUrl))
    .map((r) => ({
      surface: r.name,
      name: "Home",
      url: r.homepageUrl,
    }));
}

export function cloneUrl(repo) {
  return `https://github.com/${ORG}/${repo}.git`;
}
