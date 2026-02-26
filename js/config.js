// Configuration
const CONFIG = {
    STORAGE_KEYS: {
        TASKS: 'sphinx_tasks',
        AREAS: 'sphinx_areas',
        PROJECTS: 'sphinx_projects',
        HABITS: 'sphinx_habits',
        CONTENT: 'sphinx_content',
        NOTES: 'sphinx_notes',
        WISHBOARD: 'sphinx_wishboard',
        WISHBOARD_SETTINGS: 'sphinx_wishboard_settings',
        YOUTUBE_PLAYLISTS: 'sphinx_youtube_playlists',
        YOUTUBE_HISTORY: 'sphinx_youtube_history',
        INBOX_COLUMNS: 'sphinx_inbox_columns',
        RIGHT_PANEL_BG: 'sphinx_right_panel_bg'
    },

    // Колонки Inbox по умолчанию (порядок, название, цвет шапки, картинка)
    DEFAULT_INBOX_COLUMNS: [
        { id: 'new', name: 'Новые', color: '#00F5FF', imageUrl: '', order: 0 },
        { id: 'in-progress', name: 'В процессе', color: '#FFE135', imageUrl: '', order: 1 },
        { id: 'done', name: 'Готово', color: '#00FF88', imageUrl: '', order: 2 }
    ],
    
    // Default Areas
    DEFAULT_AREAS: [
        { id: 'work', name: 'Работа', icon: 'briefcase', color: '#6366f1' },
        { id: 'personal', name: 'Личное', icon: 'user', color: '#10b981' },
        { id: 'health', name: 'Здоровье', icon: 'heart', color: '#ef4444' },
        { id: 'learning', name: 'Обучение', icon: 'graduation-cap', color: '#f59e0b' }
    ],
    
    // Task Statuses
    TASK_STATUSES: {
        NEW: 'new',
        IN_PROGRESS: 'in-progress',
        DONE: 'done'
    },
    
    // Priorities
    PRIORITIES: {
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low'
    },

    // Эмодзи для задач: обычные и аниме/каомодзи
    TASK_EMOJI: [
        '😀', '😊', '😎', '🤔', '😴', '🥳', '👍', '❤️', '🔥', '⭐', '✅', '❌', '🎉', '📌', '💡', '📝',
        '🏠', '💼', '🎯', '⏰', '📅', '🔔', '💪', '🙏', '✨', '💎', '🎨', '📚', '☕', '🍕', '🚀', '🌈'
    ],
    TASK_EMOJI_KAOMOJI: [
        '(◕‿◕)', '(´・ω・`)', '(╯°□°)╯', 'ヽ(´▽`)/', '( ͡° ͜ʖ ͡°)', '¯\\_(ツ)_/¯', '(•_•)', '( •_•)>⌐■-■',
        '(ノಠ益ಠ)ノ', 'ಠ_ಠ', '(╥﹏╥)', '☆*:.｡.o(≧▽≦)o.｡.:*☆', '(ﾉ◕ヮ◕)ﾉ*', 'ヽ(°〇°)ﾉ', '（´・ω・）',
        '(´｡• ω •｡`)', 'ヾ(≧▽≦*)o', '(๑•̀ㅂ•́)و', '（ﾉ´∀`）', '♪(´ε` )', '(´。• ᵕ •。`)', '☆⌒ヽ(*\'-\'*)'
    ],

    // Content Types
    CONTENT_TYPES: {
        MOVIES: 'movies',
        BOOKS: 'books',
        SERIES: 'series'
    },
    
    // Content Genres
    CONTENT_GENRES: {
        MOVIES: [
            'Драма', 'Комедия', 'Боевик', 'Триллер', 'Ужасы', 'Фантастика', 
            'Фэнтези', 'Романтика', 'Детектив', 'Приключения', 'Анимация', 'Документальный'
        ],
        BOOKS: [
            'Художественная литература', 'Научная литература', 'Биография', 'История',
            'Философия', 'Психология', 'Бизнес', 'Саморазвитие', 'Фантастика', 'Фэнтези',
            'Детектив', 'Роман', 'Поэзия', 'Драма'
        ],
        SERIES: [
            'Драма', 'Комедия', 'Триллер', 'Криминал', 'Детектив', 'Фантастика',
            'Фэнтези', 'Ужасы', 'Романтика', 'Исторический', 'Документальный'
        ]
    },
    
    // Habit Frequencies
    HABIT_FREQUENCIES: {
        DAILY: 'daily',
        WEEKLY: 'weekly',
        CUSTOM: 'custom'
    },
    
    // Calendar Views
    CALENDAR_VIEWS: {
        DAY: 'day',
        WEEK: 'week',
        MONTH: 'month'
    }
};
