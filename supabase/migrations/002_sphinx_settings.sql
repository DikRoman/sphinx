-- SPHINX Settings — обложка, фон правой панели, настройки UI
-- Одна строка на пользователя

CREATE TABLE IF NOT EXISTS sphinx_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sphinx_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings" ON sphinx_settings
    FOR ALL USING (auth.uid() = user_id);
