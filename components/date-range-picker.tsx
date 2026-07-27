"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  onChange: (from: string, to: string) => void;
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const hasRange = !!(from || to);

  const selected: DateRange | undefined = hasRange
    ? { from: from ? parseISO(from) : undefined, to: to ? parseISO(to) : undefined }
    : undefined;

  const label = from && to
    ? `${format(parseISO(from), "MMM d")} – ${format(parseISO(to), "MMM d, yyyy")}`
    : from
    ? `From ${format(parseISO(from), "MMM d, yyyy")}`
    : to
    ? `Until ${format(parseISO(to), "MMM d, yyyy")}`
    : "Any date";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <PopoverTrigger
          className={cn(
            "flex flex-1 min-w-0 items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm",
            !hasRange && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{label}</span>
        </PopoverTrigger>
        {hasRange && (
          <button
            type="button"
            onClick={() => onChange("", "")}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <PopoverContent align="start" className="w-auto gap-0 p-0">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={(r) => {
            onChange(r?.from ? format(r.from, "yyyy-MM-dd") : "", r?.to ? format(r.to, "yyyy-MM-dd") : "");
          }}
          autoFocus
          className="[--cell-size:2.5rem]"
        />
        <div className="flex gap-2 border-t p-2">
          <button
            type="button"
            onClick={() => onChange("", "")}
            className="flex-1 rounded-md py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex-1 rounded-md bg-primary py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
