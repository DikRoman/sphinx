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
        YOUTUBE_HISTORY: 'sphinx_youtube_history'
    },
    
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
