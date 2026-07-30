"use client";

import { useMemo } from "react";
import {
  eachDayOfInterval,
  endOfWeek,
  endOfYear,
  format,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { type Entry } from "@/lib/db";
import { ratingBgColor } from "@/components/rating-display";
import { cn } from "@/lib/utils";

interface ActivityHeatmapProps {
  entries: Entry[];
}

interface Day {
  key: string;
  date: Date;
  inRange: boolean;
  rating: number | undefined;
}

export function ActivityHeatmap({ entries }: ActivityHeatmapProps) {
  const { days, numWeeks, monthLabels } = useMemo(() => {
    const now = new Date();
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);
    const gridStart = startOfWeek(yearStart);
    const gridEnd = endOfWeek(yearEnd);

    const ratingByDate = new Map(entries.map((e) => [e.date, e.rating]));

    const days: Day[] = eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => {
      const key = format(date, "yyyy-MM-dd");
      return {
        key,
        date,
        inRange: date >= yearStart && date <= yearEnd,
        rating: ratingByDate.get(key),
      };
    });

    const numWeeks = days.length / 7;

    const monthLabels: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    days.forEach((day, i) => {
      if (!day.inRange) return;
      const month = day.date.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ weekIndex: Math.floor(i / 7), label: format(day.date, "MMM") });
        lastMonth = month;
      }
    });

    return { days, numWeeks, monthLabels };
  }, [entries]);

  return (
    <div className="w-full">
      <div
        className="grid gap-[2px] mb-1"
        style={{ gridTemplateColumns: `repeat(${numWeeks}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: numWeeks }, (_, i) => (
          <div key={i} className="text-[9px] text-muted-foreground leading-none">
            {monthLabels.find((m) => m.weekIndex === i)?.label ?? ""}
          </div>
        ))}
      </div>
      <div
        className="grid gap-[2px]"
        style={{
          gridTemplateColumns: `repeat(${numWeeks}, minmax(0, 1fr))`,
          gridTemplateRows: "repeat(7, minmax(0, 1fr))",
          gridAutoFlow: "column",
        }}
      >
        {days.map((day) => (
          <div
            key={day.key}
            title={
              day.inRange
                ? `${format(day.date, "d MMM yyyy")}${day.rating !== undefined ? ` — ${day.rating}/10` : ""}`
                : undefined
            }
            className={cn(
              "aspect-square rounded-[1px]",
              !day.inRange
                ? "invisible"
                : day.rating !== undefined
                  ? ratingBgColor(day.rating)
                  : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}
