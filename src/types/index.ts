export type UserRole = "owner" | "va";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  approved: boolean;
  banned: boolean;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  xai_api_key: string | null;
  openai_api_key: string | null;
  google_api_key: string | null;
  preferred_provider: "xai" | "openai";
  default_languages: string[];
  auto_fill_languages: boolean;
  script_prompt: string;
  thumbnail_prompt: string;
}

export interface Script {
  id: string;
  user_id: string;
  original_text: string;
  original_filename: string | null;
  created_at: string;
  translations?: ScriptTranslation[];
  profile?: Profile;
}

export interface ScriptTranslation {
  id: string;
  script_id: string;
  language_code: string;
  language_name: string;
  translated_text: string;
  word_count: number;
  created_at: string;
}

export interface Thumbnail {
  id: string;
  user_id: string;
  original_url: string;
  created_at: string;
  variants?: ThumbnailVariant[];
  profile?: Profile;
}

export interface ThumbnailVariant {
  id: string;
  thumbnail_id: string;
  variant_url: string;
  prompt_used: string | null;
  created_at: string;
}

export interface Language {
  code: string;
  name: string;
  category: "youtube" | "european";
}
