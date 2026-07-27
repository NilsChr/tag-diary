"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { db, type Entry } from "@/lib/db";
import { EntryForm } from "@/components/entry-form";

export default function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [entry, setEntry] = useState<Entry | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.entries.get(Number(id)).then((e) => {
      setEntry(e);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (!entry) return <p className="text-destructive">Entry not found.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit Entry</h1>
      <EntryForm entry={entry} />
    </div>
  );
}
