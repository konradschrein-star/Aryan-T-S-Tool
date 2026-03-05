"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Upload,
  X,
  Minus,
  Plus,
  Download,
} from "lucide-react";
import { getSettings } from "@/lib/actions/settings";
import { saveThumbnails } from "@/lib/actions/thumbnails";
import { DEFAULT_THUMBNAIL_PROMPT } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type GenerationStatus = "pending" | "generating" | "done" | "error";

interface VariantProgress {
  index: number;
  status: GenerationStatus;
  imageUrl?: string;
  base64?: string;
  mimeType?: string;
  error?: string;
}

export default function GeneratePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [hasGoogleKey, setHasGoogleKey] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_THUMBNAIL_PROMPT);

  // Image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Generation
  const [variantCount, setVariantCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState<VariantProgress[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await getSettings();

      if (data) {
        setHasGoogleKey(!!data.google_api_key);
        setPrompt(data.thumbnail_prompt || DEFAULT_THUMBNAIL_PROMPT);
      }
    } catch {
      // Use defaults
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function handleImageDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setVariants([]);
      setSaved(false);
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setVariants([]);
      setSaved(false);
    }
    e.target.value = "";
  }

  function clearImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setVariants([]);
    setSaved(false);
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data URL prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleGenerate() {
    if (!imageFile) {
      toast.error("Please upload an image first");
      return;
    }
    if (!hasGoogleKey) {
      toast.error(
        "No Google AI Studio API key configured. Please check Settings."
      );
      return;
    }

    setGenerating(true);
    setSaved(false);

    const imageBase64 = await fileToBase64(imageFile);

    const progress: VariantProgress[] = Array.from(
      { length: variantCount },
      (_, i) => ({
        index: i,
        status: "pending" as const,
      })
    );
    setVariants([...progress]);

    const results = await Promise.allSettled(
      progress.map(async (_, idx) => {
        progress[idx].status = "generating";
        setVariants([...progress]);

        const res = await fetch("/api/generate-thumbnail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64,
            mimeType: imageFile.type,
            prompt,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Generation failed (${res.status})`);
        }

        const data = await res.json();

        progress[idx].status = "done";
        progress[idx].base64 = data.base64;
        progress[idx].mimeType = data.mimeType;
        progress[idx].imageUrl = `data:${data.mimeType};base64,${data.base64}`;
        setVariants([...progress]);
      })
    );

    results.forEach((r, idx) => {
      if (r.status === "rejected") {
        progress[idx].status = "error";
        progress[idx].error =
          r.reason instanceof Error ? r.reason.message : "Unknown error";
      }
    });
    setVariants([...progress]);

    const successCount = results.filter(
      (r) => r.status === "fulfilled"
    ).length;
    if (successCount === variantCount) {
      toast.success(
        `${successCount} variant${successCount > 1 ? "s" : ""} generated!`
      );
    } else if (successCount > 0) {
      toast.warning(`${successCount}/${variantCount} variants generated`);
    } else {
      toast.error("All generations failed");
    }

    setGenerating(false);
  }

  async function handleSaveAll() {
    const successVariants = variants.filter(
      (v) => v.status === "done" && v.base64
    );
    if (successVariants.length === 0) return;

    setSaving(true);

    try {
      // Convert the original image file to a base64 data URL
      const originalDataUrl = await fileToDataUrl(imageFile!);

      // Call the saveThumbnails server action
      const { error } = await saveThumbnails({
        originalDataUrl,
        variants: successVariants.map((v) => ({
          base64: v.base64!,
          mimeType: v.mimeType!,
          promptUsed: prompt,
        })),
      });

      if (error) throw new Error(error);

      toast.success("All variants saved!");
      setSaved(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save variants"
      );
    } finally {
      setSaving(false);
    }
  }

  function StatusIcon({ status }: { status: GenerationStatus }) {
    switch (status) {
      case "pending":
        return (
          <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
        );
      case "generating":
        return <Loader2 className="size-4 animate-spin text-blue-400" />;
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

  const successVariants = variants.filter(
    (v) => v.status === "done" && v.imageUrl
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Generate Thumbnails
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload a thumbnail and generate AI-powered variants.
        </p>
      </div>

      {/* Image Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Source Image</CardTitle>
          <CardDescription>
            Upload the original thumbnail to create variants from.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Uploaded preview"
                className="max-h-80 w-full rounded-lg border border-border object-contain"
              />
              <button
                onClick={clearImage}
                className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-foreground/60 backdrop-blur-sm hover:text-foreground"
                disabled={generating}
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleImageDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-14 transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <Upload className="size-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop an image here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, or WebP
                </p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle>Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Variant Count */}
          <div className="space-y-2">
            <Label>Number of Variants</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setVariantCount((prev) => Math.max(1, prev - 1))
                }
                disabled={variantCount <= 1 || generating}
              >
                <Minus className="size-4" />
              </Button>
              <Input
                type="number"
                min={1}
                max={10}
                value={variantCount}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (v >= 1 && v <= 10) setVariantCount(v);
                }}
                className="w-20 text-center"
                disabled={generating}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setVariantCount((prev) => Math.min(10, prev + 1))
                }
                disabled={variantCount >= 10 || generating}
              >
                <Plus className="size-4" />
              </Button>
              <span className="text-xs text-muted-foreground">(1-10)</span>
            </div>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="gen-prompt">Prompt</Label>
            <Textarea
              id="gen-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              disabled={generating}
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={generating || !imageFile}
        className="w-full"
      >
        {generating && <Loader2 className="size-4 animate-spin" />}
        {generating ? "Generating..." : "Generate"}
      </Button>

      {/* Progress Indicators */}
      {variants.length > 0 &&
        variants.some((v) => v.status !== "done" || !v.imageUrl) && (
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                {variants.map((v) => (
                  <div
                    key={v.index}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span>Variant {v.index + 1}</span>
                    <StatusIcon status={v.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Results Grid */}
      {successVariants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Generated Variants ({successVariants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {successVariants.map((v) => (
                <div
                  key={v.index}
                  className="group relative overflow-hidden rounded-lg border border-border"
                >
                  <img
                    src={v.imageUrl!}
                    alt={`Variant ${v.index + 1}`}
                    className="aspect-video w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                    <a
                      href={v.imageUrl!}
                      download={`variant-${v.index + 1}.png`}
                      className="mb-3 flex items-center gap-1.5 rounded-md bg-background/80 px-3 py-1.5 text-xs font-medium backdrop-blur-sm hover:bg-background"
                    >
                      <Download className="size-3" />
                      Download
                    </a>
                  </div>
                  <div className="absolute left-2 top-2">
                    <span className="rounded bg-background/80 px-1.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                      #{v.index + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      {successVariants.length > 0 && !saved && (
        <Button
          onClick={handleSaveAll}
          disabled={saving}
          variant="outline"
          className="w-full"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving
            ? "Saving..."
            : `Save All ${successVariants.length} Variant${successVariants.length > 1 ? "s" : ""}`}
        </Button>
      )}

      {saved && (
        <div className="text-center">
          <Button variant="outline" asChild>
            <a href="/dashboard/thumbnails">View in Thumbnails</a>
          </Button>
        </div>
      )}
    </div>
  );
}
