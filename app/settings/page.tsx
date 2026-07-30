"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Check, Download, Monitor, Moon, Sun, Trash2, Upload } from "lucide-react";
import { db, exportAllData, importAllData } from "@/lib/db";
import { invalidateTagColorCache } from "@/lib/tag-colors";
import { getStoredTheme, setTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function SettingsPage() {
  const router = useRouter();
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true
    );
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  };

  const chooseTheme = (t: Theme) => {
    setTheme(t);
    setThemeState(t);
  };

  const clearAllData = async () => {
    await Promise.all([db.entries.clear(), db.tagConfigs.clear()]);
    setConfirmingClear(false);
    router.push("/");
  };

  const exportData = async () => {
    const payload = await exportAllData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tag-diary-export-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError(null);
    setImportSuccess(false);
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.entries) || !Array.isArray(data.tagConfigs)) {
        throw new Error("Invalid file format");
      }
      await importAllData(data);
      invalidateTagColorCache();
      setImportSuccess(true);
    } catch {
      setImportError("Couldn't import this file. Make sure it's a Tag Diary export.");
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="space-y-2">
        <h2 className="font-semibold">Appearance</h2>
        <div className="flex gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => chooseTheme(value)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1.5 py-3 border rounded-lg text-sm transition-colors",
                theme === value
                  ? "border-primary bg-primary/5 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {theme === value && <Check className="h-3 w-3 text-primary" />}
            </button>
          ))}
        </div>
      </div>

      {!isStandalone && (
        <div className="space-y-2">
          <h2 className="font-semibold">Install</h2>
          {installEvent ? (
            <Button onClick={install}>
              <Download className="h-4 w-4" />
              Install app
            </Button>
          ) : isIOS ? (
            <p className="text-sm text-muted-foreground">
              Tap the Share icon in Safari, then &ldquo;Add to Home Screen&rdquo; to install.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Look for an install icon in your browser&rsquo;s address bar to add this app to your device.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="font-semibold">Backup</h2>
        <p className="text-sm text-muted-foreground">
          Entries only exist on this device. Export a backup regularly, or before switching devices.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4" />
            Export data
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Import data
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
        {importError && <p className="text-sm text-destructive">{importError}</p>}
        {importSuccess && <p className="text-sm text-green-600">Import complete.</p>}
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold text-destructive">Danger zone</h2>
        <div className="border border-destructive/30 rounded-lg p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Permanently delete every entry and tag color on this device. This
            cannot be undone.
          </p>
          {confirmingClear ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={clearAllData}
              >
                Yes, delete everything
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmingClear(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="destructive" onClick={() => setConfirmingClear(true)}>
              <Trash2 className="h-4 w-4" />
              Clear all data
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
