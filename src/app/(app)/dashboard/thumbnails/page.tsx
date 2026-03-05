"use client";

import { useCallback, useEffect, useState } from "react";
import { Thumbnail } from "@/types";
import { ThumbnailTable } from "@/components/thumbnail-table";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getThumbnails } from "@/lib/actions/thumbnails";

export default function ThumbnailsPage() {
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getThumbnails();
      if (result.error) {
        toast.error("Failed to load thumbnails");
      } else {
        setThumbnails(result.data as Thumbnail[]);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Thumbnails</h1>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ThumbnailTable thumbnails={thumbnails} onRefresh={fetchData} />
      )}
    </div>
  );
}
