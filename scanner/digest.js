// Weekly digest: compares the current scans against the last digest baseline
// and posts score movement, new criticals and completed quests to Slack
// and/or Teams. With no webhook env vars set it prints the message instead
// (dry run). Writes the new baseline to data/digest-baseline.json afterwards.
//
// Env: SLACK_WEBHOOK_URL (incoming webhook), TEAMS_WEBHOOK_URL (workflow/
// connector webhook), WATCHDOG_DASHBOARD_URL (link shown in the message).
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { IMPACT_WEIGHTS } from "./targets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCANS_DIR = path.resolve(__dirname, "../data/scans");
const BASELINE_FILE = path.resolve(__dirname, "../data/digest-baseline.json");
const DASHBOARD_URL = process.env.WATCHDOG_DASHBOARD_URL || "";

async function loadScans() {
  const files = (await readdir(SCANS_DIR)).filter((f) => f.endsWith(".json"));
  return Promise.all(
    files.map(async (f) => JSON.parse(await readFile(path.join(SCANS_DIR, f), "utf8")))
  );
}

/** Snapshot of the numbers the digest reports movement on. */
function summarise(scans) {
  const surfaces = {};
  const quests = {};
  let criticalNodes = 0;

  for (const s of scans) {
    const surf = (surfaces[s.surface] ??= { total: 0, count: 0 });
    surf.total += s.score;
    surf.count += 1;
    for (const v of s.violations) {
      if (v.impact === "critical") criticalNodes += v.nodes.length;
      const q = (quests[v.id] ??= { impact: v.impact, help: v.help, nodes: 0 });
      q.nodes += v.nodes.length;
      if ((IMPACT_WEIGHTS[v.impact] ?? 0) > (IMPACT_WEIGHTS[q.impact] ?? 0)) q.impact = v.impact;
    }
  }

  const surfaceScores = Object.fromEntries(
    Object.entries(surfaces).map(([k, v]) => [k, Math.round(v.total / v.count)])
  );
  const overall = scans.length
    ? Math.round(scans.reduce((a, s) => a + s.score, 0) / scans.length)
    : 100;

  return { generatedAt: new Date().toISOString(), overall, criticalNodes, surfaceScores, quests };
}

const arrow = (d) => (d > 0 ? `▲ +${d}` : d < 0 ? `▼ ${d}` : "—");

function buildMessage(current, baseline) {
  const lines = [];
  const overallDelta = baseline ? current.overall - baseline.overall : 0;
  lines.push(
    `*A11y Watchdog weekly digest* 🐕‍🦺`,
    `Overall score: *${current.overall}/100* ${baseline ? `(${arrow(overallDelta)} since ${baseline.generatedAt.slice(0, 10)})` : "(first digest — baseline set)"}`,
    `Critical elements: *${current.criticalNodes}*${baseline ? ` (${arrow(current.criticalNodes - baseline.criticalNodes)})` : ""}`
  );

  if (baseline) {
    const moves = Object.entries(current.surfaceScores)
      .map(([surf, score]) => ({ surf, score, delta: score - (baseline.surfaceScores[surf] ?? score) }))
      .filter((m) => m.delta !== 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 5);
    if (moves.length) {
      lines.push("", "*Surface movement*");
      for (const m of moves) lines.push(`• ${m.surf}: ${m.score} (${arrow(m.delta)})`);
    }

    const newCriticals = Object.entries(current.quests).filter(
      ([id, q]) => q.impact === "critical" && !(id in baseline.quests)
    );
    if (newCriticals.length) {
      lines.push("", "*New critical issues* 🚨");
      for (const [id, q] of newCriticals) lines.push(`• ${q.help} (\`${id}\`, ${q.nodes} elements)`);
    }

    const completed = Object.entries(baseline.quests).filter(([id]) => !(id in current.quests));
    if (completed.length) {
      lines.push("", "*Quests completed* 🎉");
      for (const [id, q] of completed) {
        lines.push(`• ${q.help} (\`${id}\`) — +${(IMPACT_WEIGHTS[q.impact] ?? 1) * q.nodes} XP earned`);
      }
    }
  }

  const top = Object.entries(current.quests)
    .map(([id, q]) => ({ id, ...q, xp: (IMPACT_WEIGHTS[q.impact] ?? 1) * q.nodes }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 3);
  if (top.length) {
    lines.push("", "*Top quests this week*");
    for (const q of top) lines.push(`• ${q.help} — ${q.impact}, +${q.xp} XP`);
  }

  if (DASHBOARD_URL) lines.push("", `<${DASHBOARD_URL}|Open the dashboard>`);
  return lines.join("\n");
}

async function post(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
}

async function main() {
  const scans = await loadScans();
  if (!scans.length) throw new Error(`No scans found in ${SCANS_DIR} — run a scan first.`);

  let baseline = null;
  try {
    baseline = JSON.parse(await readFile(BASELINE_FILE, "utf8"));
  } catch {
    /* first run — no baseline yet */
  }

  const current = summarise(scans);
  const text = buildMessage(current, baseline);

  let delivered = false;
  if (process.env.SLACK_WEBHOOK_URL) {
    await post(process.env.SLACK_WEBHOOK_URL, { text });
    console.log("Posted to Slack.");
    delivered = true;
  }
  if (process.env.TEAMS_WEBHOOK_URL) {
    // MessageCard is accepted by both classic connectors and Workflows webhooks.
    await post(process.env.TEAMS_WEBHOOK_URL, {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      summary: "A11y Watchdog weekly digest",
      themeColor: "007f7e",
      // Teams renders markdown-ish text; convert Slack bold/links.
      text: text.replaceAll("*", "**").replace(/<([^|>]+)\|([^>]+)>/g, "[$2]($1)"),
    });
    console.log("Posted to Teams.");
    delivered = true;
  }
  if (!delivered) {
    console.log("No SLACK_WEBHOOK_URL / TEAMS_WEBHOOK_URL set — dry run:\n");
    console.log(text);
  }

  await writeFile(BASELINE_FILE, JSON.stringify(current, null, 2));
  console.log(`\nBaseline updated: ${BASELINE_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
