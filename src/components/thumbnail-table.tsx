"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { deleteThumbnails as deleteThumbnailsAction } from "@/lib/actions/thumbnails";
import { Thumbnail } from "@/types";
import { ThumbnailPopup } from "./thumbnail-popup";

interface ThumbnailTableProps {
  thumbnails: Thumbnail[];
  isAdmin?: boolean;
  onRefresh: () => void;
}

export function ThumbnailTable({ thumbnails, isAdmin = false, onRefresh }: ThumbnailTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [popup, setPopup] = useState<{ open: boolean; title: string; imageUrl: string }>({ open: false, title: "", imageUrl: "" });
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  const allSelected = thumbnails.length > 0 && selectedRows.size === thumbnails.length;

  const toggleAllRows = () => {
    if (allSelected) setSelectedRows(new Set());
    else setSelectedRows(new Set(thumbnails.map((t) => t.id)));
  };

  const toggleRow = (id: string) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedRows(next);
  };

  const maxVariants = thumbnails.reduce((max, t) => Math.max(max, t.variants?.length ?? 0), 0);

  const handleDeleteThumbnails = async (ids: string[]) => {
    const count = ids.length;
    const confirmed = window.confirm(`Are you sure you want to delete ${count} thumbnail${count > 1 ? "s" : ""}? This action cannot be undone.`);
    if (!confirmed) return;

    const result = await deleteThumbnailsAction(ids);
    if (result.error) {
      toast.error("Failed to delete");
    } else {
      toast.success(`Deleted ${ids.length} thumbnail(s)`);
      setSelectedRows(new Set());
      onRefresh();
    }
  };

  const downloadImage = useCallback(async (url: string, filename: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  }, []);

  const downloadAll = (thumb: Thumbnail) => {
    thumb.variants?.forEach((v, i) => { downloadImage(v.variant_url, `variant_${i + 1}.png`); });
    toast.success(`Downloaded ${thumb.variants?.length ?? 0} variant(s)`);
  };

  const downloadSelected = () => {
    thumbnails.filter((t) => selectedRows.has(t.id)).forEach((t) => downloadAll(t));
  };

  const copyImage = useCallback(async (url: string, cellId: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopiedCell(cellId);
      toast.success("Copied");
      setTimeout(() => setCopiedCell(null), 1500);
    } catch { toast.error("Failed to copy"); }
  }, []);

  const deleteSelected = () => {
    const ids = Array.from(selectedRows);
    if (ids.length === 0) return;
    handleDeleteThumbnails(ids);
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={downloadSelected} disabled={selectedRows.size === 0}>
          <Download className="h-4 w-4 mr-1" /> Download Selected
        </Button>
        <Button variant="outline" size="sm" onClick={deleteSelected} disabled={selectedRows.size === 0} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
        </Button>
        {selectedRows.size > 0 && <Badge variant="secondary">{selectedRows.size} selected</Badge>}
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/50">
              <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAllRows} /></TableHead>
              <TableHead className="min-w-[100px]">Original</TableHead>
              {isAdmin && <TableHead className="min-w-[100px]">User</TableHead>}
              {Array.from({ length: Math.max(maxVariants, 1) }, (_, i) => (
                <TableHead key={i} className="min-w-[100px]">Variant {i + 1}</TableHead>
              ))}
              <TableHead className="w-10">Del</TableHead>
              <TableHead className="w-10">DL</TableHead>
              <TableHead className="min-w-[90px]">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {thumbnails.length === 0 && (
              <TableRow>
                <TableCell colSpan={Math.max(maxVariants, 1) + (isAdmin ? 6 : 5)} className="text-center text-muted-foreground py-12">
                  No thumbnails yet.{" "}
                  <Link href="/generate" className="text-primary underline underline-offset-4 hover:text-primary/80">Go to Generate</Link>{" "}
                  to create one.
                </TableCell>
              </TableRow>
            )}
            {thumbnails.map((thumb) => (
              <TableRow key={thumb.id} className="border-b border-border/30">
                <TableCell><Checkbox checked={selectedRows.has(thumb.id)} onCheckedChange={() => toggleRow(thumb.id)} /></TableCell>
                <TableCell>
                  <div className="group relative cursor-pointer" onMouseEnter={() => setHoveredImage(`orig-${thumb.id}`)} onMouseLeave={() => setHoveredImage(null)} onClick={() => setPopup({ open: true, title: "Original Thumbnail", imageUrl: thumb.original_url })}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumb.original_url} alt="Original" className="h-16 w-28 object-cover rounded-md border border-border/50" />
                    {hoveredImage === `orig-${thumb.id}` && (
                      <div className="absolute z-50 bottom-full left-0 mb-2 p-1 bg-popover rounded-lg shadow-xl border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumb.original_url} alt="Original (enlarged)" className="h-48 w-auto object-contain rounded" />
                      </div>
                    )}
                  </div>
                </TableCell>
                {isAdmin && <TableCell className="text-sm text-muted-foreground">{thumb.profile?.display_name || thumb.profile?.email}</TableCell>}
                {Array.from({ length: Math.max(maxVariants, 1) }, (_, i) => {
                  const variant = thumb.variants?.[i];
                  const cellId = `${thumb.id}-v${i}`;
                  return (
                    <TableCell key={i}>
                      {variant ? (
                        <div className="group relative cursor-pointer" onMouseEnter={() => setHoveredImage(cellId)} onMouseLeave={() => setHoveredImage(null)} onClick={() => setPopup({ open: true, title: `Variant ${i + 1}`, imageUrl: variant.variant_url })}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={variant.variant_url} alt={`Variant ${i + 1}`} className="h-16 w-28 object-cover rounded-md border border-border/50" />
                          <button aria-label={`Copy variant ${i + 1}`} className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-bl bg-background/80" onClick={(e) => { e.stopPropagation(); copyImage(variant.variant_url, cellId); }}>
                            {copiedCell === cellId ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                          {hoveredImage === cellId && (
                            <div className="absolute z-50 bottom-full left-0 mb-2 p-1 bg-popover rounded-lg shadow-xl border">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={variant.variant_url} alt={`Variant ${i + 1} (enlarged)`} className="h-48 w-auto object-contain rounded" />
                            </div>
                          )}
                        </div>
                      ) : <span className="text-xs text-muted-foreground/50">—</span>}
                    </TableCell>
                  );
                })}
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteThumbnails([thumb.id])} aria-label="Delete thumbnail">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => downloadAll(thumb)} aria-label="Download all variants">
                    <Download className="h-4 w-4" />
                  </Button>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(thumb.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ThumbnailPopup open={popup.open} onOpenChange={(open) => setPopup((p) => ({ ...p, open }))} title={popup.title} imageUrl={popup.imageUrl} />
    </div>
  );
}
