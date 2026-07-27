"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { parseISO } from "date-fns";
import { SlidersHorizontal, Plus } from "lucide-react";
import { db, type Entry } from "@/lib/db";
import { EntryCard } from "@/components/entry-card";
import { WaveGraph } from "@/components/wave-graph";
import { TrackableGraph } from "@/components/trackable-graph";
import { FilterSheet } from "@/components/filter-sheet";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    db.entries
      .orderBy("date")
      .reverse()
      .toArray()
      .then((rows) => {
        setEntries(rows);
        setLoading(false);
      });
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      for (const t of e.tags) {
        const [base, rest] = t.split(":");
        // Collapse trackable tags (base:number) to just the base
        set.add(rest !== undefined && !isNaN(parseFloat(rest)) ? base : t);
      }
    }
    return Array.from(set).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const tagMatch =
        filterTags.length === 0 ||
        filterTags.some((ft) => e.tags.some((t) => t === ft || t.startsWith(ft + ":")));
      const dateMatch = (!dateFrom || e.date >= dateFrom) && (!dateTo || e.date <= dateTo);
      return tagMatch && dateMatch;
    });
  }, [entries, filterTags, dateFrom, dateTo]);

  const isFiltered = filterTags.length > 0 || !!dateFrom || !!dateTo;
  const filterCount = filterTags.length + (dateFrom || dateTo ? 1 : 0);
  const rangeStart = dateFrom ? parseISO(dateFrom) : undefined;
  const rangeEnd = dateTo ? parseISO(dateTo) : undefined;

  return (
    <div>
      <WaveGraph entries={filteredEntries} rangeStart={rangeStart} rangeEnd={rangeEnd} />
      <TrackableGraph
        entries={filteredEntries}
        filterTags={filterTags}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
      />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold flex-1">Journal</h1>
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors",
              isFiltered
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {isFiltered ? `Filter (${filterCount})` : "Filter"}
          </button>
          <Link href="/entry/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            New
          </Link>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            {isFiltered ? (
              <p className="text-muted-foreground">No entries match the selected tags.</p>
            ) : (
              <>
                <p className="text-muted-foreground">No entries yet.</p>
                <Link href="/entry/new" className={buttonVariants({ variant: "outline" })}>
                  Write your first entry
                </Link>
              </>
            )}
          </div>
        ) : (
          <div>
            {filteredEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        allTags={allTags}
        filterTags={filterTags}
        onFilterChange={setFilterTags}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateRangeChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
      />
    </div>
  );
}
