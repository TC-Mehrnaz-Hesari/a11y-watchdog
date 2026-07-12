import Link from "next/link";
import {
  IMPACT_ORDER,
  scoreTone,
  grade,
  surfaceLabel,
  type ScanRecord,
} from "@/lib/data";

// ---------- Cards & tiles ----------

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl bg-white p-6 shadow-card ring-1 ring-navy/5 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatTile({
  value,
  label,
  tone = "default",
}: {
  value: React.ReactNode;
  label: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneClass = {
    default: "text-navy",
    good: "text-good",
    warn: "text-warn",
    bad: "text-bad",
  }[tone];
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-navy/5">
      <p className={`text-3xl font-bold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

// ---------- Gamification bits ----------

const GRADE_STYLES = {
  good: "bg-good/10 text-good ring-good/25",
  warn: "bg-warn/10 text-warn ring-warn/25",
  bad: "bg-bad/10 text-bad ring-bad/25",
};

export function GradeBadge({ score, size = "md" }: { score: number; size?: "md" | "lg" }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl font-black ring-1 ${GRADE_STYLES[scoreTone(score)]} ${
        size === "lg" ? "h-12 w-12 text-2xl" : "h-8 w-8 text-sm"
      }`}
      title={`Grade for score ${score}`}
    >
      {grade(score)}
    </span>
  );
}

export function XPChip({ xp }: { xp: number }) {
  return (
    <span className="inline-block whitespace-nowrap rounded-full bg-linear-to-r from-teal to-teal-dark px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
      +{xp} XP
    </span>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function Medal({ rank }: { rank: number }) {
  if (rank < 3)
    return (
      <span aria-label={`Rank ${rank + 1}`} className="text-2xl leading-none">
        {MEDALS[rank]}
      </span>
    );
  return (
    <span
      aria-label={`Rank ${rank + 1}`}
      className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-1.5 text-xs font-bold text-slate-500"
    >
      {rank + 1}
    </span>
  );
}

export function RankChip({ rank }: { rank: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-light text-sm font-bold text-teal-dark"
    >
      {rank}
    </span>
  );
}

// ---------- Impact (status colors: always paired with a visible label) ----------

const IMPACT_DOT: Record<string, string> = {
  critical: "bg-impact-critical",
  serious: "bg-impact-serious",
  moderate: "bg-impact-moderate",
  minor: "bg-impact-minor",
};

const IMPACT_TEXT: Record<string, string> = {
  critical: "text-impact-critical",
  serious: "text-impact-serious",
  moderate: "text-amber-700",
  minor: "text-impact-minor",
};

export function ImpactBadge({ impact }: { impact: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-slate-200 ${IMPACT_TEXT[impact] ?? IMPACT_TEXT.minor}`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${IMPACT_DOT[impact] ?? IMPACT_DOT.minor}`}
      />
      {impact}
    </span>
  );
}

export function ImpactBar({ counts }: { counts: Record<string, number> }) {
  const total = IMPACT_ORDER.reduce((a, k) => a + (counts[k] ?? 0), 0) || 1;
  return (
    <div>
      {/* 2px white gaps keep adjacent fills separable without relying on hue */}
      <div className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100">
        {IMPACT_ORDER.map((k) =>
          counts[k] ? (
            <div
              key={k}
              className={`${IMPACT_DOT[k]} first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${(counts[k] / total) * 100}%` }}
              title={`${k}: ${counts[k]} elements`}
            />
          ) : null
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600">
        {IMPACT_ORDER.map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`inline-block h-2.5 w-2.5 rounded-sm ${IMPACT_DOT[k]}`}
            />
            <span className="capitalize">{k}</span>
            <span className="font-bold tabular-nums text-navy">{counts[k] ?? 0}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- Score ring ----------

const TONE_COLOR = { good: "#1a7f4b", warn: "#b45309", bad: "#b91c1c" };

export function ScoreRing({
  score,
  size = 120,
  label,
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const tone = scoreTone(score);
  const stroke = Math.max(6, Math.round(size * 0.075));
  const r = (size - stroke - 2) / 2;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={`Score ${score} out of 100`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#eef2f6"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={TONE_COLOR[tone]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${c - filled}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-bold leading-none tabular-nums"
            style={{ fontSize: size * 0.27, color: TONE_COLOR[tone] }}
          >
            {score}
          </span>
          {size >= 110 && (
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              / 100
            </span>
          )}
        </div>
      </div>
      {label && <span className="text-sm font-medium text-slate-500">{label}</span>}
    </div>
  );
}

// ---------- Small score pill ----------

const PILL_STYLES = {
  good: "bg-good/10 text-good ring-good/20",
  warn: "bg-warn/10 text-warn ring-warn/20",
  bad: "bg-bad/10 text-bad ring-bad/20",
};

export function ScorePill({ score }: { score: number }) {
  return (
    <span
      className={`inline-block min-w-11 rounded-lg px-2 py-0.5 text-center text-sm font-bold tabular-nums ring-1 ${PILL_STYLES[scoreTone(score)]}`}
    >
      {score}
    </span>
  );
}

// ---------- Surface tag ----------

// Fixed chip styles; discovered surfaces get a stable style by name.
const SURFACE_STYLES: Record<string, string> = {
  marketing: "bg-teal-light text-teal-dark ring-teal/15",
  pricing: "bg-navy-light text-navy ring-navy/15",
};

const EXTRA_STYLES = [
  "bg-violet-50 text-violet-800 ring-violet-200",
  "bg-sky-50 text-sky-800 ring-sky-200",
  "bg-rose-50 text-rose-800 ring-rose-200",
  "bg-emerald-50 text-emerald-800 ring-emerald-200",
  "bg-amber-50 text-amber-800 ring-amber-200",
];

function surfaceStyle(surface: string): string {
  if (SURFACE_STYLES[surface]) return SURFACE_STYLES[surface];
  let hash = 0;
  for (const ch of surface) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return EXTRA_STYLES[hash % EXTRA_STYLES.length];
}

export function SurfaceTag({ surface, label }: { surface: string; label: string }) {
  return (
    <span
      className={`inline-block max-w-44 truncate whitespace-nowrap rounded-md px-2 py-0.5 align-middle text-xs font-semibold ring-1 ${surfaceStyle(surface)}`}
      title={label}
    >
      {label}
    </span>
  );
}

// ---------- Detail link ----------

export function DetailLink({
  scanId,
  surface,
  children,
}: {
  scanId: string;
  surface: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/detail/${surface}/${encodeURIComponent(scanId)}`}
      className="font-semibold text-teal-dark underline-offset-2 hover:text-teal hover:underline"
    >
      {children}
    </Link>
  );
}

// ---------- Navigation helpers ----------

export function Breadcrumbs({
  items,
}: {
  items: { href?: string; label: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-slate-400">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {item.href ? (
              <Link
                href={item.href}
                className="font-medium text-teal-dark underline-offset-2 hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-slate-500">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Link-based filter chip; filtering is expressed in the URL, so it needs no client JS. */
export function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-colors ${
        active
          ? "bg-teal text-white ring-teal"
          : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-navy"
      }`}
    >
      {children}
    </Link>
  );
}

// ---------- Table primitives ----------

export function Th({
  children,
  align = "left",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`pb-2.5 pr-3 text-xs font-bold uppercase tracking-wider text-slate-400 last:pr-0 ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`py-2.5 pr-3 last:pr-0 ${align === "right" ? "text-right" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

/** Standard scan listing used by the scan explorer and surface pages. */
export function ScanTable({
  scans,
  showSurface = true,
}: {
  scans: ScanRecord[];
  showSurface?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <Th>Page / component</Th>
            {showSurface && <Th>Surface</Th>}
            <Th>Viewport</Th>
            <Th>Violations</Th>
            <Th>Elements</Th>
            <Th>Passes</Th>
            <Th align="right">Score</Th>
          </tr>
        </thead>
        <tbody>
          {scans.map((s) => (
            <tr
              key={s.scanId}
              className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/60"
            >
              <Td className="max-w-72 truncate">
                <DetailLink scanId={s.scanId} surface={s.surface}>
                  {s.name}
                </DetailLink>
              </Td>
              {showSurface && (
                <Td>
                  <SurfaceTag surface={s.surface} label={surfaceLabel(s.surface)} />
                </Td>
              )}
              <Td className="text-slate-600">{s.viewport}</Td>
              <Td className="tabular-nums text-slate-600">{s.counts.violations}</Td>
              <Td className="tabular-nums text-slate-600">{s.counts.violationNodes}</Td>
              <Td className="tabular-nums text-slate-600">{s.counts.passes}</Td>
              <Td align="right">
                <ScorePill score={s.score} />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
      {scans.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">
          No scans match the current filters.
        </p>
      )}
    </div>
  );
}
