// Every README image is one of these views, rendered at a fixed width and captured to SVG.
import { Area, AreaChart } from "@/components/charts/area-chart";
import { Grid } from "@/components/charts/grid";
import {
  HeatmapCells,
  HeatmapChart,
  HeatmapLegend,
  HeatmapXAxis,
  HeatmapYAxis,
} from "@/components/charts/heatmap";
import { Ring } from "@/components/charts/ring";
import { RingChart } from "@/components/charts/ring-chart";
import { SankeyChart, SankeyLink, SankeyNode } from "@/components/charts/sankey";
import { XAxis } from "@/components/charts/x-axis";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import data from "@/data.json";
import { projects } from "@/projects";
import sora from "@/vendor/sora-walk.json";

export const FULL = 840;
export const HALF = 412;

function Hero() {
  return (
    <Card className="relative gap-0 px-8 py-8">
      <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
        AI &amp; ML engineering student · India
      </div>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Shyam Jayasankar</h1>
      <p className="mt-3 max-w-[520px] text-base leading-relaxed text-muted-foreground">
        I build developer tools and computational research code: offline-first, tested, and
        honest about what they do.
      </p>
      <div className="mt-5 flex gap-2">
        <Badge variant="secondary">Developer tools</Badge>
        <Badge variant="secondary">Protein design</Badge>
        <Badge variant="secondary">On-device ML</Badge>
      </div>
      <svg
        data-sora
        viewBox={sora.viewBox}
        width={240}
        height={40}
        shapeRendering="crispEdges"
        className="absolute right-6 bottom-5"
        dangerouslySetInnerHTML={{ __html: sora.inner }}
      />
    </Card>
  );
}

function ProjectTile({ id }: { id: string }) {
  const p = projects.find((x) => x.id === id)!;
  return (
    <Card className="h-[208px] gap-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          {p.name}
          {p.status && (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {p.status}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="leading-snug">{p.tagline}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end gap-3">
        <div className="flex items-baseline gap-2">
          <span data-metric className="text-2xl font-semibold tracking-tight">
            {p.metric}
          </span>
          <span className="text-xs text-muted-foreground">{p.metricLabel}</span>
        </div>
        <div className="flex gap-1.5">
          {p.stack.map((s) => (
            <Badge key={s} variant="outline" className="font-normal">
              {s}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Heatmap() {
  // Drop a sliver of the first month (under 3 weeks) so its label doesn't collide with the next.
  const firstMonth = data.weeks[0][0].date.slice(0, 7);
  const lead = data.weeks.findIndex((days) => days[0].date.slice(0, 7) !== firstMonth);
  const columns = data.weeks.slice(lead > 0 && lead < 3 ? lead : 0).map((days, w) => ({
    bin: w,
    bins: days.map((d) => ({
      bin: new Date(d.date).getUTCDay(),
      count: d.contributionCount === 0 ? 0 : Math.min(4, Math.ceil(d.contributionCount / 3)),
      date: new Date(d.date),
    })),
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.totalContributions} contributions in the last year</CardTitle>
        <CardDescription>Public activity on GitHub, refreshed daily</CardDescription>
      </CardHeader>
      <CardContent>
        <HeatmapChart data={columns} weekStartDay={1} gap={3} animate={false}>
          <HeatmapCells interactive={false} cornerRadius={2} />
          <HeatmapXAxis />
          <HeatmapYAxis tickFilter="odd" labelFormat="full" />
        </HeatmapChart>
        <HeatmapLegend interactive={false} />
      </CardContent>
    </Card>
  );
}

function Activity() {
  const rows = data.months.map((m) => ({
    date: new Date(`${m.month}-01T00:00:00Z`),
    contributions: m.contributions,
    prs: m.prs,
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Last 12 months</CardTitle>
        <CardDescription>
          <span className="text-foreground">━</span> contributions &nbsp;
          <span style={{ color: "var(--sora)" }}>━</span> merged pull requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AreaChart data={rows} aspectRatio="3.6 / 1" margin={{ top: 12, right: 16, bottom: 28, left: 16 }}>
          <Grid horizontal numTicksRows={4} />
          <Area dataKey="contributions" fill="var(--chart-line-primary)" fillOpacity={0.25} showHighlight={false} />
          <Area dataKey="prs" fill="var(--chart-line-secondary)" fillOpacity={0.2} showHighlight={false} />
          <XAxis numTicks={6} />
        </AreaChart>
      </CardContent>
    </Card>
  );
}

const shades = ["var(--chart-scale-05)", "var(--chart-scale-04)", "var(--chart-scale-03)", "var(--chart-scale-02)", "var(--chart-scale-02)"];

function Languages() {
  const rings = data.languages.map((l, i) => ({
    label: l.name,
    value: l.share,
    maxValue: 100,
    color: i === 0 ? "var(--sora)" : shades[i],
  }));
  return (
    <Card className="h-[280px]">
      <CardHeader>
        <CardTitle>Languages</CardTitle>
        <CardDescription>Share of code in my own repositories</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-5">
        <div className="relative shrink-0">
          <RingChart data={rings} size={170} strokeWidth={8} ringGap={4} baseInnerRadius={40}>
            {rings.map((r, i) => (
              <Ring key={r.label} index={i} showGlow={false} />
            ))}
          </RingChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-semibold leading-none">{rings[0].value}%</span>
            <span className="mt-1 text-[10px] text-muted-foreground">{rings[0].label}</span>
          </div>
        </div>
        <ul className="flex flex-col gap-1.5 text-sm">
          {rings.map((r) => (
            <li key={r.label} className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-full" style={{ background: r.color }} />
              <span>{r.label}</span>
              <span className="text-muted-foreground tabular-nums">{r.value}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Stats() {
  const stats = [
    { value: data.prs.merged, label: "pull requests merged" },
    { value: data.prs.upstream, label: "merged into other people's repos" },
    { value: data.releases, label: `tagged releases across ${data.releasedRepos} projects` },
    { value: data.totalContributions, label: "contributions this year" },
  ];
  return (
    <Card className="h-[280px]">
      <CardHeader>
        <CardTitle>In numbers</CardTitle>
        <CardDescription>Counted from the GitHub API</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-4 gap-y-5">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5">
            <span data-metric className="text-3xl font-semibold tracking-tight tabular-nums">
              {s.value}
            </span>
            <span className="text-xs leading-snug text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PullRequestFlow() {
  const own = data.prs.byRepo.filter((r) => r.repo.toLowerCase().startsWith("sym-jay/"));
  const upstream = data.prs.byRepo.filter((r) => !r.repo.toLowerCase().startsWith("sym-jay/"));
  // Own forks of other projects (e.g. Sym-jay/seerr) fold into one "forks" node to keep it readable.
  const main = own.filter((r) => r.count >= 2);
  const minor = own.filter((r) => r.count < 2).reduce((a, r) => a + r.count, 0);
  const ownTargets = [...main.map((r) => ({ name: r.repo.split("/")[1], count: r.count })), ...(minor ? [{ name: "forks", count: minor }] : [])];
  const upTargets = upstream.map((r) => ({ name: r.repo.split("/")[1], count: r.count }));

  const ownTotal = ownTargets.reduce((a, t) => a + t.count, 0);
  const upTotal = upTargets.reduce((a, t) => a + t.count, 0);
  // Counts sit in the label itself: separate value lines collide on the thin 1-PR nodes.
  const label = (name: string, count: number) => `${name} · ${count}`;
  const nodes = [
    { name: label("Shyam", data.prs.merged), category: "source" as const },
    { name: label("My projects", ownTotal), category: "landing" as const },
    { name: label("Upstream", upTotal), category: "landing" as const },
    ...ownTargets.map((t) => ({ name: label(t.name, t.count), category: "outcome" as const })),
    ...upTargets.map((t) => ({ name: label(t.name, t.count), category: "outcome" as const })),
  ];
  const links = [
    { source: 0, target: 1, value: ownTotal },
    { source: 0, target: 2, value: upTotal },
    ...ownTargets.map((t, i) => ({ source: 1, target: 3 + i, value: t.count })),
    ...upTargets.map((t, i) => ({ source: 2, target: 3 + ownTargets.length + i, value: t.count })),
  ];
  const upstreamNames = new Set([nodes[2].name, ...upTargets.map((t) => label(t.name, t.count))]);
  const color = (name: string) => (upstreamNames.has(name) ? "var(--sora)" : "var(--chart-line-primary)");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where my {data.prs.merged} merged pull requests went</CardTitle>
        <CardDescription>
          {upTotal} landed in other people's repositories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SankeyChart data={{ nodes, links }} aspectRatio="2.3 / 1" nodeWidth={8} nodePadding={16} margin={{ top: 8, right: 130, bottom: 8, left: 90 }}>
          <SankeyLink
            strokeOpacity={0.35}
            useGradient={false}
            getLinkColor={(l) => color((l.target as { name: string }).name)}
          />
          <SankeyNode getNodeColor={(n) => color(n.name)} lineCap={2} showValueLabels={false} />
        </SankeyChart>
      </CardContent>
    </Card>
  );
}

export const views: Record<string, { width: number; render: () => React.ReactNode }> = {
  hero: { width: FULL, render: () => <Hero /> },
  ...Object.fromEntries(
    projects.map((p) => [`project-${p.id}`, { width: HALF, render: () => <ProjectTile id={p.id} /> }]),
  ),
  heatmap: { width: FULL, render: () => <Heatmap /> },
  activity: { width: FULL, render: () => <Activity /> },
  languages: { width: HALF, render: () => <Languages /> },
  stats: { width: HALF, render: () => <Stats /> },
  "prs-sankey": { width: FULL, render: () => <PullRequestFlow /> },
};
