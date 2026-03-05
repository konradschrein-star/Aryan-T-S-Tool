"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, Save, Check } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface ScriptPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
  translationId?: string;
  editable?: boolean;
  onSave?: (newText: string) => void;
}

export function ScriptPopup({
  open,
  onOpenChange,
  title,
  content,
  translationId,
  editable = true,
  onSave,
}: ScriptPopupProps) {
  const [text, setText] = useState(content);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  };

  const handleSave = async () => {
    if (!translationId) return;
    setSaving(true);
    const wc = text.trim().split(/\s+/).filter(Boolean).length;
    const { error } = await supabase
      .from("script_translations")
      .update({ translated_text: text, word_count: wc })
      .eq("id", translationId);
    setSaving(false);
    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Saved");
      onSave?.(text);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>{title}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {wordCount} words
            </span>
          </DialogTitle>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={!editable}
          className="flex-1 min-h-[400px] resize-none font-mono text-sm"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download .txt
          </Button>
          {editable && translationId && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
