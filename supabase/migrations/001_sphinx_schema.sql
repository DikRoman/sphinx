-- SPHINX Schema for Supabase
-- Выполни в Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Включаем RLS и создаём политики для user_id
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Таблицы с user_id для мультитенантности

CREATE TABLE IF NOT EXISTS sphinx_tasks (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    id TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS sphinx_areas (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    id TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS sphinx_projects (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    id TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS sphinx_habits (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    id TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS sphinx_content (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    id TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS sphinx_notes (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    id TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS sphinx_wishboard (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sphinx_sticky (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    notes JSONB NOT NULL DEFAULT '{}',
    completed JSONB NOT NULL DEFAULT '{}',
    shapes JSONB NOT NULL DEFAULT '{}',
    background TEXT DEFAULT 'dark',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies: пользователь видит только свои данные
ALTER TABLE sphinx_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sphinx_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sphinx_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sphinx_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sphinx_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE sphinx_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sphinx_wishboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE sphinx_sticky ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tasks" ON sphinx_tasks
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own areas" ON sphinx_areas
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own projects" ON sphinx_projects
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own habits" ON sphinx_habits
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own content" ON sphinx_content
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notes" ON sphinx_notes
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own wishboard" ON sphinx_wishboard
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sticky" ON sphinx_sticky
    FOR ALL USING (auth.uid() = user_id);
