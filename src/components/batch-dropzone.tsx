"use client";

import { useState, useCallback } from "react";
import { Upload, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BatchDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export function BatchDropzone({ files, onFilesChange }: BatchDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === "text/plain" || f.name.endsWith(".txt")
      );
      onFilesChange([...files, ...dropped]);
    },
    [files, onFilesChange]
  );

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      onFilesChange([...files, ...selected]);
      e.target.value = "";
    },
    [files, onFilesChange]
  );

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("batch-file-input")?.click()}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drop .txt files here or click to browse
        </p>
        <input
          id="batch-file-input"
          type="file"
          multiple
          accept=".txt,text/plain"
          className="hidden"
          onChange={handleSelect}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{files.length} file(s)</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onFilesChange([])}
            >
              Clear all
            </Button>
          </div>
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm bg-muted/50 rounded px-3 py-1.5"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </span>
              <button
                onClick={() => removeFile(i)}
                className="p-0.5 hover:bg-background rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
