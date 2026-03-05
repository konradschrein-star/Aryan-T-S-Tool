"use client";

import { useEffect, useState, useCallback } from "react";
import { Eye, EyeOff, RotateCcw, Loader2, Plus, X, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import {
  ALL_LANGUAGES,
  DEFAULT_LANGUAGE_CODES,
  DEFAULT_SCRIPT_PROMPT,
  DEFAULT_THUMBNAIL_PROMPT,
} from "@/lib/constants";
import { LanguagePreset } from "@/types";
import { getSettings, saveSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

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

  // Custom languages & presets
  const [customLanguages, setCustomLanguages] = useState<string[]>([]);
  const [newCustomLang, setNewCustomLang] = useState("");
  const [presets, setPresets] = useState<LanguagePreset[]>([]);

  // Preset editor dialog
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<LanguagePreset | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetLanguages, setPresetLanguages] = useState<string[]>([]);

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
        setCustomLanguages(data.custom_languages ?? []);
        setPresets(data.language_presets ?? []);
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

  function addCustomLanguage() {
    const name = newCustomLang.trim();
    if (!name) return;
    if (customLanguages.includes(name)) {
      toast.error("This language already exists");
      return;
    }
    // Also check against built-in names
    if (ALL_LANGUAGES.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
      toast.error("This language is already in the built-in list");
      return;
    }
    setCustomLanguages((prev) => [...prev, name]);
    setNewCustomLang("");
  }

  function removeCustomLanguage(name: string) {
    setCustomLanguages((prev) => prev.filter((l) => l !== name));
    // Also remove from any presets
    setPresets((prev) =>
      prev.map((p) => ({
        ...p,
        languages: p.languages.filter((l) => l !== `custom:${name}`),
      }))
    );
  }

  function openNewPreset() {
    setEditingPreset(null);
    setPresetName("");
    setPresetLanguages([]);
    setPresetDialogOpen(true);
  }

  function openEditPreset(preset: LanguagePreset) {
    setEditingPreset(preset);
    setPresetName(preset.name);
    setPresetLanguages([...preset.languages]);
    setPresetDialogOpen(true);
  }

  function togglePresetLanguage(id: string) {
    setPresetLanguages((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }

  function savePreset() {
    if (!presetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }
    if (presetLanguages.length === 0) {
      toast.error("Please select at least one language");
      return;
    }

    if (editingPreset) {
      setPresets((prev) =>
        prev.map((p) =>
          p.id === editingPreset.id
            ? { ...p, name: presetName.trim(), languages: presetLanguages }
            : p
        )
      );
    } else {
      setPresets((prev) => [
        ...prev,
        { id: uuid(), name: presetName.trim(), languages: presetLanguages },
      ]);
    }
    setPresetDialogOpen(false);
  }

  function deletePreset(id: string) {
    setPresets((prev) => prev.filter((p) => p.id !== id));
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
        customLanguages,
        languagePresets: presets,
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

  // All available languages for preset editor
  const allAvailableForPreset = [
    ...ALL_LANGUAGES.map((l) => ({ id: l.code, name: l.name, group: l.category })),
    ...customLanguages.map((name) => ({ id: `custom:${name}`, name, group: "custom" as const })),
  ];

  // Helper to display languages in a preset
  function presetLanguageNames(langs: string[]) {
    return langs.map((id) => {
      if (id.startsWith("custom:")) return id.replace("custom:", "");
      const lang = ALL_LANGUAGES.find((l) => l.code === id);
      return lang?.name ?? id;
    });
  }

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

      {/* Custom Languages */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Languages</CardTitle>
          <CardDescription>Add languages not in the built-in list. These will be used as the target language name in translation prompts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Swahili, Tagalog, Thai..."
              value={newCustomLang}
              onChange={(e) => setNewCustomLang(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomLanguage(); } }}
            />
            <Button variant="outline" onClick={addCustomLanguage} disabled={!newCustomLang.trim()}>
              <Plus className="size-4 mr-1" /> Add
            </Button>
          </div>
          {customLanguages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {customLanguages.map((lang) => (
                <Badge key={lang} variant="secondary" className="gap-1 py-1 pl-3 pr-1.5">
                  {lang}
                  <button
                    onClick={() => removeCustomLanguage(lang)}
                    className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive"
                    aria-label={`Remove ${lang}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {customLanguages.length === 0 && (
            <p className="text-xs text-muted-foreground">No custom languages added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Language Presets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Language Presets</CardTitle>
              <CardDescription>Create quick-select groups for the translate page.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openNewPreset}>
              <Plus className="size-4 mr-1" /> New Preset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {presets.length === 0 && (
            <p className="text-sm text-muted-foreground">No presets yet. Create one to quickly select languages on the translate page.</p>
          )}
          {presets.map((preset) => (
            <div key={preset.id} className="flex items-start justify-between rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{preset.name}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {presetLanguageNames(preset.languages).map((name) => (
                    <Badge key={name} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="ml-3 flex shrink-0 gap-1">
                <button
                  onClick={() => openEditPreset(preset)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={`Edit ${preset.name}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => deletePreset(preset.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete ${preset.name}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
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
          {customLanguages.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custom</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {customLanguages.map((name) => {
                  const id = `custom:${name}`;
                  return (
                    <label key={id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent/50">
                      <Checkbox checked={selectedLanguages.includes(id)} onCheckedChange={() => toggleLanguage(id)} />
                      {name}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
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

      {/* Preset Editor Dialog */}
      <Dialog open={presetDialogOpen} onOpenChange={setPresetDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPreset ? "Edit Preset" : "New Preset"}</DialogTitle>
            <DialogDescription>
              Select the languages to include in this preset.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                placeholder="e.g. Spanish Bundle, Asian Languages..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">YouTube Set</p>
              <div className="grid grid-cols-2 gap-1.5">
                {allAvailableForPreset.filter((l) => l.group === "youtube").map((lang) => (
                  <label key={lang.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm transition-colors hover:bg-accent/50">
                    <Checkbox checked={presetLanguages.includes(lang.id)} onCheckedChange={() => togglePresetLanguage(lang.id)} />
                    {lang.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">European</p>
              <div className="grid grid-cols-2 gap-1.5">
                {allAvailableForPreset.filter((l) => l.group === "european").map((lang) => (
                  <label key={lang.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm transition-colors hover:bg-accent/50">
                    <Checkbox checked={presetLanguages.includes(lang.id)} onCheckedChange={() => togglePresetLanguage(lang.id)} />
                    {lang.name}
                  </label>
                ))}
              </div>
            </div>
            {allAvailableForPreset.some((l) => l.group === "custom") && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custom</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {allAvailableForPreset.filter((l) => l.group === "custom").map((lang) => (
                    <label key={lang.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm transition-colors hover:bg-accent/50">
                      <Checkbox checked={presetLanguages.includes(lang.id)} onCheckedChange={() => togglePresetLanguage(lang.id)} />
                      {lang.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPresetDialogOpen(false)}>Cancel</Button>
            <Button onClick={savePreset} disabled={!presetName.trim() || presetLanguages.length === 0}>
              {editingPreset ? "Update" : "Create"} Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
