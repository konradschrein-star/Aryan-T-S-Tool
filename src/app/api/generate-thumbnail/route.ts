import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateThumbnailVariant } from "@/lib/ai/thumbnail";

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
    const { imageBase64, mimeType, prompt } = body;

    if (!imageBase64 || !mimeType || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields: imageBase64, mimeType, prompt" },
        { status: 400 }
      );
    }

    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("google_api_key")
      .eq("user_id", user.id)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: "User settings not found. Please configure your API keys in settings." },
        { status: 404 }
      );
    }

    if (!settings.google_api_key) {
      return NextResponse.json(
        { error: "No Google API key configured. Please add your key in settings." },
        { status: 400 }
      );
    }

    const result = await generateThumbnailVariant({
      imageBase64,
      mimeType,
      prompt,
      apiKey: settings.google_api_key,
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
