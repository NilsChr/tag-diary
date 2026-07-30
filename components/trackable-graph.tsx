"use client";

import { useMemo } from "react";
import { format, parseISO, eachDayOfInterval, subDays } from "date-fns";
import { type Entry, getBaseTag } from "@/lib/db";
import { useTagColors } from "@/lib/tag-colors";

function buildSmoothPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]},${points[0][1]}`;
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const cpx = (x0 + x1) / 2;
    d += ` C ${cpx},${y0} ${cpx},${y1} ${x1},${y1}`;
  }
  return d;
}

interface TrackableData {
  base: string;
  points: { date: string; value: number; x: number; y: number }[];
  min: number;
  max: number;
  latest: number;
  linePath: string;
}

function buildTrackables(
  entries: Entry[],
  filterTags: string[],
  rangeStart?: Date,
  rangeEnd?: Date
): TrackableData[] {
  const W = 800;
  const H = 60;
  const PT = 10;
  const PB = 10;
  const innerH = H - PT - PB;

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const end = rangeEnd ?? new Date();
  const start =
    rangeStart ??
    (() => {
      const firstDate = sorted.length > 0 ? parseISO(sorted[0].date) : subDays(end, 29);
      return firstDate < subDays(end, 89) ? subDays(end, 89) : firstDate;
    })();
  const [startDate, endDate] = start > end ? [end, start] : [start, end];
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const totalDays = days.length;

  const dateToX = (dateStr: string) => {
    const idx = days.findIndex((d) => format(d, "yyyy-MM-dd") === dateStr);
    if (idx === -1) return -1;
    return totalDays <= 1 ? W / 2 : (idx / (totalDays - 1)) * W;
  };

  return filterTags
    .map((ft) => {
      const base = getBaseTag(ft);
      const seen = new Map<string, number>();

      for (const entry of entries) {
        for (const tag of entry.tags) {
          if (tag.startsWith(base + ":")) {
            const val = parseFloat(tag.slice(base.length + 1));
            if (!isNaN(val)) seen.set(entry.date, val);
          }
        }
      }

      if (seen.size === 0) return null;

      const raw = Array.from(seen.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value }));

      const values = raw.map((p) => p.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;

      const points = raw
        .map(({ date, value }) => {
          const x = dateToX(date);
          if (x === -1) return null;
          const y = PT + (1 - (value - min) / range) * innerH;
          return { date, value, x, y };
        })
        .filter(Boolean) as { date: string; value: number; x: number; y: number }[];

      const linePath = buildSmoothPath(points.map((p) => [p.x, p.y]));

      return { base, points, min, max, latest: raw[raw.length - 1].value, linePath };
    })
    .filter(Boolean) as TrackableData[];
}

function SingleTrackableGraph({ data }: { data: TrackableData }) {
  const colors = useTagColors();
  const color = colors?.get(data.base);
  const W = 800;
  const H = 60;

  const stroke = color ?? "currentColor";

  return (
    <div className="-mx-4">
      <div className="flex items-baseline justify-between px-4 mb-0.5">
        <span className="text-xs font-medium text-muted-foreground">{data.base}</span>
        <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
          <span>↓ {data.min}</span>
          <span>↑ {data.max}</span>
          <span className="font-semibold" style={{ color: color }}>
            latest: {data.latest}
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full block"
        style={{ height: 52 }}
        aria-hidden="true"
      >
        <defs>
          {/* userSpaceOnUse so a flat line (constant value) doesn't break the gradient */}
          <linearGradient id={`tg-${data.base}`} x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.4" />
            <stop offset="50%" stopColor={stroke} stopOpacity="1" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.4" />
          </linearGradient>
        </defs>

        <path
          d={data.linePath}
          fill="none"
          stroke={`url(#tg-${data.base})`}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

interface TrackableGraphProps {
  entries: Entry[];
  filterTags: string[];
  rangeStart?: Date;
  rangeEnd?: Date;
}

export function TrackableGraph({ entries, filterTags, rangeStart, rangeEnd }: TrackableGraphProps) {
  const trackables = useMemo(
    () => buildTrackables(entries, filterTags, rangeStart, rangeEnd),
    [entries, filterTags, rangeStart, rangeEnd]
  );

  if (trackables.length === 0) return null;

  return (
    <div className="space-y-3 mb-4">
      {trackables.map((data) => (
        <SingleTrackableGraph key={data.base} data={data} />
      ))}
    </div>
  );
}
