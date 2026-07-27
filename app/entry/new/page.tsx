import { EntryForm } from "@/components/entry-form";

export default function NewEntryPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">New Entry</h1>
      <EntryForm />
    </div>
  );
}
