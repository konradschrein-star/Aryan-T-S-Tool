import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { translateScript } from "@/lib/ai/translate";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text, targetLanguage, prompt } = body;

    if (!text || !targetLanguage || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields: text, targetLanguage, prompt" },
        { status: 400 }
      );
    }

    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, session.user.id))
      .limit(1);

    if (!settings) {
      return NextResponse.json(
        { error: "User settings not found. Please configure your API keys in settings." },
        { status: 404 }
      );
    }

    const provider = settings.preferredProvider as "xai" | "openai";
    const apiKey =
      provider === "xai" ? settings.xaiApiKey : settings.openaiApiKey;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: `No API key configured for provider "${provider}". Please add your key in settings.`,
        },
        { status: 400 }
      );
    }

    const translatedText = await translateScript({
      text,
      targetLanguage,
      prompt,
      provider,
      apiKey,
    });

    const wordCount = translatedText
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    return NextResponse.json({ translatedText, wordCount });
  } catch (error) {
    console.error("Translation error:", error);
    const message =
      error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json(
      { error: "Translation failed", details: message },
      { status: 500 }
    );
  }
}
