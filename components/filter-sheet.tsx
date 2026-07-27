"use client";

import { useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { TagBadge } from "@/components/tag-badge";
import { DateRangePicker } from "@/components/date-range-picker";
import { cn } from "@/lib/utils";

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  allTags: string[];
  filterTags: string[];
  onFilterChange: (tags: string[]) => void;
  dateFrom: string;
  dateTo: string;
  onDateRangeChange: (from: string, to: string) => void;
}

export function FilterSheet({
  open,
  onClose,
  allTags,
  filterTags,
  onFilterChange,
  dateFrom,
  dateTo,
  onDateRangeChange,
}: FilterSheetProps) {
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { addTag(); onClose(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const addTag = useCallback(() => {
    const tag = input.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag && !filterTags.includes(tag)) {
      onFilterChange([...filterTags, tag]);
    }
    setInput("");
  }, [input, filterTags, onFilterChange]);

  const removeTag = (tag: string) =>
    onFilterChange(filterTags.filter((t) => t !== tag));

  const toggleTag = (tag: string) =>
    filterTags.includes(tag)
      ? removeTag(tag)
      : onFilterChange([...filterTags, tag]);

  const activeCount = filterTags.length + (dateFrom || dateTo ? 1 : 0);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition-all duration-200",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div
        onClick={() => { addTag(); onClose(); }}
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Sheet */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl transition-transform duration-300 ease-out max-h-[80vh] flex flex-col",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Filter by tags</h2>
            <button
              type="button"
              onClick={() => { addTag(); onClose(); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tag input */}
          <div>
            <div className="flex flex-wrap gap-1.5 min-h-10 p-2 border rounded-lg bg-background items-center focus-within:ring-2 focus-within:ring-ring/50 transition-shadow">
              {filterTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                autoFocus={open}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                  if (e.key === "Backspace" && input === "" && filterTags.length > 0) {
                    onFilterChange(filterTags.slice(0, -1));
                  }
                }}
                placeholder={filterTags.length === 0 ? "Type a tag and press Enter…" : ""}
                className="flex-1 min-w-28 text-sm outline-none bg-transparent placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Date range */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Date range
            </p>
            <DateRangePicker from={dateFrom} to={dateTo} onChange={onDateRangeChange} />
          </div>

          {/* Available tags */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                All tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "rounded transition-opacity",
                      !filterTags.includes(tag) && "opacity-60 hover:opacity-100"
                    )}
                  >
                    <TagBadge tag={tag} selected={filterTags.includes(tag)} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            {(filterTags.length > 0 || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => { onFilterChange([]); onDateRangeChange("", ""); onClose(); }}
                className="flex-1 py-2.5 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={() => { addTag(); onClose(); }}
              className="flex-1 py-2.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              {activeCount > 0 ? `Show results (${activeCount})` : "Done"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
