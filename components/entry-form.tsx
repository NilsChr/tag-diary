"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { db, getAllUsedTags, type Entry } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { TagBadge } from "@/components/tag-badge";
import { DatePicker } from "@/components/date-picker";
import { X } from "lucide-react";

interface EntryFormProps {
  entry?: Entry;
}

export function EntryForm({ entry }: EntryFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(entry?.date ?? format(new Date(), "yyyy-MM-dd"));
  const [text, setText] = useState(entry?.text ?? "");
  const [rating, setRating] = useState(entry?.rating ?? 5);
  const [tags, setTags] = useState<string[]>(entry?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [usedTags, setUsedTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  useEffect(() => {
    getAllUsedTags().then(setUsedTags);
  }, []);

  const addTag = useCallback(() => {
    const raw = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (raw && !tags.includes(raw)) {
      setTags((prev) => [...prev, raw]);
    }
    setTagInput("");
  }, [tagInput, tags]);

  const selectSuggestion = (name: string) => {
    if (!tags.includes(name)) setTags((prev) => [...prev, name]);
    setTagInput("");
    setShowTagSuggestions(false);
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
    if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const save = async () => {
    setSaving(true);
    const now = Date.now();
    if (entry?.id) {
      await db.entries.update(entry.id, { date, text, rating, tags, updatedAt: now });
    } else {
      await db.entries.add({ date, text, rating, tags, createdAt: now, updatedAt: now });
    }
    router.push("/");
    router.refresh();
  };

  const deleteEntry = async () => {
    if (!entry?.id) return;
    await db.entries.delete(entry.id);
    router.push("/");
    router.refresh();
  };

  const trimmedTagInput = tagInput.trim().toLowerCase();
  const tagSuggestions = trimmedTagInput
    ? usedTags.filter((n) => !tags.includes(n) && n.includes(trimmedTagInput))
    : [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <DatePicker id="date" value={date} onChange={setDate} />
      </div>

      <div className="space-y-2">
        <Label>Rating: <span className="font-bold">{rating}/10</span></Label>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-4">0</span>
          <Slider
            min={0}
            max={10}
            step={1}
            value={[rating]}
            onValueChange={(val) => setRating(Array.isArray(val) ? val[0] : val)}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground w-4">10</span>
        </div>
        <p className="text-xs text-muted-foreground">0 = terrible day, 5 = baseline, 10 = amazing day</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="text">Entry</Label>
        <Textarea
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What happened today?"
          rows={6}
        />
      </div>

      <div className="space-y-2 relative">
        <Label htmlFor="tags">Tags</Label>
        <div className="flex flex-wrap gap-1.5 min-h-8 p-2 border rounded-md bg-background">
          {tags.map((tag) => (
            <TagBadge key={tag} tag={tag}>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:opacity-70"
              >
                <X className="h-3 w-3" />
              </button>
            </TagBadge>
          ))}
          <input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onFocus={() => setShowTagSuggestions(true)}
            onBlur={() => { addTag(); setTimeout(() => setShowTagSuggestions(false), 150); }}
            placeholder={tags.length === 0 ? "workout:jogging, mood…" : ""}
            className="flex-1 min-w-24 text-sm outline-none bg-transparent placeholder:text-muted-foreground"
            autoComplete="off"
          />
        </div>
        {showTagSuggestions && tagSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-popover border rounded-lg shadow-md overflow-hidden max-h-48 overflow-y-auto divide-y">
            {tagSuggestions.map((n) => (
              <button
                key={n}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(n);
                }}
                className="w-full text-left px-3 py-2.5 text-sm active:bg-muted"
              >
                {n}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Press Enter or comma to add. Use : for subtags.</p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : entry ? "Update Entry" : "Save Entry"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        {entry?.id && (
          <Button variant="destructive" className="ml-auto" onClick={deleteEntry}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
