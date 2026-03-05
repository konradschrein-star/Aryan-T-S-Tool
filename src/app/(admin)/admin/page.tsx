"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Script, Thumbnail } from "@/types";
import { ScriptTable } from "@/components/script-table";
import { ThumbnailTable } from "@/components/thumbnail-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_LANGUAGE_CODES } from "@/lib/constants";

export default function AdminContentPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [defaultLanguages, setDefaultLanguages] = useState<string[]>(DEFAULT_LANGUAGE_CODES);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [scriptsResult, thumbnailsResult, settingsResult] =
        await Promise.all([
          supabase
            .from("scripts")
            .select("*, translations:script_translations(*), profile:profiles!scripts_user_id_fkey(*)")
            .order("created_at", { ascending: false }),
          supabase
            .from("thumbnails")
            .select("*, variants:thumbnail_variants(*), profile:profiles!thumbnails_user_id_fkey(*)")
            .order("created_at", { ascending: false }),
          supabase.from("user_settings").select("default_languages").single(),
        ]);

      if (scriptsResult.error) {
        toast.error("Failed to load scripts");
      } else {
        setScripts(scriptsResult.data ?? []);
      }
      if (thumbnailsResult.error) {
        toast.error("Failed to load thumbnails");
      } else {
        setThumbnails(thumbnailsResult.data ?? []);
      }
      if (settingsResult.error) {
        console.warn("Failed to load language settings, using defaults");
      } else if (settingsResult.data?.default_languages) {
        setDefaultLanguages(settingsResult.data.default_languages);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Admin - All Content</h1>
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
        <Tabs defaultValue="scripts">
          <TabsList>
            <TabsTrigger value="scripts">Scripts ({scripts.length})</TabsTrigger>
            <TabsTrigger value="thumbnails">Thumbnails ({thumbnails.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="scripts" className="mt-4">
            <ScriptTable
              scripts={scripts}
              visibleLanguages={defaultLanguages}
              isAdmin
              onRefresh={fetchData}
            />
          </TabsContent>
          <TabsContent value="thumbnails" className="mt-4">
            <ThumbnailTable
              thumbnails={thumbnails}
              isAdmin
              onRefresh={fetchData}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
