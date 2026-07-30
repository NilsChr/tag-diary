"use client";

import { useEffect, useState, useCallback } from "react";
import { db, getBaseTag, renameTag, type TagConfig } from "@/lib/db";
import { invalidateTagColorCache } from "@/lib/tag-colors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export default function TagsPage() {
  const [tags, setTags] = useState<TagConfig[]>([]);
  const [allTagNames, setAllTagNames] = useState<string[]>([]);
  const [subtagsByBase, setSubtagsByBase] = useState<Map<string, string[]>>(new Map());
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [showSuggestions, setShowSuggestions] = useState(false);
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
    setAllTagNames(Array.from(subMap.keys()).sort());
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const name = newName.trim().toLowerCase();
    if (!name) return;
    const existing = await db.tagConfigs.where("name").equals(name).first();
    if (existing) {
      await db.tagConfigs.update(existing.id!, { color: newColor });
    } else {
      await db.tagConfigs.add({ name, color: newColor });
    }
    setNewName("");
    load();
  };

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

  const remove = async (tag: TagConfig) => {
    await db.tagConfigs.delete(tag.id!);
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

  const uncolored = allTagNames.filter(
    (n) => !tags.some((t) => t.name === n)
  );

  const trimmedName = newName.trim().toLowerCase();
  const suggestions = trimmedName
    ? uncolored.filter((n) => n !== trimmedName && n.includes(trimmedName))
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tags</h1>

      <Card>
        <CardContent className="pt-4 space-y-4">
          <h2 className="font-semibold">Add / update tag color</h2>
          <div className="space-y-2 relative">
            <Label htmlFor="tag-name">Base tag name</Label>
            <Input
              id="tag-name"
              placeholder="workout"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-popover border rounded-lg shadow-md overflow-hidden max-h-48 overflow-y-auto divide-y">
                {suggestions.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setNewName(n);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm active:bg-muted"
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: newColor === c ? "#0f172a" : "transparent",
                  }}
                />
              ))}
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-7 w-7 rounded cursor-pointer border"
                title="Custom color"
              />
            </div>
          </div>
          <Button onClick={save}>Save Tag Color</Button>
        </CardContent>
      </Card>

      {tags.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold">Colored tags</h2>
          {tags.map((tag) => {
            const editing = renaming === tag.name;
            return (
              <div key={tag.id} className="border rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <span
                    className="h-5 w-5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
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
                        <div className="font-medium text-sm">{tag.name}</div>
                        {(subtagsByBase.get(tag.name)?.length ?? 0) > 0 && (
                          <div className="text-xs text-muted-foreground truncate">
                            {subtagsByBase.get(tag.name)!.join(", ")}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {editing ? (
                    <div className="flex gap-1">
                      <button type="button" onClick={confirmRename} className="text-muted-foreground hover:text-foreground">
                        <Check className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setRenaming(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => startRename(tag.name)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(tag)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-out",
                    editing ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap px-3 pb-3 pt-3 border-t">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateColor(tag, c)}
                          className="h-6 w-6 rounded-full border-2 transition-all"
                          style={{
                            backgroundColor: c,
                            borderColor: tag.color === c ? "#0f172a" : "transparent",
                          }}
                        />
                      ))}
                      <input
                        type="color"
                        value={tag.color}
                        onChange={(e) => updateColor(tag, e.target.value)}
                        className="h-6 w-6 rounded cursor-pointer border"
                        title="Custom color"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {uncolored.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-muted-foreground">Uncolored tags</h2>
          <div className="space-y-1">
            {uncolored.map((name) => {
              const subtags = subtagsByBase.get(name) ?? [];
              const editing = renaming === name;
              return (
                <div key={name} className="border rounded-lg overflow-hidden">
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2",
                      !editing && "hover:bg-muted transition-colors"
                    )}
                  >
                    {editing ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmRename();
                          if (e.key === "Escape") setRenaming(null);
                        }}
                        className="flex-1 min-w-0 text-sm outline-none border-b bg-transparent"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setNewName(name)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="text-sm font-medium">{name}</div>
                        {subtags.length > 0 && (
                          <div className="text-xs text-muted-foreground truncate">
                            {subtags.join(", ")}
                          </div>
                        )}
                      </button>
                    )}
                    {editing ? (
                      <div className="flex gap-1">
                        <button type="button" onClick={confirmRename} className="text-muted-foreground hover:text-foreground">
                          <Check className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setRenaming(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startRename(name)}
                        className="text-muted-foreground hover:text-foreground flex-shrink-0"
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
                      <div className="flex items-center gap-2 flex-wrap px-3 pb-3 pt-3 border-t">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => assignColor(name, c)}
                            className="h-6 w-6 rounded-full border-2 border-transparent transition-all"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <input
                          type="color"
                          defaultValue={PRESET_COLORS[0]}
                          onChange={(e) => assignColor(name, e.target.value)}
                          className="h-6 w-6 rounded cursor-pointer border"
                          title="Custom color"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
