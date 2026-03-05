import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { translateScript } from "@/lib/ai/translate";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: "User settings not found. Please configure your API keys in settings." },
        { status: 404 }
      );
    }

    const provider = settings.preferred_provider as "xai" | "openai";
    const apiKey =
      provider === "xai" ? settings.xai_api_key : settings.openai_api_key;

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
