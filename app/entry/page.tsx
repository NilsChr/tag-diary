"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db, type Entry } from "@/lib/db";
import { EntryForm } from "@/components/entry-form";

function EditEntryContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [entry, setEntry] = useState<Entry | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
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

export default function EditEntryPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
      <EditEntryContent />
    </Suspense>
  );
}
