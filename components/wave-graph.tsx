"use client";

import { useMemo } from "react";
import { eachDayOfInterval, format, parseISO, subDays } from "date-fns";
import { type Entry } from "@/lib/db";

function buildSmoothPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const [x, y] = points[0];
    return `M 0,${y} L ${x},${y}`;
  }
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const cpx = (x0 + x1) / 2;
    d += ` C ${cpx},${y0} ${cpx},${y1} ${x1},${y1}`;
  }
  return d;
}

interface WaveGraphProps {
  entries: Entry[];
  rangeStart?: Date;
  rangeEnd?: Date;
}

export function WaveGraph({ entries, rangeStart, rangeEnd }: WaveGraphProps) {
  const { points, W, H } = useMemo(() => {
    const W = 800;
    const H = 60;
    const PT = 8;
    const PB = 8;
    const innerH = H - PT - PB;

    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

    const end = rangeEnd ?? new Date();
    const start =
      rangeStart ??
      (() => {
        const firstDate =
          sorted.length > 0 ? parseISO(sorted[0].date) : subDays(end, 29);
        return firstDate < subDays(end, 89) ? subDays(end, 89) : firstDate;
      })();
    const [startDate, endDate] = start > end ? [end, start] : [start, end];

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const entryMap = new Map(sorted.map((e) => [e.date, e.rating]));

    const data = days.map((d) => {
      const k = format(d, "yyyy-MM-dd");
      return { rating: entryMap.get(k) ?? 5 };
    });

    const n = data.length;
    const points: [number, number][] = data.map((d, i) => [
      n <= 1 ? W / 2 : (i / (n - 1)) * W,
      PT + (1 - d.rating / 10) * innerH,
    ]);

    return { points, W, H };
  }, [entries, rangeStart, rangeEnd]);

  const linePath = buildSmoothPath(points);

  return (
    <div className="-mx-4 -mt-6 mb-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full block"
        style={{ height: 56 }}
        aria-hidden="true"
      >
        <defs>
          {/* userSpaceOnUse: a flat line has zero bounding-box height, which silently breaks the default objectBoundingBox */}
          <linearGradient id="wg-stroke" x1="0" y1="8" x2="0" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        <path
          d={linePath}
          fill="none"
          stroke="url(#wg-stroke)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
