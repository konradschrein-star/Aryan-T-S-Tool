import OpenAI from "openai";

interface TranslateParams {
  text: string;
  targetLanguage: string;
  prompt: string;
  provider: "xai" | "openai";
  apiKey: string;
}

export async function translateScript({
  text,
  targetLanguage,
  prompt,
  provider,
  apiKey,
}: TranslateParams): Promise<string> {
  const fullPrompt = prompt.replace(/\[TARGET LANGUAGE\]/g, targetLanguage);

  const client = new OpenAI({
    apiKey,
    baseURL:
      provider === "xai"
        ? "https://api.x.ai/v1"
        : "https://api.openai.com/v1",
  });

  const response = await client.chat.completions.create({
    model: provider === "xai" ? "grok-3" : "gpt-4o",
    messages: [
      { role: "system", content: fullPrompt },
      { role: "user", content: text },
    ],
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content ?? "";
}
