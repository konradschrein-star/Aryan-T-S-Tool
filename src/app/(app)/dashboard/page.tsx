"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Script, UserSettings } from "@/types";
import { ScriptTable } from "@/components/script-table";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_LANGUAGE_CODES } from "@/lib/constants";

export default function DashboardPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [visibleLanguages, setVisibleLanguages] = useState<string[]>(DEFAULT_LANGUAGE_CODES);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [scriptsResult, settingsResult] = await Promise.all([
        supabase
          .from("scripts")
          .select("*, translations:script_translations(*)")
          .order("created_at", { ascending: false }),
        supabase.from("user_settings").select("default_languages").single(),
      ]);

      if (scriptsResult.error) {
        toast.error("Failed to load scripts");
      } else {
        setScripts(scriptsResult.data ?? []);
      }

      if (settingsResult.error) {
        console.warn("Failed to load language settings, using defaults");
      } else if (settingsResult.data?.default_languages) {
        setVisibleLanguages(settingsResult.data.default_languages);
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
        <h1 className="text-2xl font-bold tracking-tight">Scripts</h1>
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
        <ScriptTable
          scripts={scripts}
          visibleLanguages={visibleLanguages}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
