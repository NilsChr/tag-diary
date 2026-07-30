"use client";

import { useEffect, useState, useCallback } from "react";
import { db, getBaseTag, renameTag, type TagConfig } from "@/lib/db";
import { invalidateTagColorCache } from "@/lib/tag-colors";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export default function TagsPage() {
  const [tags, setTags] = useState<TagConfig[]>([]);
  const [allTagNames, setAllTagNames] = useState<string[]>([]);
  const [subtagsByBase, setSubtagsByBase] = useState<Map<string, string[]>>(new Map());
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const load = useCallback(async () => {
    invalidateTagColorCache();
    const [configs, entries] = await Promise.all([
      db.tagConfigs.toArray(),
      db.entries.toArray(),
    ]);
    setTags(configs);
    const subMap = new Map<string, Set<string>>();
    for (const e of entries) {
      for (const t of e.tags) {
        const base = getBaseTag(t);
        const rest = t.slice(base.length + 1);
        if (!subMap.has(base)) subMap.set(base, new Set());
        // Only surface categorical subtags (e.g. "running"); numeric
        // trackable values ("weight:80.5") aren't meaningful as labels.
        if (rest && isNaN(parseFloat(rest))) subMap.get(base)!.add(rest);
      }
    }
    setSubtagsByBase(
      new Map(Array.from(subMap, ([base, set]) => [base, Array.from(set).sort()]))
    );
    setAllTagNames(
      Array.from(new Set([...subMap.keys(), ...configs.map((c) => c.name)])).sort()
    );
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateColor = async (tag: TagConfig, color: string) => {
    await db.tagConfigs.update(tag.id!, { color });
    load();
  };

  const assignColor = async (name: string, color: string) => {
    const existing = await db.tagConfigs.where("name").equals(name).first();
    if (existing) {
      await db.tagConfigs.update(existing.id!, { color });
    } else {
      await db.tagConfigs.add({ name, color });
    }
    setRenaming(null);
    load();
  };

  const removeColor = async (tag: TagConfig) => {
    await db.tagConfigs.delete(tag.id!);
    setRenaming(null);
    load();
  };

  const startRename = (name: string) => {
    setRenaming(name);
    setRenameValue(name);
  };

  const confirmRename = async () => {
    if (!renaming) return;
    const to = renameValue.trim().toLowerCase();
    if (to && to !== renaming) await renameTag(renaming, to);
    setRenaming(null);
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tags</h1>

      <div className="space-y-2">
        {allTagNames.map((name) => {
          const config = tags.find((t) => t.name === name);
          const subtags = subtagsByBase.get(name) ?? [];
          const editing = renaming === name;
          return (
            <div key={name} className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <span
                  className={cn(
                    "h-5 w-5 rounded-full flex-shrink-0",
                    !config && "border-2 border-dashed border-muted-foreground/40"
                  )}
                  style={config ? { backgroundColor: config.color } : undefined}
                />
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename();
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      className="w-full text-sm font-medium outline-none border-b bg-transparent"
                    />
                  ) : (
                    <>
                      <div className="font-medium text-sm">{name}</div>
                      {subtags.length > 0 && (
                        <div className="text-xs text-muted-foreground truncate">
                          {subtags.join(", ")}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {!editing && (
                  <button
                    type="button"
                    onClick={() => startRename(name)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-out",
                  editing ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap px-3 pt-3 border-t">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => (config ? updateColor(config, c) : assignColor(name, c))}
                        className="h-6 w-6 rounded-full border-2 transition-all"
                        style={{
                          backgroundColor: c,
                          borderColor: config?.color === c ? "#0f172a" : "transparent",
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={config?.color ?? PRESET_COLORS[0]}
                      onChange={(e) =>
                        config ? updateColor(config, e.target.value) : assignColor(name, e.target.value)
                      }
                      className="h-6 w-6 rounded cursor-pointer border"
                      title="Custom color"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-3 pb-3 pt-3">
                    {config && (
                      <button
                        type="button"
                        onClick={() => removeColor(config)}
                        className="mr-auto px-3 py-2 rounded-md text-sm font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors"
                      >
                        Remove color
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setRenaming(null)}
                      className="px-4 py-2 rounded-md text-sm border hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmRename}
                      className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
