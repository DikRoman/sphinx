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

    // Projects
    getProjects() {
        const projects = localStorage.getItem(CONFIG.STORAGE_KEYS.PROJECTS);
        return projects ? JSON.parse(projects) : {};
    },

    saveProjects(projects) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    },

    saveProject(id, project) {
        const projects = this.getProjects();
        projects[id] = {
            ...project,
            id,
            updatedAt: new Date().toISOString()
        };
        this.saveProjects(projects);
        return projects[id];
    },

    deleteProject(id) {
        const projects = this.getProjects();
        delete projects[id];
        this.saveProjects(projects);
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
    }
};
