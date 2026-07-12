import {
  getAllScans,
  getScansForSurface,
  getRankedIssues,
  getSurfaceSummaries,
  explain,
  wcagLabel,
  surfaceLabel,
  IMPACT_WEIGHTS,
  IMPACT_ORDER,
} from "@/lib/data";
import {
  Card,
  ImpactBadge,
  SurfaceTag,
  DetailLink,
  XPChip,
  RankChip,
  FilterChip,
} from "@/components/ui";
import { getClaims, questIssueUrl } from "@/lib/quests";
import { claimQuest, releaseQuest } from "./actions";

export const metadata = { title: "Quest Board — A11y Watchdog" };

function filterHref(impact?: string, surface?: string) {
  const params = new URLSearchParams();
  if (impact) params.set("impact", impact);
  if (surface) params.set("surface", surface);
  const qs = params.toString();
  return qs ? `/top-fixes?${qs}` : "/top-fixes";
}

export default async function TopFixesPage({
  searchParams,
}: {
  searchParams: Promise<{ impact?: string; surface?: string }>;
}) {
  const { impact, surface } = await searchParams;
  const surfaces = getSurfaceSummaries();
  const claims = getClaims();

  const scans = surface ? getScansForSurface(surface) : getAllScans();
  const allIssues = getRankedIssues(scans);
  const issues = impact ? allIssues.filter((i) => i.impact === impact) : allIssues;
  const xp = issues.reduce((a, i) => a + i.priority, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-navy">Quest Board</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
          Every unique rule failure{surface ? ` on ${surfaceLabel(surface)}` : " across all scans"},
          ranked by impact weight × affected elements. Complete quests from the top for the
          biggest wins — <span className="font-bold text-navy tabular-nums">{xp} XP</span> up
          for grabs.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by impact">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Impact
          </span>
          <FilterChip href={filterHref(undefined, surface)} active={!impact}>
            All
          </FilterChip>
          {IMPACT_ORDER.map((k) => (
            <FilterChip key={k} href={filterHref(k, surface)} active={impact === k}>
              <span className="capitalize">{k}</span>
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by surface">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Surface
          </span>
          <FilterChip href={filterHref(impact, undefined)} active={!surface}>
            All
          </FilterChip>
          {surfaces.map((s) => (
            <FilterChip
              key={s.surface}
              href={filterHref(impact, s.surface)}
              active={surface === s.surface}
            >
              {s.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {issues.length === 0 ? (
        <Card className="text-center">
          <p aria-hidden="true" className="text-4xl">
            🐾
          </p>
          <p className="mt-2 text-sm text-slate-600">
            No quests match the current filters — the watchdog approves.
          </p>
        </Card>
      ) : (
        <ol className="space-y-5">
          {issues.map((issue, i) => {
            const ex = explain(issue.ruleId, issue.description);
            const claim = claims[issue.ruleId];
            return (
              <li key={issue.ruleId}>
                <Card className="transition-shadow hover:shadow-card-hover">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <RankChip rank={i + 1} />
                      <div>
                        <h2 className="text-base font-bold text-navy">{issue.help}</h2>
                        <p className="mt-1 text-xs text-slate-500">
                          <code className="rounded bg-slate-100 px-1 py-px">{issue.ruleId}</code>{" "}
                          · {issue.wcagTags.map(wcagLabel).join(" · ")}
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

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-slate-100 pt-4">
                    {claim ? (
                      <form action={releaseQuest} className="flex items-center gap-2.5">
                        <input type="hidden" name="ruleId" value={issue.ruleId} />
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-light px-3 py-1 text-xs font-bold text-navy">
                          🐾 Claimed by {claim.owner}
                        </span>
                        <button
                          type="submit"
                          className="text-xs font-semibold text-slate-400 underline-offset-2 hover:text-bad hover:underline"
                        >
                          Release
                        </button>
                      </form>
                    ) : (
                      <form action={claimQuest} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="ruleId" value={issue.ruleId} />
                        <label htmlFor={`owner-${issue.ruleId}`} className="sr-only">
                          Your name
                        </label>
                        <input
                          id={`owner-${issue.ruleId}`}
                          name="owner"
                          required
                          maxLength={40}
                          placeholder="Your name"
                          className="w-36 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-teal px-3 py-1.5 text-sm font-bold text-white transition hover:bg-teal-dark"
                        >
                          Claim quest 🐾
                        </button>
                      </form>
                    )}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold">
                      <a
                        href={questIssueUrl(issue)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-dark underline-offset-2 hover:text-teal hover:underline"
                      >
                        File GitHub issue ↗
                      </a>
                      <a
                        href={issue.helpUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-dark underline-offset-2 hover:text-teal hover:underline"
                      >
                        Remediation guide ↗
                      </a>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
