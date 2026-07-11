import fs from "node:fs";
import path from "node:path";

// ---------- Types (mirror scanner output) ----------

export interface ViolationNode {
  selector: string;
  html: string;
  failureSummary: string;
}

export interface Violation {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  wcagTags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: ViolationNode[];
}

export interface ScanRecord {
  /** "marketing", "pricing", or a GitHub repo name (discovered surfaces). */
  surface: string;
  name: string;
  url: string;
  viewport: string;
  storyId?: string;
  group?: string;
  timestamp: string;
  score: number;
  penalty: number;
  violations: Violation[];
  counts: {
    violations: number;
    violationNodes: number;
    passes: number;
    incomplete: number;
  };
  /** file basename without .json — used as stable route id */
  scanId: string;
}

export const IMPACT_WEIGHTS: Record<string, number> = {
  critical: 10,
  serious: 5,
  moderate: 2,
  minor: 1,
};

export const IMPACT_ORDER = ["critical", "serious", "moderate", "minor"] as const;

const SURFACE_LABELS: Record<string, string> = {
  marketing: "Marketing Site",
  pricing: "Pricing Website",
};

const ACRONYMS = new Set(["tc", "ai", "a11y", "api", "ui", "ux", "aect"]);

/** Known surfaces get friendly names; GitHub-discovered repo names are titleised. */
export function surfaceLabel(surface: string): string {
  if (SURFACE_LABELS[surface]) return SURFACE_LABELS[surface];
  return surface
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

// ---------- Loading ----------

const SCANS_DIR = path.join(process.cwd(), "..", "data", "scans");

let cache: ScanRecord[] | null = null;

export function getAllScans(): ScanRecord[] {
  if (cache) return cache;
  const files = fs.readdirSync(SCANS_DIR).filter((f) => f.endsWith(".json"));
  cache = files
    .map((f) => {
      const rec = JSON.parse(
        fs.readFileSync(path.join(SCANS_DIR, f), "utf8")
      ) as ScanRecord;
      rec.scanId = f.replace(/\.json$/, "");
      return rec;
    })
    .sort((a, b) => a.score - b.score);
  return cache;
}

export function getScan(scanId: string): ScanRecord | undefined {
  return getAllScans().find((s) => s.scanId === scanId);
}

// ---------- Aggregates ----------

export function avgScore(scans: ScanRecord[]): number {
  if (!scans.length) return 100;
  return Math.round(scans.reduce((a, s) => a + s.score, 0) / scans.length);
}

export interface SurfaceSummary {
  surface: string;
  label: string;
  score: number;
  scanCount: number;
  violationNodes: number;
  criticalCount: number;
  seriousCount: number;
}

export function getSurfaceSummaries(): SurfaceSummary[] {
  const scans = getAllScans();
  const surfaces = [...new Set(scans.map((s) => s.surface))];
  return surfaces
    .map((surface) => {
      const ss = scans.filter((s) => s.surface === surface);
      const byImpact = countNodesByImpact(ss);
      return {
        surface,
        label: surfaceLabel(surface),
        score: avgScore(ss),
        scanCount: ss.length,
        violationNodes: ss.reduce((a, s) => a + s.counts.violationNodes, 0),
        criticalCount: byImpact.critical ?? 0,
        seriousCount: byImpact.serious ?? 0,
      };
    })
    .sort((a, b) => a.score - b.score);
}

export function countNodesByImpact(
  scans: ScanRecord[]
): Record<string, number> {
  const out: Record<string, number> = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
  };
  for (const s of scans)
    for (const v of s.violations) out[v.impact] = (out[v.impact] ?? 0) + v.nodes.length;
  return out;
}

export interface RankedIssue {
  ruleId: string;
  impact: Violation["impact"];
  help: string;
  description: string;
  helpUrl: string;
  wcagTags: string[];
  totalNodes: number;
  affectedScans: { scanId: string; surface: string; name: string; viewport: string; nodeCount: number }[];
  priority: number; // impact weight x total node occurrences
}

/** Ranks unique axe rules by impact weight x occurrence for the Top Fixes view. */
export function getRankedIssues(): RankedIssue[] {
  const map = new Map<string, RankedIssue>();
  for (const s of getAllScans()) {
    for (const v of s.violations) {
      let issue = map.get(v.id);
      if (!issue) {
        issue = {
          ruleId: v.id,
          impact: v.impact,
          help: v.help,
          description: v.description,
          helpUrl: v.helpUrl,
          wcagTags: v.wcagTags,
          totalNodes: 0,
          affectedScans: [],
          priority: 0,
        };
        map.set(v.id, issue);
      }
      // The same rule can be reported at different impacts on different pages —
      // rank (and badge) it by the worst one seen.
      if ((IMPACT_WEIGHTS[v.impact] ?? 0) > (IMPACT_WEIGHTS[issue.impact] ?? 0)) {
        issue.impact = v.impact;
      }
      issue.totalNodes += v.nodes.length;
      issue.affectedScans.push({
        scanId: s.scanId,
        surface: s.surface,
        name: s.name,
        viewport: s.viewport,
        nodeCount: v.nodes.length,
      });
    }
  }
  const issues = [...map.values()];
  for (const i of issues) i.priority = (IMPACT_WEIGHTS[i.impact] ?? 1) * i.totalNodes;
  return issues.sort((a, b) => b.priority - a.priority);
}

// ---------- WCAG + plain-English helpers ----------

const WCAG_NAMES: Record<string, string> = {
  wcag111: "1.1.1 Non-text Content",
  wcag131: "1.3.1 Info and Relationships",
  wcag141: "1.4.1 Use of Color",
  wcag143: "1.4.3 Contrast (Minimum)",
  wcag1410: "1.4.10 Reflow",
  wcag1412: "1.4.12 Text Spacing",
  wcag211: "2.1.1 Keyboard",
  wcag241: "2.4.1 Bypass Blocks",
  wcag242: "2.4.2 Page Titled",
  wcag244: "2.4.4 Link Purpose",
  wcag246: "2.4.6 Headings and Labels",
  wcag247: "2.4.7 Focus Visible",
  wcag253: "2.5.3 Label in Name",
  wcag311: "3.1.1 Language of Page",
  wcag331: "3.3.1 Error Identification",
  wcag332: "3.3.2 Labels or Instructions",
  wcag412: "4.1.2 Name, Role, Value",
  wcag413: "4.1.3 Status Messages",
};

export function wcagLabel(tag: string): string {
  if (tag === "best-practice") return "Best practice";
  if (WCAG_NAMES[tag]) return WCAG_NAMES[tag];
  // wcag2a / wcag2aa / wcag21aa level tags
  const level = tag.match(/^wcag2(1|2)?(a+)$/);
  if (level) return `WCAG 2.${level[1] ?? "0"} ${level[2].toUpperCase()}`;
  const num = tag.match(/^wcag(\d)(\d)(\d+)$/);
  if (num) return `${num[1]}.${num[2]}.${num[3]}`;
  return tag;
}

interface Explanation {
  why: string;
  fix: string;
}

/** Plain-English explanations tuned for an aged-care audience context. */
const EXPLANATIONS: Record<string, Explanation> = {
  "color-contrast": {
    why: "Text that is too close in colour to its background is hard to read — especially for older readers, where reduced contrast sensitivity is near-universal.",
    fix: "Darken the text or lighten the background until the contrast ratio reaches at least 4.5:1 (3:1 for large text). Check brand colours like teal-on-white in a contrast checker.",
  },
  "button-name": {
    why: "Buttons without a text label are announced as just 'button' by screen readers, so users cannot tell what they do.",
    fix: "Add visible text, an aria-label, or a title to every button — especially icon-only buttons (search, close, menu).",
  },
  "link-name": {
    why: "Links without discernible text are unusable with a screen reader and confusing for voice-control users.",
    fix: "Give every link readable text or an aria-label; avoid image-only links without alt text.",
  },
  "image-alt": {
    why: "Screen-reader users hear nothing (or the file name) for images without alt text.",
    fix: "Add descriptive alt text to informative images, and alt=\"\" to purely decorative ones.",
  },
  region: {
    why: "Content outside landmark regions (header, nav, main, footer) is hard to reach with screen-reader shortcuts — users must arrow through everything.",
    fix: "Wrap page content in semantic landmarks: one <main>, plus <header>, <nav> and <footer>. Most fixes are one wrapper element in the page template.",
  },
  "landmark-one-main": {
    why: "Without a single <main> landmark, screen-reader users can't jump straight to the primary content.",
    fix: "Wrap the page's primary content in exactly one <main> element in the layout template.",
  },
  "landmark-unique": {
    why: "Multiple landmarks with the same role and no distinguishing label are announced identically, so users can't tell them apart.",
    fix: "Add an aria-label to repeated landmarks (e.g. <nav aria-label=\"Footer\">).",
  },
  "heading-order": {
    why: "Skipped heading levels (h2 → h4) break the page outline that screen-reader users navigate by.",
    fix: "Adjust heading levels so they only increase by one; style with CSS instead of picking a heading for its size.",
  },
  "page-has-heading-one": {
    why: "The h1 tells assistive-technology users what the page is about; without it, orientation is harder.",
    fix: "Give every page exactly one <h1> describing its main content.",
  },
  listitem: {
    why: "<li> elements outside a <ul>/<ol> lose list semantics, so item counts and positions aren't announced.",
    fix: "Wrap list items in a <ul> or <ol>, or use role=\"list\" on the container.",
  },
  list: {
    why: "Lists containing non-list-item children confuse screen readers' list announcements.",
    fix: "Only put <li> (or script/template) elements directly inside <ul>/<ol>.",
  },
  "duplicate-id": {
    why: "Duplicate ids can make labels and ARIA references point at the wrong element.",
    fix: "Make ids unique, or switch to classes where uniqueness isn't guaranteed.",
  },
  "aria-allowed-role": {
    why: "Invalid ARIA role usage can make elements behave unpredictably in assistive technology.",
    fix: "Remove the disallowed role or use the appropriate semantic HTML element instead.",
  },
  "nested-interactive": {
    why: "Interactive controls nested inside other controls (a button inside a link) can't be reliably operated by keyboard or screen reader.",
    fix: "Flatten the markup so each interactive element stands alone.",
  },
  "frame-title": {
    why: "Frames without titles are announced with no context.",
    fix: "Add a descriptive title attribute to every <iframe>.",
  },
  "select-name": {
    why: "Dropdowns without an accessible name leave users guessing what they're choosing.",
    fix: "Associate a <label> with each <select>, or add aria-label.",
  },
  label: {
    why: "Form fields without labels are unusable for screen-reader users and harder for everyone.",
    fix: "Add a <label for> for each input, or aria-label where a visible label is impossible.",
  },
  "meta-viewport": {
    why: "Disabling zoom prevents low-vision users from enlarging text — critical for elderly users.",
    fix: "Remove user-scalable=no and maximum-scale from the viewport meta tag.",
  },
  "scrollable-region-focusable": {
    why: "Scrollable areas that can't receive keyboard focus are unreachable without a mouse.",
    fix: "Add tabindex=\"0\" to scrollable containers (or make an element within focusable).",
  },
  "aria-progressbar-name": {
    why: "Progress indicators without names give no context about what is loading or progressing.",
    fix: "Add aria-label or aria-labelledby to progressbar elements.",
  },
  "empty-heading": {
    why: "Empty headings clutter the navigation outline screen-reader users rely on.",
    fix: "Remove empty heading tags or add meaningful text.",
  },
  "landmark-banner-is-top-level": {
    why: "A banner landmark nested inside another landmark confuses page structure.",
    fix: "Move the <header role=\"banner\"> to the top level of the page.",
  },
  "landmark-no-duplicate-banner": {
    why: "Multiple banner landmarks make it unclear which is the page header.",
    fix: "Keep a single top-level banner; demote others to plain <div> or section.",
  },
};

export function explain(ruleId: string, fallbackDescription: string): Explanation {
  return (
    EXPLANATIONS[ruleId] ?? {
      why: fallbackDescription,
      fix: "See the Deque University rule page (linked) for remediation guidance.",
    }
  );
}

// ---------- Presentation helpers ----------

export function scoreTone(score: number): "good" | "warn" | "bad" {
  if (score >= 90) return "good";
  if (score >= 70) return "warn";
  return "bad";
}

// ---------- Gamification ----------

export function grade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/** XP still on the table — the sum of unfixed issue priorities. */
export function totalXpAvailable(): number {
  return getRankedIssues().reduce((a, i) => a + i.priority, 0);
}

export interface Badge {
  emoji: string;
  name: string;
  description: string;
  earned: boolean;
}

export function getBadges(): Badge[] {
  const surfaces = getSurfaceSummaries();
  const scans = getAllScans();
  const noCritical = surfaces.filter((s) => s.criticalCount === 0);
  const club90 = surfaces.filter((s) => s.score >= 90);
  const perfect = scans.filter((s) => s.violations.length === 0);
  return [
    {
      emoji: "🦴",
      name: "First Sniff",
      description: "Run the first full scan of every surface",
      earned: scans.length > 0,
    },
    {
      emoji: "🛡️",
      name: "Zero Critical",
      description: "A surface with no critical issues",
      earned: noCritical.length > 0,
    },
    {
      emoji: "🏆",
      name: "90 Club",
      description: "A surface scoring 90 or above",
      earned: club90.length > 0,
    },
    {
      emoji: "✨",
      name: "Spotless",
      description: "A page or component with zero automated violations",
      earned: perfect.length > 0,
    },
    {
      emoji: "🐕",
      name: "Best in Show",
      description: "Every surface at grade A or better",
      earned: surfaces.every((s) => s.score >= 90),
    },
    {
      emoji: "🚫",
      name: "Critical Wipeout",
      description: "Zero critical issues across the whole estate",
      earned: surfaces.every((s) => s.criticalCount === 0),
    },
  ];
}
