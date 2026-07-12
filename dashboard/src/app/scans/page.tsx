import { getAllScans, getSurfaceSummaries, surfaceLabel } from "@/lib/data";
import { Card, FilterChip, ScanTable } from "@/components/ui";

export const metadata = { title: "All Scans — A11y Watchdog" };

const VIEWPORTS = ["desktop", "mobile"];

function filterHref(surface?: string, viewport?: string) {
  const params = new URLSearchParams();
  if (surface) params.set("surface", surface);
  if (viewport) params.set("viewport", viewport);
  const qs = params.toString();
  return qs ? `/scans?${qs}` : "/scans";
}

export default async function ScansPage({
  searchParams,
}: {
  searchParams: Promise<{ surface?: string; viewport?: string }>;
}) {
  const { surface, viewport } = await searchParams;
  const surfaces = getSurfaceSummaries();

  const scans = getAllScans().filter(
    (s) => (!surface || s.surface === surface) && (!viewport || s.viewport === viewport)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-navy">All Scans</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Every scanned page and component, worst score first. Filter by surface and viewport.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by surface">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Surface
          </span>
          <FilterChip href={filterHref(undefined, viewport)} active={!surface}>
            All
          </FilterChip>
          {surfaces.map((s) => (
            <FilterChip
              key={s.surface}
              href={filterHref(s.surface, viewport)}
              active={surface === s.surface}
            >
              {s.label}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by viewport">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Viewport
          </span>
          <FilterChip href={filterHref(surface, undefined)} active={!viewport}>
            All
          </FilterChip>
          {VIEWPORTS.map((v) => (
            <FilterChip key={v} href={filterHref(surface, v)} active={viewport === v}>
              {v}
            </FilterChip>
          ))}
        </div>
      </div>

      <Card
        title={`${scans.length} scan${scans.length === 1 ? "" : "s"}${
          surface ? ` · ${surfaceLabel(surface)}` : ""
        }${viewport ? ` · ${viewport}` : ""}`}
      >
        <ScanTable scans={scans} showSurface={!surface} />
      </Card>
    </div>
  );
}
