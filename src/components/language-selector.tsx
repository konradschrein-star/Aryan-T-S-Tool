"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ALL_LANGUAGES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

interface LanguageSelectorProps {
  selected: string[];
  onChange: (codes: string[]) => void;
}

export function LanguageSelector({ selected, onChange }: LanguageSelectorProps) {
  const [defaults, setDefaults] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_settings")
        .select("default_languages, auto_fill_languages")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setDefaults(data.default_languages ?? []);
        if (data.auto_fill_languages && selected.length === 0) {
          onChange(data.default_languages ?? []);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  const selectAll = () => onChange(ALL_LANGUAGES.map((l) => l.code));
  const selectDefaults = () => onChange([...defaults]);
  const clearAll = () => onChange([]);

  const youtubeSet = ALL_LANGUAGES.filter((l) => l.category === "youtube");
  const europeanSet = ALL_LANGUAGES.filter((l) => l.category === "european");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Target Languages</span>
        <Badge variant="secondary">{selected.length} selected</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectDefaults}>
            Defaults
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
            All
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>
            Clear
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">YouTube Set</p>
        <div className="grid grid-cols-5 gap-2">
          {youtubeSet.map((lang) => (
            <label
              key={lang.code}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <Checkbox
                checked={selected.includes(lang.code)}
                onCheckedChange={() => toggle(lang.code)}
              />
              {lang.name}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">European</p>
        <div className="grid grid-cols-5 gap-2">
          {europeanSet.map((lang) => (
            <label
              key={lang.code}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <Checkbox
                checked={selected.includes(lang.code)}
                onCheckedChange={() => toggle(lang.code)}
              />
              {lang.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
