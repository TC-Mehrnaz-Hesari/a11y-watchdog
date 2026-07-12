import fs from "node:fs";
import path from "node:path";
import { explain, type RankedIssue } from "@/lib/data";

// ---------- Quest claims (who is working on which rule) ----------

const QUESTS_FILE = path.join(process.cwd(), "..", "data", "quests.json");

export interface QuestClaim {
  owner: string;
  claimedAt: string;
}

export function getClaims(): Record<string, QuestClaim> {
  try {
    return JSON.parse(fs.readFileSync(QUESTS_FILE, "utf8"));
  } catch {
    return {};
  }
}

export function saveClaim(ruleId: string, owner: string): void {
  const claims = getClaims();
  claims[ruleId] = { owner, claimedAt: new Date().toISOString() };
  fs.writeFileSync(QUESTS_FILE, JSON.stringify(claims, null, 2));
}

export function removeClaim(ruleId: string): void {
  const claims = getClaims();
  delete claims[ruleId];
  fs.writeFileSync(QUESTS_FILE, JSON.stringify(claims, null, 2));
}

// ---------- "File a GitHub issue" deep link ----------

const ISSUES_REPO =
  process.env.WATCHDOG_ISSUES_REPO || "TC-Mehrnaz-Hesari/a11y-watchdog";

/** Pre-filled new-issue URL turning a quest into a work item. */
export function questIssueUrl(issue: RankedIssue): string {
  const ex = explain(issue.ruleId, issue.description);
  const title = `a11y: ${issue.help} (${issue.ruleId})`;
  const scans = issue.affectedScans
    .slice(0, 10)
    .map((s) => `- ${s.name} (${s.surface}, ${s.viewport}) — ${s.nodeCount} element(s)`)
    .join("\n");
  const more =
    issue.affectedScans.length > 10
      ? `\n…and ${issue.affectedScans.length - 10} more scans`
      : "";
  const body = [
    `**Rule:** \`${issue.ruleId}\` · **Impact:** ${issue.impact} · **Worth:** ${issue.priority} XP`,
    "",
    "### Why it matters",
    ex.why,
    "",
    "### How to fix",
    ex.fix,
    "",
    "### Affected scans",
    scans + more,
    "",
    `[Full remediation guide](${issue.helpUrl})`,
    "",
    "_Filed from the A11y Watchdog quest board._",
  ]
    .join("\n")
    .slice(0, 6000);

  const params = new URLSearchParams({ title, body, labels: "accessibility" });
  return `https://github.com/${ISSUES_REPO}/issues/new?${params}`;
}
