"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getSettings() {
  const session = await auth();
  if (!session?.user?.id) return { data: null, error: "Not authenticated" };

  try {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, session.user.id))
      .limit(1);

    if (!settings) return { data: null, error: null };

    return {
      data: {
        user_id: settings.userId,
        xai_api_key: settings.xaiApiKey,
        openai_api_key: settings.openaiApiKey,
        google_api_key: settings.googleApiKey,
        preferred_provider: settings.preferredProvider as "xai" | "openai",
        default_languages: settings.defaultLanguages,
        auto_fill_languages: settings.autoFillLanguages,
        script_prompt: settings.scriptPrompt ?? "",
        thumbnail_prompt: settings.thumbnailPrompt ?? "",
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to fetch settings" };
  }
}

export async function saveSettings(data: {
  xaiApiKey: string | null;
  openaiApiKey: string | null;
  googleApiKey: string | null;
  preferredProvider: "xai" | "openai";
  defaultLanguages: string[];
  autoFillLanguages: boolean;
  scriptPrompt: string;
  thumbnailPrompt: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  try {
    const [existing] = await db
      .select({ userId: userSettings.userId })
      .from(userSettings)
      .where(eq(userSettings.userId, session.user.id))
      .limit(1);

    const values = {
      userId: session.user.id,
      xaiApiKey: data.xaiApiKey,
      openaiApiKey: data.openaiApiKey,
      googleApiKey: data.googleApiKey,
      preferredProvider: data.preferredProvider,
      defaultLanguages: data.defaultLanguages,
      autoFillLanguages: data.autoFillLanguages,
      scriptPrompt: data.scriptPrompt,
      thumbnailPrompt: data.thumbnailPrompt,
    };

    if (existing) {
      await db
        .update(userSettings)
        .set(values)
        .where(eq(userSettings.userId, session.user.id));
    } else {
      await db.insert(userSettings).values(values);
    }

    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save settings" };
  }
}
