import { notFound } from "next/navigation";
import {
  getAllScans,
  getScan,
  explain,
  wcagLabel,
  SURFACE_LABELS,
} from "@/lib/data";
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
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-navy">{scan.name}</h1>
            <SurfaceTag
              surface={scan.surface}
              label={SURFACE_LABELS[scan.surface] ?? scan.surface}
            />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {scan.url} · {scan.viewport} viewport · scanned{" "}
            {new Date(scan.timestamp).toLocaleString("en-AU", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <p className="mt-3 text-sm text-slate-600">
            <span className="font-semibold tabular-nums">{scan.counts.violations}</span>{" "}
            rule failures affecting{" "}
            <span className="font-semibold tabular-nums">{scan.counts.violationNodes}</span>{" "}
            elements ·{" "}
            <span className="font-semibold tabular-nums">{scan.counts.passes}</span> checks
            passed ·{" "}
            <span className="font-semibold tabular-nums">{scan.counts.incomplete}</span>{" "}
            need manual review
          </p>
        </div>
        <ScoreRing score={scan.score} size={110} label="Page score" />
      </div>

      {scan.violations.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            No automated violations found. Manual testing (keyboard, screen reader,
            zoom) is still recommended.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {scan.violations.map((v) => {
            const ex = explain(v.id, v.description);
            return (
              <Card key={v.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-navy">{v.help}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <code className="rounded bg-slate-100 px-1">{v.id}</code> ·{" "}
                      {v.wcagTags.map(wcagLabel).join(" · ")}
                    </p>
                  </div>
                  <ImpactBadge impact={v.impact} />
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

                <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Affected elements ({v.nodes.length})
                </h3>
                <ul className="mt-2 space-y-3">
                  {v.nodes.map((n, i) => (
                    <li key={i} className="rounded-lg border border-slate-200">
                      <p className="border-b border-slate-100 px-3 py-2 font-mono text-xs text-slate-600">
                        {n.selector}
                      </p>
                      <pre className="overflow-x-auto px-3 py-2 text-xs text-slate-700">
                        {n.html}
                      </pre>
                    </li>
                  ))}
                </ul>

                <a
                  href={v.helpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-sm font-medium text-teal underline-offset-2 hover:underline"
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
