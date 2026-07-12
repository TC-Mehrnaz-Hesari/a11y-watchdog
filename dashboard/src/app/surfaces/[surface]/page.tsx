import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getSurfaceSummaries,
  getScansForSurface,
  getRankedIssues,
  countNodesByImpact,
  surfaceLabel,
} from "@/lib/data";
import {
  Card,
  StatTile,
  ScoreRing,
  GradeBadge,
  ImpactBar,
  ImpactBadge,
  XPChip,
  RankChip,
  ScanTable,
  Breadcrumbs,
} from "@/components/ui";

export function generateStaticParams() {
  return getSurfaceSummaries().map((s) => ({ surface: s.surface }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ surface: string }>;
}) {
  const { surface } = await params;
  return { title: `${surfaceLabel(decodeURIComponent(surface))} — A11y Watchdog` };
}

export default async function SurfacePage({
  params,
}: {
  params: Promise<{ surface: string }>;
}) {
  const { surface: raw } = await params;
  const surface = decodeURIComponent(raw);
  const summary = getSurfaceSummaries().find((s) => s.surface === surface);
  if (!summary) notFound();

  const scans = getScansForSurface(surface);
  const impactCounts = countNodesByImpact(scans);
  const issues = getRankedIssues(scans);
  const topIssues = issues.slice(0, 5);

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ href: "/", label: "Overview" }, { label: summary.label }]} />

      {/* Surface hero */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="flex flex-col items-center justify-center gap-4">
          <ScoreRing score={summary.score} size={150} label="Surface score" />
          <GradeBadge score={summary.score} size="lg" />
        </Card>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-navy">{summary.label}</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {scans.length} scans · {issues.length} unique rule failures
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <StatTile value={scans.length} label="Pages & components scanned" />
            <StatTile
              value={summary.violationNodes}
              label="Affected elements"
              tone={summary.violationNodes > 0 ? "warn" : "good"}
            />
            <StatTile
              value={summary.criticalCount}
              label="Critical elements"
              tone={summary.criticalCount > 0 ? "bad" : "good"}
            />
            <StatTile
              value={summary.seriousCount}
              label="Serious elements"
              tone={summary.seriousCount > 0 ? "warn" : "good"}
            />
          </div>
          <Card title="Affected elements by impact" className="flex-1">
            <ImpactBar counts={impactCounts} />
          </Card>
        </div>
      </div>

      {/* Top issues scoped to this surface */}
      <Card
        title={`Top quests on ${summary.label}`}
        action={
          <Link
            href="/top-fixes"
            className="text-xs font-bold text-teal-dark underline-offset-2 hover:underline"
          >
            Full quest board →
          </Link>
        }
      >
        {topIssues.length === 0 ? (
          <p className="text-sm text-slate-500">
            No automated violations on this surface. ✨
          </p>
        ) : (
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
        )}
      </Card>

      {/* Every scan on this surface */}
      <Card title={`All scans on ${summary.label}`}>
        <ScanTable scans={scans} showSurface={false} />
      </Card>
    </div>
  );
}
