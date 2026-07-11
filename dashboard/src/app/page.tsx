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
  StatTile,
  ScoreRing,
  ScorePill,
  ImpactBar,
  ImpactBadge,
  SurfaceTag,
  DetailLink,
  GradeBadge,
  XPChip,
  Medal,
  RankChip,
  Th,
  Td,
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
  const totalNodes = scans.reduce((a, s) => a + s.counts.violationNodes, 0);
  const criticalNodes = impactCounts.critical ?? 0;
  const lastScan = scans
    .map((s) => s.timestamp)
    .sort()
    .at(-1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-navy">
          Accessibility Overview
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          {scans.length} scans across {surfaces.length} surfaces · last scan{" "}
          {lastScan
            ? new Date(lastScan).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })
            : "—"}
        </p>
      </div>

      {/* Hero: overall score + estate stats + impact mix */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="flex flex-col items-center justify-center gap-4">
          <ScoreRing score={overall} size={160} label="Overall score" />
          <div className="flex items-center gap-2.5">
            <GradeBadge score={overall} size="lg" />
            <span className="text-xs leading-snug text-slate-500">
              current grade
              <span className="mt-0.5 block">
                <span className="font-bold text-navy tabular-nums">{xpAvailable} XP</span> up for
                grabs
              </span>
            </span>
          </div>
        </Card>
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <StatTile value={scans.length} label="Pages & components scanned" />
            <StatTile value={surfaces.length} label="Surfaces monitored" />
            <StatTile
              value={totalNodes}
              label="Affected elements"
              tone={totalNodes > 0 ? "warn" : "good"}
            />
            <StatTile
              value={criticalNodes}
              label="Critical elements"
              tone={criticalNodes > 0 ? "bad" : "good"}
            />
          </div>
          <Card title="Affected elements by impact" className="flex-1">
            <ImpactBar counts={impactCounts} />
          </Card>
        </div>
      </div>

      {/* Surface leaderboard */}
      <Card title="Surface leaderboard">
        <ul className="divide-y divide-slate-100">
          {leaderboard.map((s, rank) => (
            <li key={s.surface} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
              <span className="w-8 shrink-0 text-center">
                <Medal rank={rank} />
              </span>
              <div className="min-w-40 flex-1">
                <SurfaceTag surface={s.surface} label={s.label} />
                <p className="mt-1 text-xs text-slate-500">
                  {s.scanCount} scans · {s.violationNodes} affected elements
                </p>
              </div>
              <p className="text-xs text-slate-500">
                <span className="font-bold text-bad tabular-nums">{s.criticalCount}</span> critical
                {" · "}
                <span className="font-bold text-warn tabular-nums">{s.seriousCount}</span> serious
              </p>
              <div className="flex items-center gap-3">
                <GradeBadge score={s.score} />
                <ScorePill score={s.score} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Badges */}
      <Card title="Achievements">
        <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {badges.map((b) => (
            <li
              key={b.name}
              title={b.description}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-4 text-center ring-1 transition-shadow ${
                b.earned
                  ? "bg-teal-light ring-teal/25 shadow-sm"
                  : "bg-slate-50 ring-slate-200 opacity-45 grayscale"
              }`}
            >
              <span aria-hidden="true" className="text-3xl">
                {b.emoji}
              </span>
              <span className="text-xs font-bold text-navy">{b.name}</span>
              <span className="text-[10px] leading-tight text-slate-500">{b.description}</span>
              <span className="sr-only">{b.earned ? "Earned" : "Locked"}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Worst offenders */}
        <Card title="Worst offenders">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <Th>Page / component</Th>
                <Th>Surface</Th>
                <Th>Issues</Th>
                <Th align="right">Score</Th>
              </tr>
            </thead>
            <tbody>
              {worst.map((s) => (
                <tr
                  key={s.scanId}
                  className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/60"
                >
                  <Td className="max-w-52 truncate">
                    <DetailLink scanId={s.scanId} surface={s.surface}>
                      {s.name}
                    </DetailLink>
                    <span className="ml-1.5 text-xs text-slate-400">{s.viewport}</span>
                  </Td>
                  <Td>
                    <SurfaceTag surface={s.surface} label={surfaceLabel(s.surface)} />
                  </Td>
                  <Td className="tabular-nums text-slate-600">{s.counts.violationNodes}</Td>
                  <Td align="right">
                    <ScorePill score={s.score} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Top quests preview */}
        <Card
          title="Top quests"
          action={
            <Link
              href="/top-fixes"
              className="text-xs font-bold text-teal-dark underline-offset-2 hover:underline"
            >
              Quest board →
            </Link>
          }
        >
          <ol className="space-y-4">
            {topIssues.map((issue, i) => (
              <li key={issue.ruleId} className="flex gap-3">
                <RankChip rank={i + 1} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-navy">{issue.help}</span>
                    <ImpactBadge impact={issue.impact} />
                    <XPChip xp={issue.priority} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {issue.totalNodes} elements across {issue.affectedScans.length} scans ·{" "}
                    <code className="rounded bg-slate-100 px-1 py-px">{issue.ruleId}</code>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* All scans */}
      <Card title="All scans">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <Th>Page / component</Th>
                <Th>Surface</Th>
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
                  <Td>
                    <SurfaceTag surface={s.surface} label={surfaceLabel(s.surface)} />
                  </Td>
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
        </div>
      </Card>
    </div>
  );
}
