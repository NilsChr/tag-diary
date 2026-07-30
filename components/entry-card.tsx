"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { type Entry } from "@/lib/db";
import { TagBadge } from "@/components/tag-badge";
import { RatingDisplay } from "@/components/rating-display";

interface EntryCardProps {
  entry: Entry;
}

const MAX_VISIBLE_TAGS = 2;

export function EntryCard({ entry }: EntryCardProps) {
  const visibleTags = entry.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenCount = entry.tags.length - visibleTags.length;

  return (
    <Link
      href={`/entry?id=${entry.id}`}
      className="flex items-baseline gap-2 py-2.5 border-b border-border/50 hover:bg-muted/40 -mx-2 px-2 rounded transition-colors"
    >
      <span className="text-xs text-muted-foreground shrink-0">
        {format(parseISO(entry.date), "dd.MM.yyyy")}
      </span>
      <span className="shrink-0">
        <RatingDisplay rating={entry.rating} size="sm" showMax={false} />
      </span>
      {entry.text ? (
        <span className="text-sm truncate min-w-0">{entry.text}</span>
      ) : entry.tags.length > 0 ? null : (
        <span className="text-sm text-muted-foreground italic">No text</span>
      )}
      {visibleTags.length > 0 && (
        <span className="flex gap-1 min-w-0 overflow-hidden">
          {visibleTags.map((tag) => (
            <TagBadge key={tag} tag={tag} className="shrink-0" />
          ))}
          {hiddenCount > 0 && (
            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
              …
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
