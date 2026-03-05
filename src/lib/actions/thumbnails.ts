"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { thumbnails, thumbnailVariants, users } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export async function getThumbnails() {
  const session = await auth();
  if (!session?.user?.id) return { data: [], error: "Not authenticated" };

  try {
    const rows = await db
      .select()
      .from(thumbnails)
      .where(eq(thumbnails.userId, session.user.id))
      .orderBy(desc(thumbnails.createdAt));

    const thumbsWithVariants = await Promise.all(
      rows.map(async (thumb) => {
        const variants = await db
          .select()
          .from(thumbnailVariants)
          .where(eq(thumbnailVariants.thumbnailId, thumb.id));

        return {
          id: thumb.id,
          user_id: thumb.userId,
          original_url: thumb.originalUrl,
          created_at: thumb.createdAt.toISOString(),
          variants: variants.map((v) => ({
            id: v.id,
            thumbnail_id: v.thumbnailId,
            variant_url: v.variantUrl,
            prompt_used: v.promptUsed,
            created_at: v.createdAt.toISOString(),
          })),
        };
      })
    );

    return { data: thumbsWithVariants, error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Failed to fetch thumbnails" };
  }
}

export async function getAdminThumbnails() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "owner") {
    return { data: [], error: "Forbidden" };
  }

  try {
    const rows = await db
      .select()
      .from(thumbnails)
      .orderBy(desc(thumbnails.createdAt));

    const thumbsWithData = await Promise.all(
      rows.map(async (thumb) => {
        const variants = await db
          .select()
          .from(thumbnailVariants)
          .where(eq(thumbnailVariants.thumbnailId, thumb.id));

        const [profile] = await db
          .select({
            display_name: users.displayName,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, thumb.userId))
          .limit(1);

        return {
          id: thumb.id,
          user_id: thumb.userId,
          original_url: thumb.originalUrl,
          created_at: thumb.createdAt.toISOString(),
          variants: variants.map((v) => ({
            id: v.id,
            thumbnail_id: v.thumbnailId,
            variant_url: v.variantUrl,
            prompt_used: v.promptUsed,
            created_at: v.createdAt.toISOString(),
          })),
          profile: profile ? { display_name: profile.display_name, email: profile.email } : undefined,
        };
      })
    );

    return { data: thumbsWithData, error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Failed to fetch thumbnails" };
  }
}

export async function deleteThumbnails(ids: string[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  try {
    await db.delete(thumbnails).where(inArray(thumbnails.id, ids));
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to delete" };
  }
}

export async function saveThumbnails(data: {
  originalDataUrl: string;
  variants: { base64: string; mimeType: string; promptUsed: string }[];
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  try {
    const [thumb] = await db
      .insert(thumbnails)
      .values({
        userId: session.user.id,
        originalUrl: data.originalDataUrl,
      })
      .returning({ id: thumbnails.id });

    for (const variant of data.variants) {
      const variantDataUrl = `data:${variant.mimeType};base64,${variant.base64}`;
      await db.insert(thumbnailVariants).values({
        thumbnailId: thumb.id,
        variantUrl: variantDataUrl,
        promptUsed: variant.promptUsed,
      });
    }

    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save thumbnails" };
  }
}
