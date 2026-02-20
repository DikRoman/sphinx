# Supabase: настройка для SPHINX

## 1. Создай проект

1. Зайди на [supabase.com](https://supabase.com) и создай проект
2. В Dashboard → **Settings → API** скопируй:
   - **Project URL**
   - **anon public** (ключ)

## 2. Конфигурация

Вставь значения в `js/supabase-config.js`:

```js
const SUPABASE_CONFIG = {
    url: 'https://xxxx.supabase.co',
    anonKey: 'твой_anon_key'
};
```

## 3. Схема БД

В **Supabase → SQL Editor** выполни SQL из `supabase/migrations/001_sphinx_schema.sql` (New query → вставить → Run).

Если таблицы уже создавались со старой схемой (id без user_id в PK), удали их и выполни миграцию заново.

## 4. OAuth (Google / GitHub)

### Google
1. [Google Cloud Console](https://console.cloud.google.com) → Credentials → Create OAuth 2.0 Client ID
2. Application type: **Web application**
3. Authorized redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Скопируй Client ID и Client Secret
5. Supabase → **Authentication → Providers → Google** → включи и вставь ID и Secret

### GitHub
1. [GitHub Developer Settings](https://github.com/settings/developers) → New OAuth App
2. Authorization callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Скопируй Client ID и Client Secret
4. Supabase → **Authentication → Providers → GitHub** → включи и вставь ID и Secret

## 5. Локальная разработка

Для локального теста (file:// или localhost) добавь в Supabase **Authentication → URL Configuration**:
- Site URL: `http://localhost:3000` (или твой порт)

---

После настройки блок входа появится в нижней части сайдбара.
