import Link from "next/link";
import { IMPACT_ORDER, scoreTone, grade } from "@/lib/data";

// ---------- Gamification bits ----------

const GRADE_STYLES = {
  good: "bg-green-100 text-green-800 border-green-300",
  warn: "bg-amber-100 text-amber-800 border-amber-300",
  bad: "bg-red-100 text-red-800 border-red-300",
};

export function GradeBadge({ score, size = "md" }: { score: number; size?: "md" | "lg" }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg border font-black ${GRADE_STYLES[scoreTone(score)]} ${
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
    <span className="inline-block rounded-full bg-navy px-2.5 py-0.5 text-xs font-bold text-white">
      +{xp} XP
    </span>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function Medal({ rank }: { rank: number }) {
  return (
    <span aria-label={`Rank ${rank + 1}`} className="text-2xl">
      {MEDALS[rank] ?? `#${rank + 1}`}
    </span>
  );
}

// ---------- Impact badge ----------

const IMPACT_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  serious: "bg-orange-100 text-orange-800 border-orange-200",
  moderate: "bg-amber-100 text-amber-800 border-amber-200",
  minor: "bg-slate-100 text-slate-700 border-slate-200",
};

export function ImpactBadge({ impact }: { impact: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${IMPACT_STYLES[impact] ?? IMPACT_STYLES.minor}`}
    >
      {impact}
    </span>
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
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={`Score ${score} out of 100`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#e5eaf0"
            strokeWidth={10}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={TONE_COLOR[tone]}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${c - filled}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-bold tabular-nums"
            style={{ fontSize: size * 0.28, color: TONE_COLOR[tone] }}
          >
            {score}
          </span>
        </div>
      </div>
      {label && <span className="text-sm font-medium text-slate-500">{label}</span>}
    </div>
  );
}

// ---------- Small score pill ----------

const PILL_STYLES = {
  good: "bg-green-50 text-green-800 border-green-200",
  warn: "bg-amber-50 text-amber-800 border-amber-200",
  bad: "bg-red-50 text-red-800 border-red-200",
};

export function ScorePill({ score }: { score: number }) {
  return (
    <span
      className={`inline-block min-w-11 rounded-md border px-2 py-0.5 text-center text-sm font-bold tabular-nums ${PILL_STYLES[scoreTone(score)]}`}
    >
      {score}
    </span>
  );
}

// ---------- Impact distribution bar ----------

const BAR_COLORS: Record<string, string> = {
  critical: "#b91c1c",
  serious: "#ea580c",
  moderate: "#d97706",
  minor: "#94a3b8",
};

export function ImpactBar({ counts }: { counts: Record<string, number> }) {
  const total = IMPACT_ORDER.reduce((a, k) => a + (counts[k] ?? 0), 0) || 1;
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {IMPACT_ORDER.map((k) =>
          counts[k] ? (
            <div
              key={k}
              style={{ width: `${(counts[k] / total) * 100}%`, background: BAR_COLORS[k] }}
              title={`${k}: ${counts[k]}`}
            />
          ) : null
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {IMPACT_ORDER.map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: BAR_COLORS[k] }}
            />
            <span className="capitalize">{k}</span>
            <span className="font-semibold tabular-nums">{counts[k] ?? 0}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- Card ----------

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

// ---------- Surface tag ----------

const SURFACE_STYLES: Record<string, string> = {
  marketing: "bg-teal-light text-teal-dark",
  pricing: "bg-navy-light text-navy",
  "component-library": "bg-violet-50 text-violet-800",
};

export function SurfaceTag({ surface, label }: { surface: string; label: string }) {
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${SURFACE_STYLES[surface] ?? "bg-slate-100 text-slate-700"}`}
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
      className="font-medium text-teal underline-offset-2 hover:underline"
    >
      {children}
    </Link>
  );
}
