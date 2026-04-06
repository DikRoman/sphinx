/**
 * Локальные данные RPG-платформы самообучения (localStorage)
 */
const RPG_STORAGE_KEY = 'sphinx_ascension_v1';

const RPG_DEFAULTS = () => ({
    hero: {
        name: 'Искатель знаний',
        epithet: 'Ученик Подземного пути',
        level: 1,
        xpCurrent: 0,
        xpToNext: 120,
        portrait: '⚔️'
    },
    skills: [
        { id: 'sk_code', name: 'Код и системы', icon: 'fa-code', color: '#5bc0de', xp: 0 },
        { id: 'sk_design', name: 'Дизайн и вкус', icon: 'fa-palette', color: '#d4af37', xp: 0 },
        { id: 'sk_lang', name: 'Языки', icon: 'fa-language', color: '#a78bfa', xp: 0 },
        { id: 'sk_science', name: 'Наука и логика', icon: 'fa-atom', color: '#4ade80', xp: 0 },
        { id: 'sk_soft', name: 'Софт-скиллы', icon: 'fa-comments', color: '#f472b6', xp: 0 },
        { id: 'sk_body', name: 'Тело и режим', icon: 'fa-heart-pulse', color: '#ef4444', xp: 0 }
    ],
    courses: [],
    books: [],
    log: [],
    inspiration: []
});

const RPGData = {
    load() {
        try {
            const raw = localStorage.getItem(RPG_STORAGE_KEY);
            if (!raw) return this.migrateOrDefault();
            const data = JSON.parse(raw);
            return this.normalize(data);
        } catch {
            return RPG_DEFAULTS();
        }
    },

    migrateOrDefault() {
        return RPG_DEFAULTS();
    },

    normalize(data) {
        const d = { ...RPG_DEFAULTS(), ...data, hero: { ...RPG_DEFAULTS().hero, ...(data.hero || {}) } };
        if (!Array.isArray(d.skills) || d.skills.length === 0) d.skills = RPG_DEFAULTS().skills;
        if (!Array.isArray(d.courses)) d.courses = [];
        if (!Array.isArray(d.books)) d.books = [];
        if (!Array.isArray(d.log)) d.log = [];
        if (!Array.isArray(d.inspiration)) d.inspiration = [];
        d.courses.forEach(c => {
            if (!Array.isArray(c.lessons)) c.lessons = [];
            if (!Array.isArray(c.skillIds)) c.skillIds = [];
        });
        d.books.forEach(b => {
            if (typeof b.progress !== 'number') b.progress = 0;
            if (!Array.isArray(b.skillIds)) b.skillIds = [];
        });
        return d;
    },

    save(data) {
        localStorage.setItem(RPG_STORAGE_KEY, JSON.stringify(data));
    },

    skillLevel(xp) {
        return 1 + Math.floor((xp || 0) / 180);
    },

    xpInCurrentSkillLevel(xp) {
        const lv = this.skillLevel(xp);
        return (xp || 0) - (lv - 1) * 180;
    },

    xpForNextSkillLevel(xp) {
        const lv = this.skillLevel(xp);
        return lv * 180 - (xp || 0);
    },

    addLog(state, type, message, xp = 0) {
        state.log.unshift({
            id: 'log_' + Date.now(),
            at: new Date().toISOString(),
            type,
            message,
            xp
        });
        state.log = state.log.slice(0, 80);
    },

    grantHeroXp(state, amount, reason) {
        if (amount <= 0) return state;
        const h = state.hero;
        h.xpCurrent = (h.xpCurrent || 0) + amount;
        let leveled = false;
        while (h.xpCurrent >= (h.xpToNext || 120)) {
            h.xpCurrent -= h.xpToNext;
            h.level = (h.level || 1) + 1;
            h.xpToNext = Math.round(100 + h.level * 45 + h.level * h.level * 2);
            leveled = true;
        }
        this.addLog(state, 'xp', reason + (leveled ? ` · Уровень ${h.level}!` : ''), amount);
        return state;
    },

    grantSkillXp(state, skillIds, amount, reason) {
        if (!skillIds || !skillIds.length || amount <= 0) return state;
        const set = new Set(skillIds);
        state.skills.forEach(s => {
            if (set.has(s.id)) s.xp = (s.xp || 0) + amount;
        });
        this.addLog(state, 'skill', reason, amount);
        return state;
    },

    completeLesson(state, courseId, lessonId) {
        const c = state.courses.find(x => x.id === courseId);
        if (!c) return state;
        const L = c.lessons.find(l => l.id === lessonId);
        if (!L || L.done) return state;
        L.done = true;
        L.doneAt = new Date().toISOString();
        const lessonXp = L.xpReward || 25;
        this.grantHeroXp(state, lessonXp, `Урок «${L.title}»`);
        this.grantSkillXp(state, c.skillIds, Math.round(lessonXp * 0.6), `Навыки: «${c.title}»`);
        this.save(state);
        return state;
    },

    addCourse(state, { title, provider, skillIds }) {
        const id = 'c_' + Date.now();
        state.courses.push({
            id,
            title: title || 'Без названия',
            provider: provider || '',
            skillIds: skillIds || [],
            lessons: [],
            createdAt: new Date().toISOString()
        });
        this.addLog(state, 'course', `Новый курс: ${title}`);
        this.save(state);
        return state;
    },

    addLesson(state, courseId, title, xpReward) {
        const c = state.courses.find(x => x.id === courseId);
        if (!c) return state;
        c.lessons.push({
            id: 'l_' + Date.now(),
            title: title || 'Урок',
            done: false,
            xpReward: Math.max(5, parseInt(xpReward, 10) || 25)
        });
        this.save(state);
        return state;
    },

    addBook(state, { title, author, skillIds }) {
        state.books.push({
            id: 'b_' + Date.now(),
            title: title || 'Книга',
            author: author || '',
            progress: 0,
            skillIds: skillIds || [],
            createdAt: new Date().toISOString()
        });
        this.addLog(state, 'book', `В библиотеку: ${title}`);
        this.save(state);
        return state;
    },

    setBookProgress(state, bookId, progress) {
        const b = state.books.find(x => x.id === bookId);
        if (!b) return state;
        const prev = b.progress || 0;
        b.progress = Math.max(0, Math.min(100, Math.round(progress)));
        const delta = b.progress - prev;
        if (delta > 0) {
            const chunkXp = Math.max(3, Math.round(delta / 5));
            this.grantHeroXp(state, chunkXp, `Чтение «${b.title}» +${delta}%`);
            this.grantSkillXp(state, b.skillIds, Math.round(chunkXp * 0.5), `Книга «${b.title}»`);
        }
        this.save(state);
        return state;
    },

    updateHero(state, patch) {
        Object.assign(state.hero, patch);
        this.save(state);
        return state;
    },

    deleteCourse(state, id) {
        state.courses = state.courses.filter(c => c.id !== id);
        this.save(state);
        return state;
    },

    deleteBook(state, id) {
        state.books = state.books.filter(b => b.id !== id);
        this.save(state);
        return state;
    },

    normalizeImageUrl(url) {
        const u = (url || '').trim();
        if (!u) return '';
        if (/^https?:\/\//i.test(u)) return u;
        if (/^data:image\//i.test(u)) return u;
        return '';
    },

    addInspiration(state, { url, caption }) {
        const clean = this.normalizeImageUrl(url);
        if (!clean) return state;
        if ((state.inspiration || []).length >= 48) return state;
        const tilt = (Math.random() * 6 - 3).toFixed(1);
        state.inspiration.push({
            id: 'insp_' + Date.now(),
            url: clean,
            caption: (caption || '').trim().slice(0, 120),
            tilt: parseFloat(tilt) || 0,
            createdAt: new Date().toISOString()
        });
        this.save(state);
        return state;
    },

    deleteInspiration(state, id) {
        state.inspiration = (state.inspiration || []).filter(x => x.id !== id);
        this.save(state);
        return state;
    },

    weeklyXp(state) {
        const weeks = {};
        const now = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            weeks[key] = 0;
        }
        state.log.forEach(entry => {
            if (!entry.at || entry.xp <= 0) return;
            const day = entry.at.slice(0, 10);
            if (weeks[day] !== undefined) weeks[day] += entry.xp;
        });
        return Object.entries(weeks).reverse();
    },

    /** Дни с активностью (XP в логе) для календаря-сетки */
    calendarActivityCells(state, numDays = 35) {
        const active = new Set();
        (state.log || []).forEach(e => {
            if (e.at && (e.xp > 0 || e.type === 'xp' || e.type === 'skill')) active.add(e.at.slice(0, 10));
        });
        const cells = [];
        for (let i = numDays - 1; i >= 0; i--) {
            const d = new Date();
            d.setHours(12, 0, 0, 0);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            cells.push({
                key,
                day: d.getDate(),
                weekday: d.getDay(),
                active: active.has(key)
            });
        }
        return cells;
    },

    /** Условная «валюта» для HUD (сумма XP навыков + прогресс героя) */
    metaCurrency(state) {
        const sk = (state.skills || []).reduce((a, s) => a + (s.xp || 0), 0);
        const h = state.hero || {};
        return Math.floor(sk + (h.level || 1) * 80 + (h.xpCurrent || 0));
    }
};
