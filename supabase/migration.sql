-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'va' CHECK (role IN ('owner', 'va')),
  approved BOOLEAN NOT NULL DEFAULT false,
  banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  xai_api_key TEXT,
  openai_api_key TEXT,
  google_api_key TEXT,
  preferred_provider TEXT DEFAULT 'xai' CHECK (preferred_provider IN ('xai', 'openai')),
  default_languages TEXT[] DEFAULT '{es,pt,hi,de,fr,ja,ko,ar,tr,id}',
  auto_fill_languages BOOLEAN DEFAULT true,
  script_prompt TEXT DEFAULT 'please translate this script to [TARGET LANGUAGE]. translate names and places to [TARGET LANGUAGE] as well. the word count MUST STRICTLY BE SIMILAR. if the english script is around 1000 words, the translated script MUST be around 1000 words. if it is around 8000 words, the translated script MUST be around 8000 words. do not include any meta comments, ONLY the script should be included in your output.',
  thumbnail_prompt TEXT DEFAULT 'please change the hair colour of all the characters in the video to another realistic colour',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scripts
CREATE TABLE IF NOT EXISTS scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  original_text TEXT NOT NULL,
  original_filename TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Script translations
CREATE TABLE IF NOT EXISTS script_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID REFERENCES scripts(id) ON DELETE CASCADE NOT NULL,
  language_code TEXT NOT NULL,
  language_name TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(script_id, language_code)
);

-- Thumbnails
CREATE TABLE IF NOT EXISTS thumbnails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  original_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thumbnail variants
CREATE TABLE IF NOT EXISTS thumbnail_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thumbnail_id UUID REFERENCES thumbnails(id) ON DELETE CASCADE NOT NULL,
  variant_url TEXT NOT NULL,
  prompt_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE thumbnails ENABLE ROW LEVEL SECURITY;
ALTER TABLE thumbnail_variants ENABLE ROW LEVEL SECURITY;

-- Profiles: users see own, owner sees all
CREATE POLICY "Users view own profile" ON profiles FOR SELECT USING (
  auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- User settings: own only
CREATE POLICY "Users view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Scripts: own data, owner sees all
CREATE POLICY "Users view own scripts" ON scripts FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Users insert own scripts" ON scripts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own scripts" ON scripts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own scripts" ON scripts FOR DELETE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Script translations: via script ownership
CREATE POLICY "Users view own translations" ON script_translations FOR SELECT USING (
  EXISTS (SELECT 1 FROM scripts WHERE scripts.id = script_id AND (scripts.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')))
);
CREATE POLICY "Users insert own translations" ON script_translations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM scripts WHERE scripts.id = script_id AND scripts.user_id = auth.uid())
);
CREATE POLICY "Users delete own translations" ON script_translations FOR DELETE USING (
  EXISTS (SELECT 1 FROM scripts WHERE scripts.id = script_id AND (scripts.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')))
);
CREATE POLICY "Users update own translations" ON script_translations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM scripts WHERE scripts.id = script_id AND scripts.user_id = auth.uid())
);

-- Thumbnails: own data, owner sees all
CREATE POLICY "Users view own thumbnails" ON thumbnails FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Users insert own thumbnails" ON thumbnails FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own thumbnails" ON thumbnails FOR DELETE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Thumbnail variants: via thumbnail ownership
CREATE POLICY "Users view own variants" ON thumbnail_variants FOR SELECT USING (
  EXISTS (SELECT 1 FROM thumbnails WHERE thumbnails.id = thumbnail_id AND (thumbnails.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')))
);
CREATE POLICY "Users insert own variants" ON thumbnail_variants FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM thumbnails WHERE thumbnails.id = thumbnail_id AND thumbnails.user_id = auth.uid())
);
CREATE POLICY "Users delete own variants" ON thumbnail_variants FOR DELETE USING (
  EXISTS (SELECT 1 FROM thumbnails WHERE thumbnails.id = thumbnail_id AND (thumbnails.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')))
);

-- Storage bucket for thumbnails
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Anyone can view thumbnails" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');
CREATE POLICY "Authenticated users upload thumbnails" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'thumbnails' AND auth.role() = 'authenticated');
CREATE POLICY "Users delete own thumbnails" ON storage.objects FOR DELETE USING (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);
