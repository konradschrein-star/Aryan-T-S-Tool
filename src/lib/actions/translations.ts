"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scriptTranslations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function updateTranslation(
  id: string,
  translatedText: string,
  wordCount: number
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  try {
    await db
      .update(scriptTranslations)
      .set({ translatedText, wordCount })
      .where(eq(scriptTranslations.id, id));

    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update translation" };
  }
}
