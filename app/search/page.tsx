"use client";

import { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { db, getEntriesForTag, getTagStats, type Entry } from "@/lib/db";
import { EntryCard } from "@/components/entry-card";
import { TagBadge } from "@/components/tag-badge";
import { RatingDisplay } from "@/components/rating-display";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

function getAllTags(entries: Entry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) for (const t of e.tags) set.add(t);
  return Array.from(set).sort();
}

interface Stats {
  total: number;
  avgRating: number | null;
  byYear: Record<string, number>;
  byMonth: Record<string, number>;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [results, setResults] = useState<Entry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    db.entries.toArray().then((entries) => {
      setAllTags(getAllTags(entries));
      setAllEntries(entries);
    });
  }, []);

  const search = useCallback(async (tag: string) => {
    if (!tag.trim()) return;
    const [entries, s] = await Promise.all([
      getEntriesForTag(tag.trim()),
      getTagStats(tag.trim()),
    ]);
    setResults(entries);
    setStats(s);
    setSearched(true);
  }, []);

  const suggestions =
    showSuggestions && query
      ? allTags.filter((t) => t.includes(query.toLowerCase()))
      : [];

  const sortedMonths = stats
    ? Object.entries(stats.byMonth).sort(([a], [b]) => b.localeCompare(a))
    : [];

  const sortedYears = stats
    ? Object.entries(stats.byYear).sort(([a], [b]) => b.localeCompare(a))
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Search by Tag</h1>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="workout:jogging"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
          onKeyDown={(e) => { if (e.key === "Enter") { setShowSuggestions(false); search(query); } }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
          className="pl-9"
        />
        {suggestions.length > 0 && query && (
          <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-md max-h-48 overflow-auto">
            {suggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setQuery(tag);
                  setShowSuggestions(false);
                  search(tag);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
              >
                <TagBadge tag={tag} />
              </button>
            ))}
          </div>
        )}
      </div>

      {(searched ? results.length > 0 : allEntries.length > 0) && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {searched ? `Activity for ${query}` : "Activity"}
          </h2>
          <ActivityHeatmap entries={searched ? results : allEntries} />
        </div>
      )}

      {stats && searched && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Total</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Avg Rating</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {stats.avgRating !== null ? (
                <RatingDisplay rating={Math.round(stats.avgRating)} />
              ) : (
                <p className="text-muted-foreground text-sm">—</p>
              )}
            </CardContent>
          </Card>
          {sortedYears.length > 0 && (
            <Card className="col-span-2 sm:col-span-1">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">By Year</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-1">
                {sortedYears.map(([year, count]) => (
                  <div key={year} className="flex justify-between text-sm">
                    <span>{year}</span>
                    <span className="font-medium">{count}×</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {sortedMonths.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">Monthly frequency</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1.5">
              {sortedMonths.map(([ym, count]) => {
                const maxCount = Math.max(...Object.values(stats!.byMonth));
                const pct = (count / maxCount) * 100;
                return (
                  <div key={ym} className="flex items-center gap-2 text-sm">
                    <span className="w-20 text-muted-foreground shrink-0">
                      {format(parseISO(ym + "-01"), "MMM yyyy")}
                    </span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {searched && results.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-8">
          No entries found for <strong>{query}</strong>.
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Entries ({results.length})
          </h2>
          {results.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
