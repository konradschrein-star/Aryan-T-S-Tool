import { Language } from "@/types";

export const ALL_LANGUAGES: Language[] = [
  // Common YouTube Set
  { code: "es", name: "Spanish", category: "youtube" },
  { code: "pt", name: "Portuguese", category: "youtube" },
  { code: "hi", name: "Hindi", category: "youtube" },
  { code: "de", name: "German", category: "youtube" },
  { code: "fr", name: "French", category: "youtube" },
  { code: "ja", name: "Japanese", category: "youtube" },
  { code: "ko", name: "Korean", category: "youtube" },
  { code: "ar", name: "Arabic", category: "youtube" },
  { code: "tr", name: "Turkish", category: "youtube" },
  { code: "id", name: "Indonesian", category: "youtube" },
  // European Additions
  { code: "it", name: "Italian", category: "european" },
  { code: "nl", name: "Dutch", category: "european" },
  { code: "pl", name: "Polish", category: "european" },
  { code: "ru", name: "Russian", category: "european" },
  { code: "sv", name: "Swedish", category: "european" },
  { code: "cs", name: "Czech", category: "european" },
  { code: "ro", name: "Romanian", category: "european" },
  { code: "el", name: "Greek", category: "european" },
];

export const DEFAULT_LANGUAGE_CODES = [
  "es", "pt", "hi", "de", "fr", "ja", "ko", "ar", "tr", "id",
];

export const DEFAULT_SCRIPT_PROMPT =
  "please translate this script to [TARGET LANGUAGE]. translate names and places to [TARGET LANGUAGE] as well. the word count MUST STRICTLY BE SIMILAR. if the english script is around 1000 words, the translated script MUST be around 1000 words. if it is around 8000 words, the translated script MUST be around 8000 words. do not include any meta comments, ONLY the script should be included in your output.";

export const DEFAULT_THUMBNAIL_PROMPT =
  "please change the hair colour of all the characters in the video to another realistic colour";
