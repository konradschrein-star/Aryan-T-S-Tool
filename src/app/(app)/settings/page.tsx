"use client";

import { useEffect, useState, useCallback } from "react";
import { Eye, EyeOff, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  ALL_LANGUAGES,
  DEFAULT_LANGUAGE_CODES,
  DEFAULT_SCRIPT_PROMPT,
  DEFAULT_THUMBNAIL_PROMPT,
} from "@/lib/constants";
import { getSettings, saveSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [xaiKey, setXaiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [showXai, setShowXai] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);
  const [preferredProvider, setPreferredProvider] = useState<"xai" | "openai">("xai");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(DEFAULT_LANGUAGE_CODES);
  const [autoFillLanguages, setAutoFillLanguages] = useState(true);
  const [scriptPrompt, setScriptPrompt] = useState(DEFAULT_SCRIPT_PROMPT);
  const [thumbnailPrompt, setThumbnailPrompt] = useState(DEFAULT_THUMBNAIL_PROMPT);

  const loadSettings = useCallback(async () => {
    try {
      const result = await getSettings();
      if (result.data) {
        const data = result.data;
        setXaiKey(data.xai_api_key ?? "");
        setOpenaiKey(data.openai_api_key ?? "");
        setGoogleKey(data.google_api_key ?? "");
        setPreferredProvider(data.preferred_provider);
        setSelectedLanguages(data.default_languages.length > 0 ? data.default_languages : DEFAULT_LANGUAGE_CODES);
        setAutoFillLanguages(data.auto_fill_languages);
        setScriptPrompt(data.script_prompt || DEFAULT_SCRIPT_PROMPT);
        setThumbnailPrompt(data.thumbnail_prompt || DEFAULT_THUMBNAIL_PROMPT);
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  function toggleLanguage(code: string) {
    setSelectedLanguages((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveSettings({
        xaiApiKey: xaiKey || null,
        openaiApiKey: openaiKey || null,
        googleApiKey: googleKey || null,
        preferredProvider,
        defaultLanguages: selectedLanguages,
        autoFillLanguages,
        scriptPrompt,
        thumbnailPrompt,
      });

      if (result.error) throw new Error(result.error);
      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const youtubeLanguages = ALL_LANGUAGES.filter((l) => l.category === "youtube");
  const europeanLanguages = ALL_LANGUAGES.filter((l) => l.category === "european");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your API keys, language preferences, and prompt templates.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Your keys are stored securely and never shared.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="xai-key">xAI API Key</Label>
            <div className="relative">
              <Input id="xai-key" type={showXai ? "text" : "password"} value={xaiKey} onChange={(e) => setXaiKey(e.target.value)} placeholder="xai-..." className="pr-10" />
              <button type="button" onClick={() => setShowXai(!showXai)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showXai ? "Hide xAI API key" : "Show xAI API key"}>
                {showXai ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="openai-key">OpenAI API Key</Label>
            <div className="relative">
              <Input id="openai-key" type={showOpenai ? "text" : "password"} value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} placeholder="sk-..." className="pr-10" />
              <button type="button" onClick={() => setShowOpenai(!showOpenai)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showOpenai ? "Hide OpenAI API key" : "Show OpenAI API key"}>
                {showOpenai ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="google-key">Google AI Studio API Key</Label>
            <div className="relative">
              <Input id="google-key" type={showGoogle ? "text" : "password"} value={googleKey} onChange={(e) => setGoogleKey(e.target.value)} placeholder="AIza..." className="pr-10" />
              <button type="button" onClick={() => setShowGoogle(!showGoogle)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showGoogle ? "Hide Google API key" : "Show Google API key"}>
                {showGoogle ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Preferred Translation Provider</Label>
            <Select value={preferredProvider} onValueChange={(v) => setPreferredProvider(v as "xai" | "openai")}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="xai">xAI (Grok)</SelectItem>
                <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Language Defaults</CardTitle>
          <CardDescription>Select which languages are pre-checked when translating.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">YouTube Set</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {youtubeLanguages.map((lang) => (
                <label key={lang.code} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent/50">
                  <Checkbox checked={selectedLanguages.includes(lang.code)} onCheckedChange={() => toggleLanguage(lang.code)} />
                  {lang.name}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">European</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {europeanLanguages.map((lang) => (
                <label key={lang.code} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent/50">
                  <Checkbox checked={selectedLanguages.includes(lang.code)} onCheckedChange={() => toggleLanguage(lang.code)} />
                  {lang.name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={autoFillLanguages} onCheckedChange={setAutoFillLanguages} />
            <Label>Auto-fill selected languages on translate page</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prompt Templates</CardTitle>
          <CardDescription>Customize the prompts sent to the AI. Use <code className="rounded bg-muted px-1 py-0.5 text-xs">[TARGET LANGUAGE]</code> as a placeholder in the script prompt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="script-prompt">Script Translation Prompt</Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setScriptPrompt(DEFAULT_SCRIPT_PROMPT)}>
                <RotateCcw className="size-3 mr-1" /> Reset
              </Button>
            </div>
            <Textarea id="script-prompt" value={scriptPrompt} onChange={(e) => setScriptPrompt(e.target.value)} rows={5} className="font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="thumbnail-prompt">Thumbnail Generation Prompt</Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setThumbnailPrompt(DEFAULT_THUMBNAIL_PROMPT)}>
                <RotateCcw className="size-3 mr-1" /> Reset
              </Button>
            </div>
            <Textarea id="thumbnail-prompt" value={thumbnailPrompt} onChange={(e) => setThumbnailPrompt(e.target.value)} rows={3} className="font-mono text-xs" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
