"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Upload,
  FileText,
  X,
  RotateCcw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ALL_LANGUAGES,
  DEFAULT_LANGUAGE_CODES,
  DEFAULT_SCRIPT_PROMPT,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TranslationStatus = "pending" | "translating" | "done" | "error";

interface LanguageProgress {
  code: string;
  name: string;
  status: TranslationStatus;
  error?: string;
}

interface FileEntry {
  name: string;
  text: string;
}

interface BatchFileProgress {
  fileName: string;
  languages: LanguageProgress[];
}

export default function TranslatePage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    DEFAULT_LANGUAGE_CODES
  );
  const [hasApiKey, setHasApiKey] = useState(false);
  const [scriptPrompt, setScriptPrompt] = useState(DEFAULT_SCRIPT_PROMPT);

  // Single tab state
  const [singleText, setSingleText] = useState("");
  const [singleProgress, setSingleProgress] = useState<LanguageProgress[]>([]);
  const [singleTranslating, setSingleTranslating] = useState(false);
  const [singleDone, setSingleDone] = useState(false);
  const [singleScriptId, setSingleScriptId] = useState<string | null>(null);

  // Batch tab state
  const [batchFiles, setBatchFiles] = useState<FileEntry[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchFileProgress[]>([]);
  const [batchTranslating, setBatchTranslating] = useState(false);
  const [batchDone, setBatchDone] = useState(false);

  // Drag state
  const [dragOver, setDragOver] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        if (data.auto_fill_languages && data.default_languages.length > 0) {
          setSelectedLanguages(data.default_languages);
        }
        setScriptPrompt(data.script_prompt || DEFAULT_SCRIPT_PROMPT);

        const keyConfigured =
          (data.preferred_provider === "xai" && !!data.xai_api_key) ||
          (data.preferred_provider === "openai" && !!data.openai_api_key);
        setHasApiKey(keyConfigured);
      }
    } catch {
      // Use defaults
    } finally {
      setSettingsLoaded(true);
    }
  }, [supabase]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function toggleLanguage(code: string) {
    setSelectedLanguages((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  }

  // --- Single Translation ---

  async function translateLanguages(
    scriptId: string,
    text: string,
    langs: { code: string; name: string }[],
    existingProgress?: LanguageProgress[]
  ) {
    const progress: LanguageProgress[] = existingProgress
      ? existingProgress.map((lp) =>
          langs.some((l) => l.code === lp.code)
            ? { ...lp, status: "pending" as const, error: undefined }
            : lp
        )
      : langs.map((l) => ({ ...l, status: "pending" as const }));

    setSingleProgress([...progress]);

    const results = await Promise.allSettled(
      langs.map(async (lang) => {
        const idx = progress.findIndex((p) => p.code === lang.code);

        // Mark as translating
        setSingleProgress((prev) =>
          prev.map((p, i) => (i === idx ? { ...p, status: "translating" } : p))
        );

        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text.trim(),
            targetLanguage: lang.name,
            prompt: scriptPrompt,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Translation failed (${res.status})`);
        }

        const { translatedText } = await res.json();

        // Save translation to DB
        const wordCount = translatedText
          .split(/\s+/)
          .filter(Boolean).length;

        const { error: insertError } = await supabase
          .from("script_translations")
          .insert({
            script_id: scriptId,
            language_code: lang.code,
            language_name: lang.name,
            translated_text: translatedText,
            word_count: wordCount,
          });

        if (insertError) {
          throw new Error(`Saved translation failed: ${insertError.message}`);
        }

        setSingleProgress((prev) =>
          prev.map((p, i) => (i === idx ? { ...p, status: "done" } : p))
        );
        return translatedText;
      })
    );

    // Mark any failures
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const langCode = langs[i].code;
        const errorMsg =
          r.reason instanceof Error ? r.reason.message : "Unknown error";
        setSingleProgress((prev) =>
          prev.map((p) =>
            p.code === langCode ? { ...p, status: "error", error: errorMsg } : p
          )
        );
      }
    });

    return results;
  }

  async function handleSingleTranslate() {
    if (!singleText.trim()) {
      toast.error("Please enter a script to translate");
      return;
    }
    if (selectedLanguages.length === 0) {
      toast.error("Please select at least one language");
      return;
    }
    if (!hasApiKey) {
      toast.error("No API key configured. Please check Settings.");
      return;
    }

    setSingleTranslating(true);
    setSingleDone(false);
    setSingleScriptId(null);

    const langs = selectedLanguages.map((code) => {
      const lang = ALL_LANGUAGES.find((l) => l.code === code);
      return { code, name: lang?.name ?? code };
    });

    try {
      // 1. Create script row
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: scriptRow, error: scriptError } = await supabase
        .from("scripts")
        .insert({
          user_id: user.id,
          original_text: singleText.trim(),
          original_filename: null,
        })
        .select("id")
        .single();

      if (scriptError || !scriptRow) throw scriptError ?? new Error("Failed to create script");

      setSingleScriptId(scriptRow.id);

      // 2. Fire parallel translations
      const results = await translateLanguages(scriptRow.id, singleText, langs);

      const successCount = results.filter(
        (r) => r.status === "fulfilled"
      ).length;
      if (successCount === langs.length) {
        toast.success("All translations completed!");
      } else {
        toast.warning(
          `${successCount}/${langs.length} translations completed`
        );
      }
      setSingleDone(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Translation failed"
      );
    } finally {
      setSingleTranslating(false);
    }
  }

  async function handleRetryFailed() {
    if (!singleScriptId) return;

    const failedLangs = singleProgress
      .filter((lp) => lp.status === "error")
      .map((lp) => ({ code: lp.code, name: lp.name }));

    if (failedLangs.length === 0) return;

    setSingleTranslating(true);
    setSingleDone(false);

    try {
      const results = await translateLanguages(
        singleScriptId,
        singleText,
        failedLangs,
        singleProgress
      );

      const successCount = results.filter(
        (r) => r.status === "fulfilled"
      ).length;
      if (successCount === failedLangs.length) {
        toast.success("All retries completed!");
      } else {
        toast.warning(
          `${successCount}/${failedLangs.length} retries completed`
        );
      }
      setSingleDone(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Retry failed"
      );
    } finally {
      setSingleTranslating(false);
    }
  }

  // --- Batch Translation ---

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.endsWith(".txt")
    );
    readFiles(files);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).filter((f) =>
      f.name.endsWith(".txt")
    );
    readFiles(files);
    e.target.value = "";
  }

  async function readFiles(files: File[]) {
    const entries: FileEntry[] = [];
    for (const file of files) {
      const text = await file.text();
      entries.push({ name: file.name, text });
    }
    setBatchFiles((prev) => [...prev, ...entries]);
  }

  function removeFile(index: number) {
    setBatchFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleBatchTranslate() {
    if (batchFiles.length === 0) {
      toast.error("Please add at least one .txt file");
      return;
    }
    if (selectedLanguages.length === 0) {
      toast.error("Please select at least one language");
      return;
    }
    if (!hasApiKey) {
      toast.error("No API key configured. Please check Settings.");
      return;
    }

    setBatchTranslating(true);
    setBatchDone(false);

    const langs = selectedLanguages.map((code) => {
      const lang = ALL_LANGUAGES.find((l) => l.code === code);
      return { code, name: lang?.name ?? code };
    });

    const initialBatchProg: BatchFileProgress[] = batchFiles.map((f) => ({
      fileName: f.name,
      languages: langs.map((l) => ({ ...l, status: "pending" as const })),
    }));
    setBatchProgress(initialBatchProg);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Process each file
      for (let fi = 0; fi < batchFiles.length; fi++) {
        const file = batchFiles[fi];

        // Create script row
        const { data: scriptRow, error: scriptError } = await supabase
          .from("scripts")
          .insert({
            user_id: user.id,
            original_text: file.text.trim(),
            original_filename: file.name,
          })
          .select("id")
          .single();

        if (scriptError || !scriptRow) {
          toast.error(`Failed to create script for ${file.name}: ${scriptError?.message ?? "Unknown error"}`);
          setBatchProgress((prev) =>
            prev.map((fp, i) =>
              i === fi
                ? {
                    ...fp,
                    languages: fp.languages.map((lp) => ({
                      ...lp,
                      status: "error" as const,
                      error: "Failed to create script row",
                    })),
                  }
                : fp
            )
          );
          continue;
        }

        // Fire parallel translations for this file
        const results = await Promise.allSettled(
          langs.map(async (lang, li) => {
            setBatchProgress((prev) =>
              prev.map((fp, fIdx) =>
                fIdx === fi
                  ? {
                      ...fp,
                      languages: fp.languages.map((lp, lIdx) =>
                        lIdx === li ? { ...lp, status: "translating" as const } : lp
                      ),
                    }
                  : fp
              )
            );

            const res = await fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: file.text.trim(),
                targetLanguage: lang.name,
                prompt: scriptPrompt,
              }),
            });

            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new Error(
                body.error ?? `Translation failed (${res.status})`
              );
            }

            const { translatedText } = await res.json();
            const wordCount = translatedText
              .split(/\s+/)
              .filter(Boolean).length;

            const { error: insertError } = await supabase
              .from("script_translations")
              .insert({
                script_id: scriptRow.id,
                language_code: lang.code,
                language_name: lang.name,
                translated_text: translatedText,
                word_count: wordCount,
              });

            if (insertError) {
              throw new Error(`Save failed: ${insertError.message}`);
            }

            setBatchProgress((prev) =>
              prev.map((fp, fIdx) =>
                fIdx === fi
                  ? {
                      ...fp,
                      languages: fp.languages.map((lp, lIdx) =>
                        lIdx === li ? { ...lp, status: "done" as const } : lp
                      ),
                    }
                  : fp
              )
            );
          })
        );

        results.forEach((r, li) => {
          if (r.status === "rejected") {
            const errorMsg =
              r.reason instanceof Error ? r.reason.message : "Unknown error";
            setBatchProgress((prev) =>
              prev.map((fp, fIdx) =>
                fIdx === fi
                  ? {
                      ...fp,
                      languages: fp.languages.map((lp, lIdx) =>
                        lIdx === li
                          ? { ...lp, status: "error" as const, error: errorMsg }
                          : lp
                      ),
                    }
                  : fp
              )
            );
          }
        });
      }

      toast.success("Batch translation completed!");
      setBatchDone(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Batch translation failed"
      );
    } finally {
      setBatchTranslating(false);
    }
  }

  // --- Language Selector Component ---

  function LanguageSelector() {
    const youtubeLanguages = ALL_LANGUAGES.filter(
      (l) => l.category === "youtube"
    );
    const europeanLanguages = ALL_LANGUAGES.filter(
      (l) => l.category === "european"
    );

    return (
      <div className="space-y-4">
        <Label>Target Languages</Label>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            YouTube Set
          </p>
          <div className="flex flex-wrap gap-2">
            {youtubeLanguages.map((lang) => (
              <label
                key={lang.code}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent/50"
              >
                <Checkbox
                  checked={selectedLanguages.includes(lang.code)}
                  onCheckedChange={() => toggleLanguage(lang.code)}
                />
                {lang.name}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            European
          </p>
          <div className="flex flex-wrap gap-2">
            {europeanLanguages.map((lang) => (
              <label
                key={lang.code}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent/50"
              >
                <Checkbox
                  checked={selectedLanguages.includes(lang.code)}
                  onCheckedChange={() => toggleLanguage(lang.code)}
                />
                {lang.name}
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Status Icon ---

  function StatusIcon({ status }: { status: TranslationStatus }) {
    switch (status) {
      case "pending":
        return (
          <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
        );
      case "translating":
        return (
          <Loader2 className="size-4 animate-spin text-blue-400" />
        );
      case "done":
        return <CheckCircle2 className="size-4 text-green-400" />;
      case "error":
        return <XCircle className="size-4 text-destructive" />;
    }
  }

  if (!settingsLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasFailedSingle = singleProgress.some((lp) => lp.status === "error");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Translate</h1>
        <p className="text-sm text-muted-foreground">
          Translate scripts into multiple languages simultaneously.
        </p>
      </div>

      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">Single</TabsTrigger>
          <TabsTrigger value="batch">Batch</TabsTrigger>
        </TabsList>

        {/* ===== Single Tab ===== */}
        <TabsContent value="single" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Script</CardTitle>
              <CardDescription>
                Paste your script below to translate it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your script here..."
                value={singleText}
                onChange={(e) => setSingleText(e.target.value)}
                rows={10}
                disabled={singleTranslating}
              />
              {singleText.trim() && (
                <p className="text-xs text-muted-foreground">
                  {singleText.trim().split(/\s+/).filter(Boolean).length} words
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <LanguageSelector />
            </CardContent>
          </Card>

          <Button
            onClick={handleSingleTranslate}
            disabled={singleTranslating || !singleText.trim()}
            className="w-full"
          >
            {singleTranslating && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {singleTranslating ? "Translating..." : "Translate"}
          </Button>

          {/* Progress */}
          {singleProgress.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {singleProgress.map((lp) => (
                    <div
                      key={lp.code}
                      className="flex items-center justify-between rounded-md border border-border px-4 py-2"
                    >
                      <span className="text-sm">{lp.name}</span>
                      <div className="flex items-center gap-2">
                        {lp.error && (
                          <span className="text-xs text-destructive">
                            {lp.error}
                          </span>
                        )}
                        <StatusIcon status={lp.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Retry Failed Button */}
          {singleDone && hasFailedSingle && (
            <Button
              variant="outline"
              onClick={handleRetryFailed}
              disabled={singleTranslating}
              className="w-full"
            >
              <RotateCcw className="size-4 mr-1" />
              Retry Failed ({singleProgress.filter((lp) => lp.status === "error").length})
            </Button>
          )}

          {singleDone && (
            <div className="text-center">
              <Button variant="outline" asChild>
                <a href="/dashboard">View in Dashboard</a>
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ===== Batch Tab ===== */}
        <TabsContent value="batch" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Files</CardTitle>
              <CardDescription>
                Drop .txt files here or click to browse.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <Upload className="size-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Drop .txt files here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Only .txt files are accepted
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Queued Files */}
              {batchFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>
                    Queued Files ({batchFiles.length})
                  </Label>
                  <div className="space-y-1">
                    {batchFiles.map((f, i) => (
                      <div
                        key={`${f.name}-${i}`}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-muted-foreground" />
                          <span className="text-sm">{f.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {f.text.split(/\s+/).filter(Boolean).length} words
                          </Badge>
                        </div>
                        <button
                          onClick={() => removeFile(i)}
                          className="text-muted-foreground hover:text-destructive"
                          disabled={batchTranslating}
                          aria-label={`Remove ${f.name}`}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <LanguageSelector />
            </CardContent>
          </Card>

          <Button
            onClick={handleBatchTranslate}
            disabled={batchTranslating || batchFiles.length === 0}
            className="w-full"
          >
            {batchTranslating && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {batchTranslating ? "Translating..." : "Translate All"}
          </Button>

          {/* Batch Progress */}
          {batchProgress.length > 0 && (
            <div className="space-y-4">
              {batchProgress.map((fp, fi) => (
                <Card key={fi}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <FileText className="size-4" />
                      {fp.fileName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {fp.languages.map((lp) => (
                        <div
                          key={lp.code}
                          className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm"
                        >
                          <span>{lp.name}</span>
                          <div className="flex items-center gap-1">
                            {lp.error && (
                              <span className="text-[10px] text-destructive truncate max-w-[80px]" title={lp.error}>
                                {lp.error}
                              </span>
                            )}
                            <StatusIcon status={lp.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {batchDone && (
            <div className="text-center">
              <Button variant="outline" asChild>
                <a href="/dashboard">View in Dashboard</a>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
