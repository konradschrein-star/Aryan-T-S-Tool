"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scripts, scriptTranslations, users } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export async function getScripts() {
  const session = await auth();
  if (!session?.user?.id) return { data: [], error: "Not authenticated" };

  try {
    const rows = await db
      .select()
      .from(scripts)
      .where(eq(scripts.userId, session.user.id))
      .orderBy(desc(scripts.createdAt));

    const scriptsWithTranslations = await Promise.all(
      rows.map(async (script) => {
        const translations = await db
          .select()
          .from(scriptTranslations)
          .where(eq(scriptTranslations.scriptId, script.id));

        return {
          id: script.id,
          user_id: script.userId,
          original_text: script.originalText,
          original_filename: script.originalFilename,
          created_at: script.createdAt.toISOString(),
          translations: translations.map((t) => ({
            id: t.id,
            script_id: t.scriptId,
            language_code: t.languageCode,
            language_name: t.languageName,
            translated_text: t.translatedText,
            word_count: t.wordCount,
            created_at: t.createdAt.toISOString(),
          })),
        };
      })
    );

    return { data: scriptsWithTranslations, error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Failed to fetch scripts" };
  }
}

export async function getAdminScripts() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "owner") {
    return { data: [], error: "Forbidden" };
  }

  try {
    const rows = await db
      .select()
      .from(scripts)
      .orderBy(desc(scripts.createdAt));

    const scriptsWithData = await Promise.all(
      rows.map(async (script) => {
        const translations = await db
          .select()
          .from(scriptTranslations)
          .where(eq(scriptTranslations.scriptId, script.id));

        const [profile] = await db
          .select({
            display_name: users.displayName,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, script.userId))
          .limit(1);

        return {
          id: script.id,
          user_id: script.userId,
          original_text: script.originalText,
          original_filename: script.originalFilename,
          created_at: script.createdAt.toISOString(),
          translations: translations.map((t) => ({
            id: t.id,
            script_id: t.scriptId,
            language_code: t.languageCode,
            language_name: t.languageName,
            translated_text: t.translatedText,
            word_count: t.wordCount,
            created_at: t.createdAt.toISOString(),
          })),
          profile: profile ? { display_name: profile.display_name, email: profile.email } : undefined,
        };
      })
    );

    return { data: scriptsWithData, error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Failed to fetch scripts" };
  }
}

export async function deleteScripts(ids: string[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  try {
    await db.delete(scripts).where(inArray(scripts.id, ids));
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to delete" };
  }
}

export async function createScript(originalText: string, originalFilename: string | null) {
  const session = await auth();
  if (!session?.user?.id) return { data: null, error: "Not authenticated" };

  try {
    const [row] = await db
      .insert(scripts)
      .values({
        userId: session.user.id,
        originalText,
        originalFilename,
      })
      .returning({ id: scripts.id });

    return { data: { id: row.id }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to create script" };
  }
}

export async function insertTranslation(data: {
  scriptId: string;
  languageCode: string;
  languageName: string;
  translatedText: string;
  wordCount: number;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  try {
    await db.insert(scriptTranslations).values({
      scriptId: data.scriptId,
      languageCode: data.languageCode,
      languageName: data.languageName,
      translatedText: data.translatedText,
      wordCount: data.wordCount,
    });
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save translation" };
  }
}
