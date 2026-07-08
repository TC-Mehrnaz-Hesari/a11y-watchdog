import Link from "next/link";
import {
  getAllScans,
  getSurfaceSummaries,
  countNodesByImpact,
  avgScore,
  getRankedIssues,
  getBadges,
  totalXpAvailable,
  surfaceLabel,
} from "@/lib/data";
import {
  Card,
  ScoreRing,
  ScorePill,
  ImpactBar,
  ImpactBadge,
  SurfaceTag,
  DetailLink,
  GradeBadge,
  XPChip,
  Medal,
} from "@/components/ui";

export default function OverviewPage() {
  const scans = getAllScans();
  const surfaces = getSurfaceSummaries();
  const impactCounts = countNodesByImpact(scans);
  const overall = avgScore(scans);
  const worst = scans.slice(0, 10);
  const topIssues = getRankedIssues().slice(0, 5);
  const badges = getBadges();
  const xpAvailable = totalXpAvailable();
  const leaderboard = [...surfaces].sort((a, b) => b.score - a.score);
  const lastScan = scans
    .map((s) => s.timestamp)
    .sort()
    .at(-1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Accessibility Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          {scans.length} scans across {surfaces.length} surfaces · last scan{" "}
          {lastScan ? new Date(lastScan).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" }) : "—"}
        </p>
      </div>

      {/* Score row: overall + surface leaderboard */}
      <div className="grid gap-6 md:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center justify-center gap-3 md:min-w-56">
          <ScoreRing score={overall} size={150} label="Overall score" />
          <div className="flex items-center gap-2">
            <GradeBadge score={overall} />
            <span className="text-xs text-slate-500">
              current grade ·{" "}
              <span className="font-bold text-navy tabular-nums">{xpAvailable} XP</span>{" "}
              up for grabs
            </span>
          </div>
        </Card>
        <div className="grid gap-6 sm:grid-cols-3">
          {leaderboard.map((s, rank) => (
            <Card key={s.surface} className="flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <SurfaceTag surface={s.surface} label={s.label} />
                  <Medal rank={rank} />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {s.scanCount} scans · {s.violationNodes} affected elements
                </p>
              </div>
              <div className="flex items-end justify-between">
                <ScoreRing score={s.score} size={84} />
                <div className="text-right text-xs text-slate-500">
                  <GradeBadge score={s.score} />
                  <p className="mt-2">
                    <span className="font-bold text-bad tabular-nums">{s.criticalCount}</span>{" "}
                    critical
                  </p>
                  <p>
                    <span className="font-bold text-warn tabular-nums">{s.seriousCount}</span>{" "}
                    serious
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Badges */}
      <Card title="Achievements">
        <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {badges.map((b) => (
            <li
              key={b.name}
              title={b.description}
              className={`flex flex-col items-center gap-1 rounded-xl border p-4 text-center ${
                b.earned
                  ? "border-teal/30 bg-teal-light"
                  : "border-slate-200 bg-slate-50 opacity-45 grayscale"
              }`}
            >
              <span aria-hidden="true" className="text-3xl">
                {b.emoji}
              </span>
              <span className="text-xs font-bold text-navy">{b.name}</span>
              <span className="text-[10px] leading-tight text-slate-500">
                {b.description}
              </span>
              <span className="sr-only">{b.earned ? "Earned" : "Locked"}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Impact distribution */}
      <Card title="Affected elements by impact">
        <ImpactBar counts={impactCounts} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Worst offenders */}
        <Card title="Worst offenders">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-3 font-semibold">Page / component</th>
                <th className="pb-2 pr-3 font-semibold">Surface</th>
                <th className="pb-2 pr-3 font-semibold">Issues</th>
                <th className="pb-2 text-right font-semibold">Score</th>
              </tr>
            </thead>
            <tbody>
              {worst.map((s) => (
                <tr key={s.scanId} className="border-b border-slate-100 last:border-0">
                  <td className="max-w-52 truncate py-2.5 pr-3">
                    <DetailLink scanId={s.scanId} surface={s.surface}>
                      {s.name}
                    </DetailLink>
                    <span className="ml-1.5 text-xs text-slate-400">{s.viewport}</span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <SurfaceTag surface={s.surface} label={surfaceLabel(s.surface)} />
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-slate-600">
                    {s.counts.violationNodes}
                  </td>
                  <td className="py-2.5 text-right">
                    <ScorePill score={s.score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Top quests preview */}
        <Card title="Top quests">
          <ol className="space-y-4">
            {topIssues.map((issue, i) => (
              <li key={issue.ruleId} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-light text-xs font-bold text-teal-dark"
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-navy">{issue.help}</span>
                    <ImpactBadge impact={issue.impact} />
                    <XPChip xp={issue.priority} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {issue.totalNodes} elements across {issue.affectedScans.length} scans ·{" "}
                    <code className="rounded bg-slate-100 px-1">{issue.ruleId}</code>
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <Link
            href="/top-fixes"
            className="mt-5 inline-block rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark"
          >
            Open the quest board →
          </Link>
        </Card>
      </div>

      {/* All scans */}
      <Card title="All scans">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-3 font-semibold">Page / component</th>
                <th className="pb-2 pr-3 font-semibold">Surface</th>
                <th className="pb-2 pr-3 font-semibold">Viewport</th>
                <th className="pb-2 pr-3 font-semibold">Violations</th>
                <th className="pb-2 pr-3 font-semibold">Elements</th>
                <th className="pb-2 pr-3 font-semibold">Passes</th>
                <th className="pb-2 text-right font-semibold">Score</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.scanId} className="border-b border-slate-100 last:border-0">
                  <td className="max-w-72 truncate py-2 pr-3">
                    <DetailLink scanId={s.scanId} surface={s.surface}>
                      {s.name}
                    </DetailLink>
                  </td>
                  <td className="py-2 pr-3">
                    <SurfaceTag surface={s.surface} label={surfaceLabel(s.surface)} />
                  </td>
                  <td className="py-2 pr-3 text-slate-600">{s.viewport}</td>
                  <td className="py-2 pr-3 tabular-nums text-slate-600">
                    {s.counts.violations}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-slate-600">
                    {s.counts.violationNodes}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-slate-600">{s.counts.passes}</td>
                  <td className="py-2 text-right">
                    <ScorePill score={s.score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
