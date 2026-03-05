import { GoogleGenerativeAI } from "@google/generative-ai";

interface GenerateThumbnailParams {
  imageBase64: string;
  mimeType: string;
  prompt: string;
  apiKey: string;
}

export async function generateThumbnailVariant({
  imageBase64,
  mimeType,
  prompt,
  apiKey,
}: GenerateThumbnailParams): Promise<{ base64: string; mimeType: string }> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      // @ts-expect-error - responseModalities not in types yet
      responseModalities: ["image", "text"],
    },
  });

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ]);

  const response = result.response;
  const parts = response.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    if (part.inlineData) {
      return {
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }

  throw new Error("No image returned from Gemini");
}
