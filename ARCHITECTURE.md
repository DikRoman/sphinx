# Архитектура SPHINX

## Структура

```
SPHINX/
├── index.html          # Единая точка входа, layout shell
├── pages/              # HTML-фрагменты страниц (подгружаются динамически)
│   ├── inbox.html
│   ├── today.html
│   ├── calendar.html
│   ├── sticky-notes.html
│   ├── habits.html
│   ├── content.html
│   ├── gantt.html
│   ├── wishboard.html
│   ├── area.html
│   └── project.html
├── js/
│   ├── core/           # Ядро (всегда загружается)
│   │   ├── config.js
│   │   └── storage.js
│   ├── shared/         # Общие модули (загрузка по необходимости)
│   │   ├── gtd.js
│   │   ├── kanban.js
│   │   ├── layout.js   # Cover, RightPanel, модалки
│   │   └── modals.js
│   └── pages/          # Модули страниц (ленивая загрузка)
│       ├── inbox.js
│       ├── today.js
│       ├── calendar.js
│       ├── sticky-notes.js
│       ├── habits.js
│       ├── content.js
│       ├── gantt.js
│       ├── wishboard.js
│       ├── area.js
│       └── project.js
├── styles/
│   └── main.css
└── app.js              # Роутер, инициализация
```

## Роутинг

- **Hash-based:** `#inbox`, `#today`, `#calendar`, `#sticky-notes`, `#habits`, `#content`, `#gantt`, `#wishboard`, `#area/ID`, `#project/ID`
- При навигации: fetch страницы → inject в main → init модуль страницы
- History API для красивых URL (опционально)

## Загрузка модулей

1. **Ядро** (всегда): config, storage
2. **Layout** (сразу): cover, right-panel, modals, gtd (для sidebar)
3. **Страница** (при первом посещении): динамический import или script inject

## Преимущества

- Быстрая загрузка: только нужное
- Чёткое разделение: каждая страница — отдельный файл
- Один layout — нет дублирования
- localStorage — общее состояние между страницами
