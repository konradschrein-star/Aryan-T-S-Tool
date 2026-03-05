"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { deleteScripts as deleteScriptsAction } from "@/lib/actions/scripts";
import { Script, ScriptTranslation } from "@/types";
import { ALL_LANGUAGES } from "@/lib/constants";
import { ScriptPopup } from "./script-popup";

interface ScriptTableProps {
  scripts: Script[];
  visibleLanguages: string[];
  isAdmin?: boolean;
  onRefresh: () => void;
}

export function ScriptTable({
  scripts,
  visibleLanguages,
  isAdmin = false,
  onRefresh,
}: ScriptTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [popup, setPopup] = useState<{
    open: boolean;
    title: string;
    content: string;
    translationId?: string;
    editable?: boolean;
  }>({ open: false, title: "", content: "" });
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  const languages = useMemo(
    () =>
      ALL_LANGUAGES.filter(
        (l) => visibleLanguages.includes(l.code) && !hiddenCols.has(l.code)
      ),
    [visibleLanguages, hiddenCols]
  );

  const allLanguages = useMemo(
    () => ALL_LANGUAGES.filter((l) => visibleLanguages.includes(l.code)),
    [visibleLanguages]
  );

  const allSelected =
    scripts.length > 0 && selectedRows.size === scripts.length;

  const toggleAllRows = useCallback(() => {
    if (scripts.length > 0 && selectedRows.size === scripts.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(scripts.map((s) => s.id)));
    }
  }, [scripts, selectedRows.size]);

  const toggleRow = useCallback((id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleCol = useCallback((code: string) => {
    setSelectedCols((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const toggleColVisibility = useCallback((code: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const getTranslation = (
    script: Script,
    langCode: string
  ): ScriptTranslation | undefined =>
    script.translations?.find((t) => t.language_code === langCode);

  const copyCell = useCallback(
    async (text: string, cellId: string) => {
      await navigator.clipboard.writeText(text);
      setCopiedCell(cellId);
      toast.success("Copied");
      setTimeout(() => setCopiedCell(null), 1500);
    },
    []
  );

  const handleDeleteScripts = async (ids: string[]) => {
    const count = ids.length;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${count} script${count > 1 ? "s" : ""}? This action cannot be undone.`
    );
    if (!confirmed) return;

    const result = await deleteScriptsAction(ids);
    if (result.error) {
      toast.error("Failed to delete");
    } else {
      toast.success(`Deleted ${ids.length} script(s)`);
      setSelectedRows(new Set());
      onRefresh();
    }
  };

  const downloadTranslations = (script: Script) => {
    const translations = script.translations ?? [];
    translations.forEach((t) => {
      const blob = new Blob([t.translated_text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${script.original_filename || "script"}_${t.language_name}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });
    toast.success(`Downloaded ${translations.length} file(s)`);
  };

  const downloadSelected = () => {
    const selected = scripts.filter((s) => selectedRows.has(s.id));
    selected.forEach((s) => downloadTranslations(s));
  };

  const copySelected = async () => {
    const selected = scripts.filter((s) => selectedRows.has(s.id));
    const selectedLangs = selectedCols.size > 0 ? selectedCols : new Set(languages.map((l) => l.code));
    const texts: string[] = [];
    selected.forEach((s) => {
      s.translations
        ?.filter((t) => selectedLangs.has(t.language_code))
        .forEach((t) => {
          texts.push(`--- ${t.language_name} ---\n${t.translated_text}`);
        });
    });
    await navigator.clipboard.writeText(texts.join("\n\n"));
    toast.success("Copied selected to clipboard");
  };

  const deleteSelected = () => {
    const ids = Array.from(selectedRows);
    if (ids.length === 0) return;
    handleDeleteScripts(ids);
  };

  const openPopup = (
    title: string,
    content: string,
    translationId?: string,
    editable = true
  ) => {
    setPopup({ open: true, title, content, translationId, editable });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-3">
      {/* Bulk actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={downloadSelected} disabled={selectedRows.size === 0}>
          <Download className="h-4 w-4 mr-1" /> Download Selected
        </Button>
        <Button variant="outline" size="sm" onClick={copySelected} disabled={selectedRows.size === 0}>
          <Copy className="h-4 w-4 mr-1" /> Copy Selected
        </Button>
        <Button variant="outline" size="sm" onClick={deleteSelected} disabled={selectedRows.size === 0} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
        </Button>
        {selectedRows.size > 0 && <Badge variant="secondary">{selectedRows.size} selected</Badge>}
        <div className="ml-auto flex items-center gap-1">
          {allLanguages.map((lang) => (
            <Tooltip key={lang.code}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => toggleColVisibility(lang.code)} aria-label={`${hiddenCols.has(lang.code) ? "Show" : "Hide"} ${lang.name} column`}>
                  {hiddenCols.has(lang.code) ? <EyeOff className="h-3 w-3 mr-1 opacity-50" /> : <Eye className="h-3 w-3 mr-1" />}
                  {lang.code.toUpperCase()}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{hiddenCols.has(lang.code) ? "Show" : "Hide"} {lang.name}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/50">
              <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAllRows} /></TableHead>
              <TableHead className="min-w-[120px]">Original</TableHead>
              {isAdmin && <TableHead className="min-w-[100px]">User</TableHead>}
              {languages.map((lang) => (
                <TableHead key={lang.code} className="min-w-[120px]">
                  <div className="flex items-center gap-1">
                    {lang.name}
                    <Checkbox checked={selectedCols.has(lang.code)} onCheckedChange={() => toggleCol(lang.code)} className="ml-auto h-3 w-3" />
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-10">Del</TableHead>
              <TableHead className="w-10">DL</TableHead>
              <TableHead className="min-w-[90px]">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scripts.length === 0 && (
              <TableRow>
                <TableCell colSpan={languages.length + (isAdmin ? 6 : 5)} className="text-center text-muted-foreground py-12">
                  No scripts yet.{" "}
                  <Link href="/translate" className="text-primary underline underline-offset-4 hover:text-primary/80">Go to Translate</Link>{" "}
                  to create one.
                </TableCell>
              </TableRow>
            )}
            {scripts.map((script) => (
              <TableRow key={script.id} className="border-b border-border/30">
                <TableCell><Checkbox checked={selectedRows.has(script.id)} onCheckedChange={() => toggleRow(script.id)} /></TableCell>
                <TableCell>
                  <div className="group relative cursor-pointer rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors" onClick={() => openPopup("Original Script", script.original_text, undefined, false)}>
                    <span className="line-clamp-2 text-sm">{script.original_text.slice(0, 80)}...</span>
                    <button aria-label="Copy original text" className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-background" onClick={(e) => { e.stopPropagation(); copyCell(script.original_text, `orig-${script.id}`); }}>
                      {copiedCell === `orig-${script.id}` ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </TableCell>
                {isAdmin && <TableCell className="text-sm text-muted-foreground">{script.profile?.display_name || script.profile?.email}</TableCell>}
                {languages.map((lang) => {
                  const tr = getTranslation(script, lang.code);
                  const cellId = `${script.id}-${lang.code}`;
                  return (
                    <TableCell key={lang.code}>
                      {tr ? (
                        <div className="group relative cursor-pointer rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors" onClick={() => openPopup(`${lang.name} Translation`, tr.translated_text, tr.id, true)}>
                          <span className="line-clamp-2 text-sm">{tr.translated_text.slice(0, 80)}...</span>
                          <div className="absolute right-1 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-muted-foreground mr-1">{tr.word_count}w</span>
                            <button aria-label={`Copy ${lang.name} translation`} className="p-1 rounded hover:bg-background" onClick={(e) => { e.stopPropagation(); copyCell(tr.translated_text, cellId); }}>
                              {copiedCell === cellId ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      ) : <span className="text-xs text-muted-foreground/50">—</span>}
                    </TableCell>
                  );
                })}
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteScripts([script.id])} aria-label="Delete script">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => downloadTranslations(script)} aria-label="Download translations">
                    <Download className="h-4 w-4" />
                  </Button>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(script.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ScriptPopup
        open={popup.open}
        onOpenChange={(open) => setPopup((p) => ({ ...p, open }))}
        title={popup.title}
        content={popup.content}
        translationId={popup.translationId}
        editable={popup.editable}
        onSave={() => onRefresh()}
      />
    </div>
  );
}
