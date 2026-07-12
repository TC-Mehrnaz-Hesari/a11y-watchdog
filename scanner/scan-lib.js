import { AxeBuilder } from "@axe-core/playwright";
import { IMPACT_WEIGHTS } from "./targets.js";

// Normalised 0-100 score. We compute a weighted penalty from violation nodes,
// scaled against a "budget" so a clean page = 100 and a badly broken page trends to 0.
// penalty = sum over violations of (impactWeight * affectedNodeCount)
// score = round(100 * budget / (budget + penalty)), budget tuned so ~15 weighted pts ≈ 87.
const SCORE_BUDGET = 100;

function computeScore(violations) {
  let penalty = 0;
  for (const v of violations) {
    const w = IMPACT_WEIGHTS[v.impact] ?? 1;
    penalty += w * (v.nodes?.length || 1);
  }
  const score = Math.round((100 * SCORE_BUDGET) / (SCORE_BUDGET + penalty));
  return { score, penalty };
}

// Run axe against an already-loaded page. Returns the serialisable scan record.
export async function runAxe(page, meta) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .analyze();

  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact || "minor",
    wcagTags: (v.tags || []).filter((t) => t.startsWith("wcag") || t === "best-practice"),
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map((n) => ({
      selector: Array.isArray(n.target) ? n.target.join(" ") : String(n.target),
      html: (n.html || "").slice(0, 400),
      failureSummary: n.failureSummary || "",
    })),
  }));

  const { score, penalty } = computeScore(violations);

  return {
    ...meta, // surface, name, url, viewport
    timestamp: new Date().toISOString(),
    score,
    penalty,
    violations,
    counts: {
      violations: violations.length,
      violationNodes: violations.reduce((a, v) => a + v.nodes.length, 0),
      passes: results.passes.length,
      incomplete: results.incomplete.length,
    },
  };
}

/** Append non-axe violations (e.g. keyboard audit) and recompute the score. */
export function addViolations(record, extras) {
  if (!extras.length) return record;
  const violations = [...record.violations, ...extras];
  const { score, penalty } = computeScore(violations);
  return {
    ...record,
    score,
    penalty,
    violations,
    counts: {
      ...record.counts,
      violations: violations.length,
      violationNodes: violations.reduce((a, v) => a + v.nodes.length, 0),
    },
  };
}

// Safe slug for filenames.
export function slug(s) {
  return s
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
}
