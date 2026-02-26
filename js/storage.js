// Storage Management
const Storage = {
    // Tasks
    getTasks() {
        const tasks = localStorage.getItem(CONFIG.STORAGE_KEYS.TASKS);
        return tasks ? JSON.parse(tasks) : {};
    },

    saveTasks(tasks) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    },

    getTask(id) {
        const tasks = this.getTasks();
        return tasks[id] || null;
    },

    saveTask(id, task) {
        const tasks = this.getTasks();
        const existingTask = tasks[id];
        tasks[id] = {
            ...task,
            id,
            createdAt: existingTask?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.saveTasks(tasks);
        return tasks[id];
    },

    deleteTask(id) {
        const tasks = this.getTasks();
        delete tasks[id];
        this.saveTasks(tasks);
    },

    // Areas
    getAreas() {
        const areas = localStorage.getItem(CONFIG.STORAGE_KEYS.AREAS);
        if (areas) {
            return JSON.parse(areas);
        }
        // Initialize with default areas
        const defaultAreas = {};
        CONFIG.DEFAULT_AREAS.forEach(area => {
            defaultAreas[area.id] = {
                ...area,
                createdAt: new Date().toISOString()
            };
        });
        this.saveAreas(defaultAreas);
        return defaultAreas;
    },

    saveAreas(areas) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.AREAS, JSON.stringify(areas));
    },

    saveArea(id, area) {
        const areas = this.getAreas();
        areas[id] = {
            ...area,
            id,
            updatedAt: new Date().toISOString()
        };
        this.saveAreas(areas);
        return areas[id];
    },

    deleteArea(id) {
        const areas = this.getAreas();
        delete areas[id];
        this.saveAreas(areas);
    },

    // Habits
    getHabits() {
        const habits = localStorage.getItem(CONFIG.STORAGE_KEYS.HABITS);
        return habits ? JSON.parse(habits) : {};
    },

    saveHabits(habits) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.HABITS, JSON.stringify(habits));
    },

    saveHabit(id, habit) {
        const habits = this.getHabits();
        habits[id] = {
            ...habit,
            id,
            updatedAt: new Date().toISOString()
        };
        this.saveHabits(habits);
        return habits[id];
    },

    deleteHabit(id) {
        const habits = this.getHabits();
        delete habits[id];
        this.saveHabits(habits);
    },

    // Content (formerly Media)
    getContent() {
        const content = localStorage.getItem(CONFIG.STORAGE_KEYS.CONTENT);
        return content ? JSON.parse(content) : {};
    },

    saveContent(content) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.CONTENT, JSON.stringify(content));
    },

    saveContentItem(id, item) {
        const content = this.getContent();
        content[id] = {
            ...item,
            id,
            updatedAt: new Date().toISOString()
        };
        this.saveContent(content);
        return content[id];
    },

    deleteContentItem(id) {
        const content = this.getContent();
        delete content[id];
        this.saveContent(content);
    },

    // Notes
    getNotes() {
        const notes = localStorage.getItem(CONFIG.STORAGE_KEYS.NOTES);
        return notes ? JSON.parse(notes) : {};
    },

    saveNotes(notes) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.NOTES, JSON.stringify(notes));
    },

    saveNote(id, note) {
        const notes = this.getNotes();
        notes[id] = {
            ...note,
            id,
            updatedAt: new Date().toISOString()
        };
        this.saveNotes(notes);
        return notes[id];
    },

    deleteNote(id) {
        const notes = this.getNotes();
        delete notes[id];
        this.saveNotes(notes);
    },

    // Wish Board
    getWishboard() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.WISHBOARD);
        if (!data) return { boards: [{ id: 'default', name: 'Основная', images: [] }], currentBoardId: 'default' };
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            return { boards: [{ id: 'default', name: 'Основная', images: parsed }], currentBoardId: 'default' };
        }
        return parsed;
    },

    saveWishboard(data) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.WISHBOARD, JSON.stringify(data));
    },

    getWishboardSettings() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.WISHBOARD_SETTINGS);
        return data ? JSON.parse(data) : { background: 'dark' };
    },

    saveWishboardSettings(settings) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.WISHBOARD_SETTINGS, JSON.stringify(settings));
    },

    // YouTube playlists
    getYoutubePlaylists() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.YOUTUBE_PLAYLISTS);
        return data ? JSON.parse(data) : { playlists: [] };
    },

    saveYoutubePlaylists(data) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.YOUTUBE_PLAYLISTS, JSON.stringify(data));
    },

    getYoutubeHistory() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.YOUTUBE_HISTORY);
        return data ? JSON.parse(data) : { positions: {}, lastVideo: null };
    },

    saveYoutubeHistory(data) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.YOUTUBE_HISTORY, JSON.stringify(data));
    },

    // Inbox columns (custom blocks: name, color, image, order)
    getInboxColumns() {
        const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.INBOX_COLUMNS);
        if (!raw) return CONFIG.DEFAULT_INBOX_COLUMNS.map((c, i) => ({ ...c, order: i }));
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length > 0
            ? parsed.slice().sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
            : CONFIG.DEFAULT_INBOX_COLUMNS.map((c, i) => ({ ...c, order: i }));
    },

    saveInboxColumns(columns) {
        const withOrder = columns.map((c, i) => ({ ...c, order: i }));
        localStorage.setItem(CONFIG.STORAGE_KEYS.INBOX_COLUMNS, JSON.stringify(withOrder));
    },

    getRightPanelBg() {
        const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.RIGHT_PANEL_BG);
        if (!raw) return { imageUrl: '', opacity: 0.35 };
        const p = JSON.parse(raw);
        return { imageUrl: p.imageUrl || '', opacity: typeof p.opacity === 'number' ? p.opacity : 0.35 };
    },

    saveRightPanelBg(data) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.RIGHT_PANEL_BG, JSON.stringify(data));
    }
};
