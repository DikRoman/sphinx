/**
 * Supabase Sync — синхронизация данных с сервером
 */
const SupabaseSync = {
    initialized: false,
    lastStatus: null, // 'idle' | 'loading' | 'ok' | 'error'
    onStatusChange: null,

    setStatus(status) {
        this.lastStatus = status;
        if (typeof this.onStatusChange === 'function') this.onStatusChange(status);
    },

    init() {
        if (this.initialized || !SupabaseAuth.client) {
            if (!SupabaseAuth.client) console.warn('[SupabaseSync] init skipped: no client');
            return;
        }
        this.initialized = true;
        this.wrapStorage();
        console.log('[SupabaseSync] initialized, storage wrapped');
    },

    async loadFromSupabase() {
        const uid = SupabaseAuth.getUserId();
        if (!uid || !SupabaseAuth.client) {
            console.warn('[SupabaseSync] loadFromSupabase skipped: uid=', !!uid, 'client=', !!SupabaseAuth.client);
            return;
        }
        this.setStatus('loading');
        console.log('[SupabaseSync] loadFromSupabase start, uid=', uid);

        try {
            // Локальные данные для первичной инициализации, если в Supabase пока пусто
            const localTasks = typeof Storage !== 'undefined' && Storage.getTasks ? Storage.getTasks() : {};
            const localAreas = typeof Storage !== 'undefined' && Storage.getAreas ? Storage.getAreas() : {};
            const localHabits = typeof Storage !== 'undefined' && Storage.getHabits ? Storage.getHabits() : {};
            const localContent = typeof Storage !== 'undefined' && Storage.getContent ? Storage.getContent() : {};
            const localNotes = typeof Storage !== 'undefined' && Storage.getNotes ? Storage.getNotes() : {};

            let hasRemoteTasks = false;
            let hasRemoteAreas = false;
            let hasRemoteHabits = false;
            let hasRemoteContent = false;
            let hasRemoteNotes = false;
            let hasRemoteSticky = false;

            const { data: tasks } = await SupabaseAuth.client.from('sphinx_tasks').select('id,data').eq('user_id', uid);
            if (tasks?.length) {
                hasRemoteTasks = true;
                const out = {};
                tasks.forEach(r => { out[r.id] = r.data; });
                localStorage.setItem(CONFIG.STORAGE_KEYS.TASKS, JSON.stringify(out));
            }

            const { data: areas } = await SupabaseAuth.client.from('sphinx_areas').select('id,data').eq('user_id', uid);
            if (areas?.length) {
                hasRemoteAreas = true;
                const out = {};
                areas.forEach(r => { out[r.id] = r.data; });
                localStorage.setItem(CONFIG.STORAGE_KEYS.AREAS, JSON.stringify(out));
            }

            const { data: habits } = await SupabaseAuth.client.from('sphinx_habits').select('id,data').eq('user_id', uid);
            if (habits?.length) {
                hasRemoteHabits = true;
                const out = {};
                habits.forEach(r => { out[r.id] = r.data; });
                localStorage.setItem(CONFIG.STORAGE_KEYS.HABITS, JSON.stringify(out));
            }

            const { data: content } = await SupabaseAuth.client.from('sphinx_content').select('id,data').eq('user_id', uid);
            if (content?.length) {
                hasRemoteContent = true;
                const out = {};
                content.forEach(r => { out[r.id] = r.data; });
                localStorage.setItem(CONFIG.STORAGE_KEYS.CONTENT, JSON.stringify(out));
            }

            const { data: notes } = await SupabaseAuth.client.from('sphinx_notes').select('id,data').eq('user_id', uid);
            if (notes?.length) {
                hasRemoteNotes = true;
                const out = {};
                notes.forEach(r => { out[r.id] = r.data; });
                localStorage.setItem(CONFIG.STORAGE_KEYS.NOTES, JSON.stringify(out));
            }

            const { data: [wb] } = await SupabaseAuth.client.from('sphinx_wishboard').select('data').eq('user_id', uid);
            if (wb?.data) localStorage.setItem(CONFIG.STORAGE_KEYS.WISHBOARD, JSON.stringify(wb.data));

            const { data: [sticky] } = await SupabaseAuth.client.from('sphinx_sticky').select('*').eq('user_id', uid);
            if (sticky) {
                hasRemoteSticky = true;
                if (sticky.notes) localStorage.setItem('sphinx_sticky_notes', JSON.stringify(sticky.notes));
                if (sticky.completed) localStorage.setItem('sphinx_sticky_completed', JSON.stringify(sticky.completed));
                if (sticky.shapes) localStorage.setItem('sphinx_sticky_shapes', JSON.stringify(sticky.shapes));
                if (sticky.background) localStorage.setItem('sphinx_sticky_notes_background', sticky.background);
            }

            const { data: [settings] } = await SupabaseAuth.client.from('sphinx_settings').select('data').eq('user_id', uid);
            if (settings?.data && typeof settings.data === 'object') {
                this.applySettings(settings.data);
            }

            // Если в Supabase пока пусто, но локальные данные есть — отправляем их как первую версию
            if (!hasRemoteTasks && localTasks && Object.keys(localTasks).length > 0) {
                await this.pushTasks(localTasks);
            }
            if (!hasRemoteAreas && localAreas && Object.keys(localAreas).length > 0) {
                await this.pushAreas(localAreas);
            }
            if (!hasRemoteHabits && localHabits && Object.keys(localHabits).length > 0) {
                await this.pushHabits(localHabits);
            }
            if (!hasRemoteContent && localContent && Object.keys(localContent).length > 0) {
                await this.pushContent(localContent);
            }
            if (!hasRemoteNotes && localNotes && Object.keys(localNotes).length > 0) {
                await this.pushNotes(localNotes);
            }
            if (!hasRemoteSticky) {
                const stickyNotes = localStorage.getItem('sphinx_sticky_notes');
                const stickyCompleted = localStorage.getItem('sphinx_sticky_completed');
                const stickyShapes = localStorage.getItem('sphinx_sticky_shapes');
                const stickyBg = localStorage.getItem('sphinx_sticky_notes_background') || 'dark';
                const notesObj = stickyNotes ? JSON.parse(stickyNotes) : {};
                const completedObj = stickyCompleted ? JSON.parse(stickyCompleted) : {};
                const shapesObj = stickyShapes ? JSON.parse(stickyShapes) : {};
                if (Object.keys(notesObj).length || Object.keys(completedObj).length || Object.keys(shapesObj).length) {
                    await this.pushSticky(notesObj, completedObj, shapesObj, stickyBg);
                }
            }
            if (!settings?.data) await this.pushSettings();

            this.setStatus('ok');
            console.log('[SupabaseSync] loadFromSupabase done');
        } catch (e) {
            this.setStatus('error');
            console.error('[SupabaseSync] load error', e);
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
        } catch (e) { console.error('[SupabaseSync] pushSticky', e); }
    },

    getSettingsFromStorage() {
        const coverUrl = localStorage.getItem('sphinx_cover_image') || '';
        const coverPos = localStorage.getItem('sphinx_cover_position') || '50% 50%';
        const coverZoom = localStorage.getItem('sphinx_cover_zoom') || '100';
        const rpBg = localStorage.getItem(CONFIG.STORAGE_KEYS.RIGHT_PANEL_BG);
        const rp = rpBg ? JSON.parse(rpBg) : {};
        const coverHeight = localStorage.getItem('sphinx_cover_height') || '';
        const rpWidth = localStorage.getItem('sphinx_right_panel_width') || '';
        const appS = localStorage.getItem(CONFIG.STORAGE_KEYS.APP_SETTINGS) || '{}';
        const tagColors = localStorage.getItem(CONFIG.STORAGE_KEYS.TAG_COLORS);
        const tagColorsMap = tagColors ? (() => { try { return JSON.parse(tagColors); } catch (e) { return {}; } })() : {};
        return {
            cover: { imageUrl: coverUrl, position: coverPos, zoom: parseFloat(coverZoom) || 100 },
            rightPanelBg: { imageUrl: rp.imageUrl || '', opacity: typeof rp.opacity === 'number' ? rp.opacity : 0.35 },
            coverHeight: coverHeight ? parseFloat(coverHeight) : null,
            rightPanelWidth: rpWidth ? parseFloat(rpWidth) : null,
            app: typeof appS === 'string' ? (() => { try { return JSON.parse(appS); } catch (e) { return {}; } })() : appS,
            tagColors: tagColorsMap
        };
    },

    applySettings(data) {
        if (!data || typeof data !== 'object') return;
        if (data.cover) {
            if (data.cover.imageUrl) {
                localStorage.setItem('sphinx_cover_image', data.cover.imageUrl);
                if (typeof Cover !== 'undefined' && Cover.loadCover) Cover.loadCover();
            }
            if (data.cover.position) localStorage.setItem('sphinx_cover_position', data.cover.position);
            if (data.cover.zoom != null) localStorage.setItem('sphinx_cover_zoom', String(data.cover.zoom));
            if (typeof Cover !== 'undefined' && Cover.loadLayout) Cover.loadLayout();
        }
        if (data.rightPanelBg) {
            const rp = { imageUrl: data.rightPanelBg.imageUrl || '', opacity: data.rightPanelBg.opacity ?? 0.35 };
            localStorage.setItem(CONFIG.STORAGE_KEYS.RIGHT_PANEL_BG, JSON.stringify(rp));
            if (typeof RightPanel !== 'undefined' && RightPanel.applyRightPanelBg) RightPanel.applyRightPanelBg();
        }
        if (data.coverHeight != null) {
            localStorage.setItem('sphinx_cover_height', String(data.coverHeight));
            const cover = document.getElementById('appCover');
            if (cover) { cover.style.height = data.coverHeight + 'px'; cover.style.minHeight = data.coverHeight + 'px'; }
        }
        if (data.rightPanelWidth != null) {
            localStorage.setItem('sphinx_right_panel_width', String(data.rightPanelWidth));
            const rp = document.getElementById('rightPanel');
            if (rp) { rp.style.width = data.rightPanelWidth + 'px'; rp.style.minWidth = data.rightPanelWidth + 'px'; }
        }
        if (data.app && typeof data.app === 'object') {
            localStorage.setItem(CONFIG.STORAGE_KEYS.APP_SETTINGS, JSON.stringify(data.app));
            if (typeof App !== 'undefined' && App.applyAppSettings) App.applyAppSettings();
        }
        if (data.tagColors && typeof data.tagColors === 'object') {
            localStorage.setItem(CONFIG.STORAGE_KEYS.TAG_COLORS, JSON.stringify(data.tagColors));
            if (typeof GTD !== 'undefined' && GTD.renderTagsNav) GTD.renderTagsNav();
        }
    },

    async pushSettings() {
        const uid = SupabaseAuth.getUserId();
        if (!uid || !SupabaseAuth.client) return;
        try {
            const data = this.getSettingsFromStorage();
            await SupabaseAuth.client.from('sphinx_settings').upsert(
                { user_id: uid, data },
                { onConflict: 'user_id' }
            );
        } catch (e) { console.error('[SupabaseSync] pushSettings', e); }
    },

    /** Ручная синхронизация: выгрузить всё из localStorage в Supabase */
    async syncNow() {
        const uid = SupabaseAuth.getUserId();
        if (!uid || !SupabaseAuth.client) {
            console.warn('[SupabaseSync] syncNow: не авторизован или нет client');
            return;
        }
        this.setStatus('loading');
        console.log('[SupabaseSync] syncNow start');
        try {
            const tasks = typeof Storage !== 'undefined' && Storage.getTasks ? Storage.getTasks() : {};
            const areas = typeof Storage !== 'undefined' && Storage.getAreas ? Storage.getAreas() : {};
            const habits = typeof Storage !== 'undefined' && Storage.getHabits ? Storage.getHabits() : {};
            const content = typeof Storage !== 'undefined' && Storage.getContent ? Storage.getContent() : {};
            const notes = typeof Storage !== 'undefined' && Storage.getNotes ? Storage.getNotes() : {};
            if (Object.keys(tasks).length) await this.pushTasks(tasks);
            if (Object.keys(areas).length) await this.pushAreas(areas);
            if (Object.keys(habits).length) await this.pushHabits(habits);
            if (Object.keys(content).length) await this.pushContent(content);
            if (Object.keys(notes).length) await this.pushNotes(notes);
            const wb = localStorage.getItem(CONFIG.STORAGE_KEYS.WISHBOARD);
            if (wb) await this.pushWishboard(JSON.parse(wb));
            const stickyNotes = localStorage.getItem('sphinx_sticky_notes');
            const stickyCompleted = localStorage.getItem('sphinx_sticky_completed');
            const stickyShapes = localStorage.getItem('sphinx_sticky_shapes');
            const stickyBg = localStorage.getItem('sphinx_sticky_notes_background') || 'dark';
            const notesObj = stickyNotes ? JSON.parse(stickyNotes) : {};
            const completedObj = stickyCompleted ? JSON.parse(stickyCompleted) : {};
            const shapesObj = stickyShapes ? JSON.parse(stickyShapes) : {};
            await this.pushSticky(notesObj, completedObj, shapesObj, stickyBg);
            await this.pushSettings();
            this.setStatus('ok');
            console.log('[SupabaseSync] syncNow done');
        } catch (e) {
            this.setStatus('error');
            console.error('[SupabaseSync] syncNow error', e);
        }
    },

    /**
     * Полная синхронизация таблицы: делаем снапшот.
     * Всё, чего НЕТ в локальном объекте, удаляется на сервере, чтобы
     * "воскресшие" задачи / области не возвращались после синка.
     */
    async upsertTable(table, obj) {
        const uid = SupabaseAuth.getUserId();
        if (!uid || !SupabaseAuth.client) return;
        if (!obj || typeof obj !== 'object') return;
        try {
            const client = SupabaseAuth.client;

            // 1) Получаем текущие id на сервере
            const { data: remoteRows, error: selectError } = await client
                .from(table)
                .select('id')
                .eq('user_id', uid);
            if (selectError) {
                console.error('[SupabaseSync] select error before upsert', table, selectError.message, selectError);
            }

            const localIds = new Set(Object.keys(obj));
            const remoteIds = new Set((remoteRows || []).map(r => r.id));

            // 2) Удаляем на сервере всё, чего нет локально
            const toDelete = Array.from(remoteIds).filter(id => !localIds.has(id));
            if (toDelete.length > 0) {
                const { error: deleteError } = await client
                    .from(table)
                    .delete()
                    .eq('user_id', uid)
                    .in('id', toDelete);
                if (deleteError) {
                    console.error('[SupabaseSync] delete error during upsert', table, deleteError.message, deleteError);
                }
            }

            // 3) Если локально вообще ничего нет — после удаления таблица становится пустой
            if (localIds.size === 0) {
                return;
            }

            // 4) Апсертим свежий снапшот локальных данных
            const rows = Array.from(localIds).map(id => ({
                user_id: uid,
                id,
                data: typeof obj[id] === 'object' ? obj[id] : {}
            }));

            const { error } = await client.from(table).upsert(rows, { onConflict: 'user_id,id' });
            if (error) {
                this.setStatus('error');
                console.error('[SupabaseSync] upsert error', table, error.message, error);
            }
        } catch (e) {
            this.setStatus('error');
            console.error('[SupabaseSync] upsert exception', table, e);
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
        Storage.saveRightPanelBg = wrap(Storage.saveRightPanelBg, () => this.pushSettings());
        Storage.saveAppSettings = wrap(Storage.saveAppSettings, () => this.pushSettings());

        if (typeof Cover !== 'undefined') {
            const origSetBg = Cover.setBackground?.bind(Cover);
            if (origSetBg) {
                Cover.setBackground = (url) => {
                    origSetBg(url);
                    if (SupabaseAuth.isLoggedIn()) this.pushSettings();
                };
            }
            const origSavePos = Cover.savePositionXY?.bind(Cover);
            if (origSavePos) {
                Cover.savePositionXY = (x, y) => {
                    origSavePos(x, y);
                    if (SupabaseAuth.isLoggedIn()) this.pushSettings();
                };
            }
        }

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
