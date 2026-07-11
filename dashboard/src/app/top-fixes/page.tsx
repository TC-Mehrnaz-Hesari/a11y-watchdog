import {
  getRankedIssues,
  explain,
  wcagLabel,
  surfaceLabel,
  IMPACT_WEIGHTS,
  totalXpAvailable,
} from "@/lib/data";
import {
  Card,
  ImpactBadge,
  SurfaceTag,
  DetailLink,
  XPChip,
  RankChip,
} from "@/components/ui";

export const metadata = { title: "Quest Board — A11y Watchdog" };

export default function TopFixesPage() {
  const issues = getRankedIssues();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-navy">Quest Board</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
          Every unique rule failure across all scans, ranked by impact weight × affected
          elements. Complete quests from the top for the biggest wins —{" "}
          <span className="font-bold text-navy tabular-nums">{totalXpAvailable()} XP</span> up for
          grabs.
        </p>
      </div>

      <ol className="space-y-5">
        {issues.map((issue, i) => {
          const ex = explain(issue.ruleId, issue.description);
          return (
            <li key={issue.ruleId}>
              <Card className="transition-shadow hover:shadow-card-hover">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <RankChip rank={i + 1} />
                    <div>
                      <h2 className="text-base font-bold text-navy">{issue.help}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        <code className="rounded bg-slate-100 px-1 py-px">{issue.ruleId}</code> ·{" "}
                        {issue.wcagTags.map(wcagLabel).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <ImpactBadge impact={issue.impact} />
                    <XPChip xp={issue.priority} />
                    <span className="whitespace-nowrap text-xs text-slate-400">
                      {IMPACT_WEIGHTS[issue.impact]} impact × {issue.totalNodes} elements
                    </span>
                  </div>
                </div>

                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Why it matters
                    </dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-slate-700">{ex.why}</dd>
                  </div>
                  <div className="rounded-xl bg-teal-light p-4 ring-1 ring-teal/15">
                    <dt className="text-xs font-bold uppercase tracking-wider text-teal-dark">
                      How to fix
                    </dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-slate-700">{ex.fix}</dd>
                  </div>
                </dl>

                <details className="mt-4 group">
                  <summary className="cursor-pointer text-sm font-semibold text-teal-dark hover:text-teal">
                    Affected scans ({issue.affectedScans.length})
                  </summary>
                  <ul className="mt-3 space-y-1.5 rounded-xl bg-slate-50/70 p-4 text-sm ring-1 ring-slate-100">
                    {issue.affectedScans.map((s) => (
                      <li
                        key={`${s.scanId}-${s.viewport}`}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <DetailLink scanId={s.scanId} surface={s.surface}>
                          {s.name}
                        </DetailLink>
                        <SurfaceTag surface={s.surface} label={surfaceLabel(s.surface)} />
                        <span className="text-xs text-slate-500">
                          {s.viewport} · {s.nodeCount} element{s.nodeCount === 1 ? "" : "s"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>

                <a
                  href={issue.helpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-sm font-semibold text-teal-dark underline-offset-2 hover:text-teal hover:underline"
                >
                  Full remediation guide (Deque University) ↗
                </a>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
