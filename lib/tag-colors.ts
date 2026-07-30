"use client";

import { useSyncExternalStore } from "react";
import { db } from "@/lib/db";

let cache: Map<string, string> | null = null;
let pendingFetch: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function load() {
  if (cache || pendingFetch) return;
  pendingFetch = db.tagConfigs.toArray().then((configs) => {
    cache = new Map(configs.map((c) => [c.name, c.color]));
    pendingFetch = null;
    notify();
  });
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  load();
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return cache;
}

// Shared, module-level cache of base tag -> color, backed by a single
// batched query instead of one IndexedDB round trip per <TagBadge>.
// Avoids the color/border "pop-in" that showed up once a page rendered
// more than a handful of tags at once.
export function useTagColors() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function invalidateTagColorCache() {
  cache = null;
  pendingFetch = null;
  notify();
}
