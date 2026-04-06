# Архитектура репозитория (Ascension)

## Текущее приложение (корень)

- **`index.html`** — одностраничное RPG-приложение самообучения (навигация по `location.hash`).
- **`js/rpg-data.js`** — схема данных, localStorage (`sphinx_ascension_v1`), XP героя и навыков, курсы, книги, лог.
- **`js/rpg-app.js`** — экраны: Святилище, Навыки, Курсы, Книги, Графики; модалки.
- **`styles/main.css`** — визуальный стиль (ориентир: Hades / Dota 2 — тёмный фон, золото, бордовый акцент).
- **`landing.html`** — страница входа (Supabase); стили только из `styles/landing.css` + `js/supabase-*.js`, `js/landing.js`.

## Прочее

- **`supabase/`** — SQL миграции (использовались старым GTD; новое приложение пока только localStorage).
- **`vercel.json`** — реwrites для статики.
