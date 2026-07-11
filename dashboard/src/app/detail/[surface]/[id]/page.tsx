import { notFound } from "next/navigation";
import { getAllScans, getScan, explain, wcagLabel, surfaceLabel } from "@/lib/data";
import { Card, ScoreRing, ImpactBadge, SurfaceTag } from "@/components/ui";

export function generateStaticParams() {
  return getAllScans().map((s) => ({ surface: s.surface, id: s.scanId }));
}

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ surface: string; id: string }>;
}) {
  const { id } = await params;
  const scan = getScan(decodeURIComponent(id));
  if (!scan) notFound();

  return (
    <div className="space-y-8">
      <Card className="flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-navy">{scan.name}</h1>
            <SurfaceTag surface={scan.surface} label={surfaceLabel(scan.surface)} />
          </div>
          <p className="mt-1.5 break-all text-sm text-slate-500">
            {scan.url} · {scan.viewport} viewport · scanned{" "}
            {new Date(scan.timestamp).toLocaleString("en-AU", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <p className="mt-3 text-sm text-slate-600">
            <span className="font-bold tabular-nums">{scan.counts.violations}</span> rule
            failures affecting{" "}
            <span className="font-bold tabular-nums">{scan.counts.violationNodes}</span> elements
            · <span className="font-bold tabular-nums">{scan.counts.passes}</span> checks passed
            · <span className="font-bold tabular-nums">{scan.counts.incomplete}</span> need
            manual review
          </p>
        </div>
        <ScoreRing score={scan.score} size={120} label="Page score" />
      </Card>

      {scan.violations.length === 0 ? (
        <Card className="text-center">
          <p aria-hidden="true" className="text-4xl">
            ✨
          </p>
          <p className="mt-2 text-sm text-slate-600">
            No automated violations found. Manual testing (keyboard, screen reader, zoom) is
            still recommended.
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          {scan.violations.map((v) => {
            const ex = explain(v.id, v.description);
            return (
              <Card key={v.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-navy">{v.help}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      <code className="rounded bg-slate-100 px-1 py-px">{v.id}</code> ·{" "}
                      {v.wcagTags.map(wcagLabel).join(" · ")}
                    </p>
                  </div>
                  <ImpactBadge impact={v.impact} />
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

                <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Affected elements ({v.nodes.length})
                </h3>
                <ul className="mt-2 space-y-3">
                  {v.nodes.map((n, i) => (
                    <li key={i} className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                      <p className="border-b border-slate-100 bg-slate-50 px-3.5 py-2 font-mono text-xs text-slate-600">
                        {n.selector}
                      </p>
                      <pre className="overflow-x-auto bg-white px-3.5 py-2.5 text-xs leading-relaxed text-slate-700">
                        {n.html}
                      </pre>
                    </li>
                  ))}
                </ul>

                <a
                  href={v.helpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-sm font-semibold text-teal-dark underline-offset-2 hover:text-teal hover:underline"
                >
                  Full remediation guide (Deque University) ↗
                </a>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
