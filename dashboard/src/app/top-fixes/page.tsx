import { getRankedIssues, explain, wcagLabel, surfaceLabel, IMPACT_WEIGHTS, totalXpAvailable } from "@/lib/data";
import { Card, ImpactBadge, SurfaceTag, DetailLink, XPChip } from "@/components/ui";

export const metadata = { title: "Quest Board — A11y Watchdog" };

export default function TopFixesPage() {
  const issues = getRankedIssues();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Quest Board</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every unique rule failure across all scans, ranked by impact weight ×
          affected elements. Complete quests from the top for the biggest wins —{" "}
          <span className="font-bold text-navy tabular-nums">{totalXpAvailable()} XP</span>{" "}
          up for grabs.
        </p>
      </div>

      <ol className="space-y-6">
        {issues.map((issue, i) => {
          const ex = explain(issue.ruleId, issue.description);
          return (
            <li key={issue.ruleId}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-light text-sm font-bold text-teal-dark"
                    >
                      {i + 1}
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-navy">{issue.help}</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <code className="rounded bg-slate-100 px-1">{issue.ruleId}</code>{" "}
                        · {issue.wcagTags.map(wcagLabel).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ImpactBadge impact={issue.impact} />
                    <XPChip xp={issue.priority} />
                    <span className="text-xs text-slate-500">
                      ({IMPACT_WEIGHTS[issue.impact]} impact × {issue.totalNodes} elements)
                    </span>
                  </div>
                </div>

                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Why it matters
                    </dt>
                    <dd className="mt-1 text-sm text-slate-700">{ex.why}</dd>
                  </div>
                  <div className="rounded-lg bg-teal-light p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-teal-dark">
                      How to fix
                    </dt>
                    <dd className="mt-1 text-sm text-slate-700">{ex.fix}</dd>
                  </div>
                </dl>

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-teal">
                    Affected scans ({issue.affectedScans.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm">
                    {issue.affectedScans.map((s) => (
                      <li key={`${s.scanId}-${s.viewport}`} className="flex flex-wrap items-center gap-2">
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
                  className="mt-4 inline-block text-sm font-medium text-teal underline-offset-2 hover:underline"
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
