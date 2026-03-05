import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateThumbnailVariant } from "@/lib/ai/thumbnail";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { imageBase64, mimeType, prompt } = body;

    if (!imageBase64 || !mimeType || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields: imageBase64, mimeType, prompt" },
        { status: 400 }
      );
    }

    const [settings] = await db
      .select({ googleApiKey: userSettings.googleApiKey })
      .from(userSettings)
      .where(eq(userSettings.userId, session.user.id))
      .limit(1);

    if (!settings) {
      return NextResponse.json(
        { error: "User settings not found. Please configure your API keys in settings." },
        { status: 404 }
      );
    }

    if (!settings.googleApiKey) {
      return NextResponse.json(
        { error: "No Google API key configured. Please add your key in settings." },
        { status: 400 }
      );
    }

    const result = await generateThumbnailVariant({
      imageBase64,
      mimeType,
      prompt,
      apiKey: settings.googleApiKey,
    });

    return NextResponse.json({ base64: result.base64, mimeType: result.mimeType });
  } catch (error) {
    console.error("Thumbnail generation error:", error);
    const message =
      error instanceof Error ? error.message : "Thumbnail generation failed";
    return NextResponse.json(
      { error: "Thumbnail generation failed", details: message },
      { status: 500 }
    );
  }
}
