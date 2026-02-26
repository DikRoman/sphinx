/**
 * Supabase Sync — синхронизация данных с сервером
 */
const SupabaseSync = {
    initialized: false,

    init() {
        if (this.initialized || !SupabaseAuth.client) return;
        this.initialized = true;
        this.wrapStorage();
    },

    async loadFromSupabase() {
        const uid = SupabaseAuth.getUserId();
        if (!uid || !SupabaseAuth.client) return;

        try {
            const { data: tasks } = await SupabaseAuth.client.from('sphinx_tasks').select('id,data').eq('user_id', uid);
            if (tasks?.length) {
                const out = {};
                tasks.forEach(r => { out[r.id] = r.data; });
                localStorage.setItem(CONFIG.STORAGE_KEYS.TASKS, JSON.stringify(out));
            }

            const { data: areas } = await SupabaseAuth.client.from('sphinx_areas').select('id,data').eq('user_id', uid);
            if (areas?.length) {
                const out = {};
                areas.forEach(r => { out[r.id] = r.data; });
                localStorage.setItem(CONFIG.STORAGE_KEYS.AREAS, JSON.stringify(out));
            }

            const { data: habits } = await SupabaseAuth.client.from('sphinx_habits').select('id,data').eq('user_id', uid);
            if (habits?.length) {
                const out = {};
                habits.forEach(r => { out[r.id] = r.data; });
                localStorage.setItem(CONFIG.STORAGE_KEYS.HABITS, JSON.stringify(out));
            }

            const { data: content } = await SupabaseAuth.client.from('sphinx_content').select('id,data').eq('user_id', uid);
            if (content?.length) {
                const out = {};
                content.forEach(r => { out[r.id] = r.data; });
                localStorage.setItem(CONFIG.STORAGE_KEYS.CONTENT, JSON.stringify(out));
            }

            const { data: notes } = await SupabaseAuth.client.from('sphinx_notes').select('id,data').eq('user_id', uid);
            if (notes?.length) {
                const out = {};
                notes.forEach(r => { out[r.id] = r.data; });
                localStorage.setItem(CONFIG.STORAGE_KEYS.NOTES, JSON.stringify(out));
            }

            const { data: [wb] } = await SupabaseAuth.client.from('sphinx_wishboard').select('data').eq('user_id', uid);
            if (wb?.data) localStorage.setItem(CONFIG.STORAGE_KEYS.WISHBOARD, JSON.stringify(wb.data));

            const { data: [sticky] } = await SupabaseAuth.client.from('sphinx_sticky').select('*').eq('user_id', uid);
            if (sticky) {
                if (sticky.notes) localStorage.setItem('sphinx_sticky_notes', JSON.stringify(sticky.notes));
                if (sticky.completed) localStorage.setItem('sphinx_sticky_completed', JSON.stringify(sticky.completed));
                if (sticky.shapes) localStorage.setItem('sphinx_sticky_shapes', JSON.stringify(sticky.shapes));
                if (sticky.background) localStorage.setItem('sphinx_sticky_notes_background', sticky.background);
            }
        } catch (e) {
            console.error('SupabaseSync load error', e);
        }
    },

    async pushTasks(tasks) {
        await this.upsertTable('sphinx_tasks', tasks);
    },
    async pushAreas(areas) {
        await this.upsertTable('sphinx_areas', areas);
    },
    async pushHabits(habits) {
        await this.upsertTable('sphinx_habits', habits);
    },
    async pushContent(content) {
        await this.upsertTable('sphinx_content', content);
    },
    async pushNotes(notes) {
        await this.upsertTable('sphinx_notes', notes);
    },
    async pushWishboard(data) {
        const uid = SupabaseAuth.getUserId();
        if (!uid || !SupabaseAuth.client) return;
        try {
            await SupabaseAuth.client.from('sphinx_wishboard').upsert({ user_id: uid, data }, { onConflict: 'user_id' });
        } catch (e) { console.error('pushWishboard', e); }
    },
    async pushSticky(notes, completed, shapes, background) {
        const uid = SupabaseAuth.getUserId();
        if (!uid || !SupabaseAuth.client) return;
        try {
            await SupabaseAuth.client.from('sphinx_sticky').upsert({
                user_id: uid,
                notes: notes || {},
                completed: completed || {},
                shapes: shapes || {},
                background: background || 'dark'
            }, { onConflict: 'user_id' });
        } catch (e) { console.error('pushSticky', e); }
    },

    async upsertTable(table, obj) {
        const uid = SupabaseAuth.getUserId();
        if (!uid || !SupabaseAuth.client || !obj || typeof obj !== 'object') return;
        try {
            const rows = Object.entries(obj).map(([id, data]) => ({
                user_id: uid,
                id,
                data: typeof data === 'object' ? data : {}
            }));
            if (rows.length === 0) return;
            await SupabaseAuth.client.from(table).upsert(rows, { onConflict: 'user_id,id' });
        } catch (e) {
            console.error('SupabaseSync upsert', table, e);
        }
    },

    wrapStorage() {
        const wrap = (orig, push) => {
            return function(...args) {
                orig.apply(this, args);
                if (SupabaseAuth.isLoggedIn() && push && args[0] !== undefined) {
                    push.call(SupabaseSync, args[0]);
                }
            };
        };
        Storage.saveTasks = wrap(Storage.saveTasks, this.pushTasks);
        Storage.saveAreas = wrap(Storage.saveAreas, this.pushAreas);
        Storage.saveHabits = wrap(Storage.saveHabits, this.pushHabits);
        Storage.saveContent = wrap(Storage.saveContent, this.pushContent);
        Storage.saveNotes = wrap(Storage.saveNotes, this.pushNotes);
        Storage.saveWishboard = wrap(Storage.saveWishboard, this.pushWishboard);

        if (typeof StickyNotes !== 'undefined') {
            const pushSticky = () => {
                if (SupabaseAuth.isLoggedIn()) {
                    const bg = localStorage.getItem('sphinx_sticky_notes_background') || 'dark';
                    this.pushSticky(StickyNotes.notes, StickyNotes.completedNotes, StickyNotes.shapes, bg);
                }
            };
            const wrapSticky = (orig) => {
                return function(...args) {
                    orig.apply(this, args);
                    pushSticky();
                };
            };
            StickyNotes.saveNotes = wrapSticky(StickyNotes.saveNotes);
            StickyNotes.saveCompletedNotes = wrapSticky(StickyNotes.saveCompletedNotes);
            StickyNotes.saveShapes = wrapSticky(StickyNotes.saveShapes);
            const origSetBg = StickyNotes.setBackground;
            StickyNotes.setBackground = function(bg) {
                origSetBg.call(this, bg);
                pushSticky();
            };
        }
    }
};
