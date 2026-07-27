import Dexie, { type Table } from "dexie";

export interface Entry {
  id?: number;
  date: string; // YYYY-MM-DD
  text: string;
  rating: number; // 0-10
  tags: string[]; // ["workout:jogging", "mood"]
  createdAt: number;
  updatedAt: number;
}

export interface TagConfig {
  id?: number;
  name: string; // base tag name only, e.g. "workout"
  color: string; // hex color
}

class DiaryDB extends Dexie {
  entries!: Table<Entry>;
  tagConfigs!: Table<TagConfig>;

  constructor() {
    super("tag-diary");
    this.version(1).stores({
      entries: "++id, date, *tags, createdAt",
      tagConfigs: "++id, &name",
    });
  }
}

export const db = new DiaryDB();

export function getBaseTag(tag: string): string {
  return tag.split(":")[0];
}

export async function getTagColor(tag: string): Promise<string | undefined> {
  const base = getBaseTag(tag);
  const config = await db.tagConfigs.where("name").equals(base).first();
  return config?.color;
}

export async function getAllBaseTags(): Promise<string[]> {
  const entries = await db.entries.toArray();
  const base = new Set<string>();
  for (const e of entries) {
    for (const t of e.tags) base.add(getBaseTag(t));
  }
  return Array.from(base).sort();
}

export async function getAllUsedTags(): Promise<string[]> {
  const entries = await db.entries.toArray();
  const set = new Set<string>();
  for (const e of entries) {
    for (const t of e.tags) {
      const [base, rest] = t.split(":");
      // Collapse trackable tags (base:number) to just the base
      set.add(rest !== undefined && !isNaN(parseFloat(rest)) ? base : t);
    }
  }
  return Array.from(set).sort();
}

export async function getEntriesForTag(tag: string): Promise<Entry[]> {
  // Exact match + prefix match for subtags
  const all = await db.entries.toArray();
  return all
    .filter((e) => e.tags.some((t) => t === tag || t.startsWith(tag + ":")))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function renameTag(oldTag: string, newTag: string): Promise<void> {
  const from = oldTag.trim().toLowerCase();
  const to = newTag.trim().toLowerCase();
  if (!from || !to || from === to) return;

  const entries = await db.entries.toArray();
  for (const e of entries) {
    let changed = false;
    const tags = e.tags.map((t) => {
      if (t === from) {
        changed = true;
        return to;
      }
      if (t.startsWith(from + ":")) {
        changed = true;
        return to + t.slice(from.length);
      }
      return t;
    });
    if (changed) await db.entries.update(e.id!, { tags, updatedAt: Date.now() });
  }

  const oldBase = getBaseTag(from);
  const newBase = getBaseTag(to);
  if (oldBase === from && oldBase !== newBase) {
    const oldConfig = await db.tagConfigs.where("name").equals(oldBase).first();
    if (oldConfig) {
      const newConfig = await db.tagConfigs.where("name").equals(newBase).first();
      if (!newConfig) {
        await db.tagConfigs.add({ name: newBase, color: oldConfig.color });
      }
      await db.tagConfigs.delete(oldConfig.id!);
    }
  }
}

export async function getTagStats(tag: string) {
  const entries = await getEntriesForTag(tag);

  const byYear: Record<string, number> = {};
  const byMonth: Record<string, number> = {};

  for (const e of entries) {
    const [year, month] = e.date.split("-");
    byYear[year] = (byYear[year] ?? 0) + 1;
    const ym = `${year}-${month}`;
    byMonth[ym] = (byMonth[ym] ?? 0) + 1;
  }

  const avgRating =
    entries.length > 0
      ? entries.reduce((s, e) => s + e.rating, 0) / entries.length
      : null;

  return { total: entries.length, byYear, byMonth, avgRating };
}
