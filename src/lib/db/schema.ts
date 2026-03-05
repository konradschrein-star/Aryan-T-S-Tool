import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  role: text("role").default("va").notNull(),
  approved: boolean("approved").default(false).notNull(),
  banned: boolean("banned").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  xaiApiKey: text("xai_api_key"),
  openaiApiKey: text("openai_api_key"),
  googleApiKey: text("google_api_key"),
  preferredProvider: text("preferred_provider").default("xai").notNull(),
  defaultLanguages: text("default_languages")
    .array()
    .default([])
    .notNull(),
  autoFillLanguages: boolean("auto_fill_languages").default(true).notNull(),
  scriptPrompt: text("script_prompt"),
  thumbnailPrompt: text("thumbnail_prompt"),
});

export const scripts = pgTable("scripts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  originalText: text("original_text").notNull(),
  originalFilename: text("original_filename"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const scriptTranslations = pgTable("script_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  scriptId: uuid("script_id")
    .notNull()
    .references(() => scripts.id, { onDelete: "cascade" }),
  languageCode: text("language_code").notNull(),
  languageName: text("language_name").notNull(),
  translatedText: text("translated_text").notNull(),
  wordCount: integer("word_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const thumbnails = pgTable("thumbnails", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  originalUrl: text("original_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const thumbnailVariants = pgTable("thumbnail_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  thumbnailId: uuid("thumbnail_id")
    .notNull()
    .references(() => thumbnails.id, { onDelete: "cascade" }),
  variantUrl: text("variant_url").notNull(),
  promptUsed: text("prompt_used"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
