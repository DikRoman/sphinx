// Main Application
const App = {
    _confirmHandler: null,

    init() {
        this.applyAppSettings();
        // Initialize modules
        GTD.init();
        Kanban.init();
        Habits.init();
        Content.init();
        Calendar.init();
        Notes.init();
        StickyNotes.init();
        Wishboard.init();
        if (typeof RightPanel !== 'undefined') RightPanel.init();
        Gantt.init();
        if (typeof Cover !== 'undefined') Cover.init();

        // Supabase Auth — ДО роутера! Иначе роутер перезапишет #access_token при OAuth редиректе
        this.setupSupabase();

        // Router — hash-based navigation and page loading
        Router.init('pageContainer');

        // Setup sidebar toggle
        this.setupSidebarToggle();

        // Переход на лендинг по клику на SPHINX
        document.getElementById('logoToLanding')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'landing.html';
        });

        // Setup modals
        this.setupModals();

        // Right panel: resize, music collapse
        this.setupPanelControls();

        this.setupAppSettings();
        this.setupConfirmModal();

        // Initial page load via Router (hashchange triggers on load)
        this.moveViewHeaderToCover();

        console.log('SPHINX GTD initialized');
    },

    applyAppSettings() {
        const s = Storage.getAppSettings();
        document.body.setAttribute('data-theme', s.theme || 'dark');
        document.querySelectorAll('[data-nav-block]').forEach(el => {
            const key = el.getAttribute('data-nav-block');
            el.classList.toggle('nav-hidden', !s.nav[key]);
        });
    },

    setupAppSettings() {
        const btn = document.getElementById('sidebarSettingsBtn');
        const modal = document.getElementById('appSettingsModal');
        const themeSelect = document.getElementById('appSettingsTheme');
        const togglesEl = document.getElementById('appSettingsNavToggles');
        const saveBtn = document.getElementById('appSettingsSave');

        btn?.addEventListener('click', () => {
            const s = Storage.getAppSettings();
            themeSelect.value = s.theme || 'dark';
            togglesEl.innerHTML = (CONFIG.NAV_BLOCKS || []).map(b => `
                <label class="app-settings-toggle-row">
                    <input type="checkbox" data-nav-block="${b.id}" ${s.nav[b.id] !== false ? 'checked' : ''}>
                    <span>${b.label}</span>
                </label>
            `).join('');
            modal?.classList.add('active');
        });

        saveBtn?.addEventListener('click', () => {
            const nav = {};
            (CONFIG.NAV_BLOCKS || []).forEach(b => { nav[b.id] = togglesEl.querySelector(`[data-nav-block="${b.id}"]`)?.checked !== false; });
            Storage.saveAppSettings({ theme: themeSelect.value, nav });
            this.applyAppSettings();
            modal?.classList.remove('active');
        });

        document.querySelector('[data-close="appSettingsModal"]')?.addEventListener('click', () => modal?.classList.remove('active'));
        modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
    },

    setupPanelControls() {
        const COVER_HEIGHT_KEY = 'sphinx_cover_height';
        const RIGHT_PANEL_WIDTH_KEY = 'sphinx_right_panel_width';
        const DEFAULT_COVER = 135;
        const DEFAULT_RIGHT_PANEL = 220;

        const cover = document.getElementById('appCover');
        const coverResizeHandle = document.getElementById('coverResizeHandle');
        const rightPanel = document.getElementById('rightPanel');
        const rightPanelResizeHandle = document.getElementById('rightPanelResizeHandle');
        const musicTab = document.getElementById('musicCollapseTab');
        const musicPlayer = document.getElementById('rightPanelPlayer');

        if (rightPanelResizeHandle && rightPanel) {
            let dragging = false;
            let startX = 0, startWidth = 0;
            const minW = 160, maxW = 360;
            rightPanelResizeHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                dragging = true;
                rightPanelResizeHandle.classList.add('dragging');
                rightPanel.classList.add('right-panel-resizing');
                startX = e.clientX;
                startWidth = parseInt(rightPanel.style.width) || DEFAULT_RIGHT_PANEL;
            });
            document.addEventListener('mousemove', (e) => {
                if (!dragging) return;
                const dx = e.clientX - startX;
                let w = Math.max(minW, Math.min(maxW, startWidth + dx));
                rightPanel.style.width = w + 'px';
                rightPanel.style.minWidth = w + 'px';
                localStorage.setItem(RIGHT_PANEL_WIDTH_KEY, String(w));
            });
            document.addEventListener('mouseup', () => {
                if (dragging) {
                    dragging = false;
                    rightPanelResizeHandle.classList.remove('dragging');
                    rightPanel.classList.remove('right-panel-resizing');
                    if (typeof SupabaseSync !== 'undefined' && SupabaseSync.pushSettings) SupabaseSync.pushSettings();
                }
            });
            const savedW = localStorage.getItem(RIGHT_PANEL_WIDTH_KEY);
            if (savedW) {
                const w = parseInt(savedW);
                if (w >= minW && w <= maxW) {
                    rightPanel.style.width = w + 'px';
                    rightPanel.style.minWidth = w + 'px';
                }
            }
        }

        if (coverResizeHandle && cover) {
            let dragging = false;
            let startY = 0, startHeight = 0;
            const minCover = 60, maxCover = 200;

            coverResizeHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                dragging = true;
                coverResizeHandle.classList.add('dragging');
                cover.classList.add('cover-resizing');
                startY = e.clientY;
                startHeight = parseInt(cover.style.height) || DEFAULT_COVER;
            });
            document.addEventListener('mousemove', (e) => {
                if (!dragging) return;
                const dy = e.clientY - startY;
                let h = Math.max(minCover, Math.min(maxCover, startHeight + dy));
                cover.style.height = h + 'px';
                cover.style.minHeight = h + 'px';
                localStorage.setItem(COVER_HEIGHT_KEY, String(h));
            });
            document.addEventListener('mouseup', () => {
                if (dragging) {
                    dragging = false;
                    coverResizeHandle.classList.remove('dragging');
                    cover.classList.remove('cover-resizing');
                    if (typeof SupabaseSync !== 'undefined' && SupabaseSync.pushSettings) SupabaseSync.pushSettings();
                }
            });
            const saved = localStorage.getItem(COVER_HEIGHT_KEY);
            if (saved) {
                const h = parseInt(saved);
                if (h >= minCover && h <= maxCover) {
                    cover.style.height = h + 'px';
                    cover.style.minHeight = h + 'px';
                }
            }
        }

        if (musicTab && musicPlayer) {
            const collapsed = localStorage.getItem('sphinx_music_collapsed') === '1';
            if (collapsed) musicPlayer.classList.add('collapsed');
            const icon = musicTab.querySelector('i');
            musicTab.addEventListener('click', () => {
                const c = musicPlayer.classList.toggle('collapsed');
                localStorage.setItem('sphinx_music_collapsed', c ? '1' : '0');
                if (icon) icon.className = c ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
            });
            if (icon && collapsed) icon.className = 'fas fa-chevron-up';
        }
    },

    setupConfirmModal() {
        const modal = document.getElementById('confirmModal');
        if (!modal) return;
        const msgEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        const close = () => {
            modal.classList.remove('active');
            this._confirmHandler = null;
        };

        okBtn?.addEventListener('click', () => {
            if (typeof this._confirmHandler === 'function') {
                const fn = this._confirmHandler;
                this._confirmHandler = null;
                fn();
            }
            close();
        });

        cancelBtn?.addEventListener('click', close);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });
    },

    /**
     * Красивое подтверждение удаления в центре экрана.
     * message — текст, onConfirm — колбэк при подтверждении.
     */
    confirmDelete(message, onConfirm) {
        const modal = document.getElementById('confirmModal');
        const msgEl = document.getElementById('confirmMessage');
        const titleEl = document.getElementById('confirmTitle');
        if (!modal || !msgEl || !titleEl) {
            // fallback на стандартный confirm
            if (confirm(message || 'Удалить?')) {
                if (typeof onConfirm === 'function') onConfirm();
            }
            return;
        }
        titleEl.textContent = 'Удалить?';
        msgEl.textContent = message || 'Вы уверены, что хотите удалить?';
        this._confirmHandler = typeof onConfirm === 'function' ? onConfirm : null;
        modal.classList.add('active');
    },

    setupSupabase() {
        const block = document.getElementById('authBlock');
        if (block) block.setAttribute('data-configured', SupabaseAuth?.isConfigured() ? '1' : '0');
        if (typeof SupabaseAuth === 'undefined' || !SupabaseAuth.isConfigured()) return;
        SupabaseAuth.init(async (session) => {
            this.updateAuthUI(session);
            if (session) {
                if (/[?#](access_token|refresh_token|error|code)=/i.test(location.href)) {
                    location.replace(location.pathname + location.search + '#inbox');
                }
                SupabaseSync.init();
                SupabaseSync.onStatusChange = (status) => this.updateSyncStatusUI(status);
                this.updateSyncStatusUI(SupabaseSync.lastStatus || 'idle');
                await SupabaseSync.loadFromSupabase();
                GTD.renderAreas();
                Kanban.renderKanban('inboxKanban', null, 'inbox');
                Habits.render();
                Content.render();
                Notes.render();
                Wishboard.render();
                StickyNotes.loadNotes();
                StickyNotes.loadCompletedNotes();
                StickyNotes.loadShapes();
                StickyNotes.setupBackground();
                GTD.updateBadges();
            }
        });
        document.getElementById('authGoogle')?.addEventListener('click', () => SupabaseAuth.signInWithGoogle());
        document.getElementById('authGithub')?.addEventListener('click', () => SupabaseAuth.signInWithGithub());
        document.getElementById('authLogout')?.addEventListener('click', () => SupabaseAuth.signOut());
        const avatarBtn = document.getElementById('authAvatarBtn');
        const popover = document.getElementById('authProfilePopover');
        if (avatarBtn && popover) {
            avatarBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                popover.classList.toggle('visible');
            });
            document.addEventListener('click', () => popover.classList.remove('visible'));
            popover.addEventListener('click', (e) => e.stopPropagation());
        }
        document.getElementById('authSyncNow')?.addEventListener('click', () => {
            if (SupabaseAuth.isLoggedIn() && typeof SupabaseSync?.syncNow === 'function') {
                SupabaseSync.syncNow();
            }
        });
    },

    updateSyncStatusUI(status) {
        const el = document.getElementById('authSyncStatus');
        if (!el) return;
        const labels = { idle: '', loading: '…', ok: '✓', error: '!' };
        el.textContent = labels[status] || '';
        el.setAttribute('data-status', status || 'idle');
    },

    updateAuthUI(session) {
        const out = document.getElementById('authLoggedOut');
        const inEl = document.getElementById('authLoggedIn');
        const avatar = document.getElementById('authAvatar');
        const name = document.getElementById('authName');
        const profileEmail = document.getElementById('authProfileEmail');
        const block = document.getElementById('authBlock');
        if (!block) return;
        if (session) {
            if (out) out.style.display = 'none';
            if (inEl) inEl.style.display = 'flex';
            const user = session.user;
            const email = user?.email || '';
            const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name;
            const shortName = displayName || (email ? email.split('@')[0] : 'Пользователь');
            if (avatar) {
                const url = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
                if (url) {
                    avatar.style.backgroundImage = `url(${url})`;
                    avatar.style.backgroundSize = 'cover';
                    avatar.textContent = '';
                } else {
                    avatar.style.backgroundImage = '';
                    avatar.textContent = shortName.charAt(0).toUpperCase();
                }
            }
            if (name) name.textContent = shortName;
            if (profileEmail) profileEmail.textContent = email || 'Вход выполнен';
        } else {
            if (out) out.style.display = 'flex';
            if (inEl) inEl.style.display = 'none';
        }
    },

    setupSidebarToggle() {
        const tab = document.getElementById('sidebarTab');
        const sidebar = document.getElementById('sidebar');
        if (!tab || !sidebar) return;

        tab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            sidebar.classList.toggle('collapsed');
            const icon = tab.querySelector('i');
            icon.className = sidebar.classList.contains('collapsed') ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
        });
    },

    moveViewHeaderToCover() {
        // Заголовок блока (название + subtitle) остаётся под обложкой в контенте страницы
    },

    setupModals() {
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    modal.classList.remove('active');
                });
            }

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    },


    renderTodayView() {
        const container = document.getElementById('todayTasks');
        if (!container) return;
        const tasks = Storage.getTasks();
        const today = new Date().toDateString();
        
        const todayTasks = Object.values(tasks).filter(task => {
            if (task.archived) return false;
            if (task.status === CONFIG.TASK_STATUSES.DONE) return false;
            if (!task.dueDate) return false;
            return new Date(task.dueDate).toDateString() === today;
        });

        if (todayTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-day"></i>
                    <h3>Нет задач на сегодня</h3>
                    <p>Добавьте задачи с датой выполнения сегодня</p>
                </div>
            `;
            return;
        }

        container.innerHTML = todayTasks.map(task => this.createTaskItem(task)).join('');
    },

    renderAllTasksView() {
        const container = document.getElementById('allTasksList');
        if (!container) return;
        const tasks = Storage.getTasks();
        const areas = Storage.getAreas();
        const allTasks = Object.values(tasks).filter(t => !t.archived);

        const getContextTag = (task) => {
            if (task.contextType === 'area' && task.contextId && areas[task.contextId]) {
                return areas[task.contextId].name;
            }
            return 'Inbox';
        };

        if (allTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>Нет задач</h3>
                    <p>Добавьте задачи в Inbox или области</p>
                </div>
            `;
            return;
        }

        container.innerHTML = allTasks.map(task => this.createAllTaskItem(task, getContextTag(task))).join('');
    },

    renderTagsView(tagId) {
        const container = document.getElementById('tagsList');
        if (!container) return;
        const tasks = Storage.getTasks();
        const areas = Storage.getAreas();
        const allTasks = Object.values(tasks).filter(t => !t.archived);

        const tagDecoded = tagId ? decodeURIComponent(tagId) : null;

        const taskHasTag = (task, tag) => {
            if (task.contextType === 'area' && task.contextId && areas[task.contextId] && areas[task.contextId].name === tag) return true;
            return (task.tags || []).includes(tag);
        };

        const tagCounts = {};
        allTasks.forEach(t => {
            if (t.contextType === 'area' && t.contextId && areas[t.contextId]) {
                const tag = areas[t.contextId].name;
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
            (t.tags || []).forEach(tg => { tagCounts[tg] = (tagCounts[tg] || 0) + 1; });
        });
        const uniqueTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);

        const filteredTasks = tagDecoded ? allTasks.filter(t => taskHasTag(t, tagDecoded)) : [];

        if (tagDecoded) {
            const header = container.closest('.view-panel')?.querySelector('.view-header h1');
            if (header) header.innerHTML = `<i class="fas fa-tag" style="color: ${Storage.getTagColor(tagDecoded)}"></i> #${this.escapeHtml(tagDecoded)}`;
        }

        if (!tagDecoded) {
            if (uniqueTags.length === 0) {
                container.innerHTML = `<div class="empty-state"><i class="fas fa-tags"></i><h3>Нет тегов</h3><p>Добавьте теги к задачам</p></div>`;
            } else {
                container.innerHTML = `<div class="tags-grid" id="tagsGrid">${uniqueTags.map(tag => {
                    const color = Storage.getTagColor(tag);
                    const count = tagCounts[tag];
                    return `<a href="#tags/${encodeURIComponent(tag)}" class="tag-card" style="--tag-color: ${color}; background: ${color}22; border-left: 4px solid ${color}">
                        <span class="tag-card-name">${this.escapeHtml(tag)}</span>
                        <span class="tag-card-count">${count} задач</span>
                    </a>`;
                }).join('')}</div>`;
            }
        } else if (filteredTasks.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-tag"></i><h3>Нет задач</h3><p>С тегом «${this.escapeHtml(tagDecoded)}»</p></div>`;
        } else {
            const getContextTag = (task) => {
                if (task.contextType === 'area' && task.contextId && areas[task.contextId]) return areas[task.contextId].name;
                return 'Inbox';
            };
            container.innerHTML = filteredTasks.map(task => this.createAllTaskItem(task, getContextTag(task))).join('');
        }
        if (typeof GTD !== 'undefined' && GTD.renderTagsNav) GTD.renderTagsNav();

        document.getElementById('tagsSettingsBtn')?.addEventListener('click', () => this.showTagsSettingsModal());
    },

    showTagsSettingsModal() {
        const modal = document.getElementById('tagsSettingsModal');
        const list = document.getElementById('tagsSettingsList');
        if (!modal || !list) return;
        const tasks = Storage.getTasks();
        const areas = Storage.getAreas();
        const tagSet = new Set();
        Object.values(tasks).forEach(t => {
            if (t.contextType === 'area' && t.contextId && areas[t.contextId]) tagSet.add(areas[t.contextId].name);
            (t.tags || []).forEach(tg => tagSet.add(tg));
        });
        const tags = Array.from(tagSet).sort();
        const palette = CONFIG.TAG_COLOR_PALETTE || ['#00F5FF', '#FF3D7F', '#FFE135', '#00FF88', '#A855F7', '#00B8FF'];
        list.innerHTML = tags.map(tag => {
            const color = Storage.getTagColor(tag);
            return `<div class="tags-settings-row">
                <span class="tags-settings-tag" style="--tag-color: ${color}">${this.escapeHtml(tag)}</span>
                <div class="tags-settings-colors">${palette.map(c =>
                    `<button type="button" class="tags-color-btn ${c === color ? 'active' : ''}" data-tag="${this.escapeHtml(tag)}" data-color="${c}" style="background: ${c}" title="${c}"></button>`
                ).join('')}</div>
            </div>`;
        }).join('') || '<p class="modal-hint">Нет тегов. Добавьте теги к задачам.</p>';
        list.querySelectorAll('.tags-color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Storage.saveTagColor(btn.dataset.tag, btn.dataset.color);
                if (typeof SupabaseSync !== 'undefined' && SupabaseSync.pushSettings) SupabaseSync.pushSettings();
                this.showTagsSettingsModal();
                if (typeof GTD !== 'undefined' && GTD.renderTagsNav) GTD.renderTagsNav();
                const r = typeof Router !== 'undefined' && Router.getRoute ? Router.getRoute() : {};
                this.renderTagsView(r.id || null);
                this.renderAllTasksView();
            });
        });
        modal.classList.add('active');
    },

    createAllTaskItem(task, contextTag) {
        const priorityColors = {
            high: 'var(--error)',
            medium: 'var(--warning)',
            low: 'var(--info)'
        };

        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const formattedDate = dueDate ? dueDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '';

        const allTags = [contextTag, ...(task.tags || [])].filter(Boolean);
        const tagsHtml = allTags.map(tag => {
            const color = typeof Storage !== 'undefined' && Storage.getTagColor ? Storage.getTagColor(tag) : '#6366f1';
            return `<span class="card-tag" style="--tag-color: ${color}; background: ${color}22; border-left: 2px solid ${color}">${this.escapeHtml(tag)}</span>`;
        }).join('');

        return `
            <div class="task-item" onclick="GTD.showTaskModal('${task.contextId || null}', '${task.contextType || 'inbox'}', '${task.id}')">
                <input type="checkbox" class="task-checkbox" ${task.status === CONFIG.TASK_STATUSES.DONE ? 'checked' : ''}
                       onchange="event.stopPropagation(); App.toggleTask('${task.id}', this.checked)">
                <div class="task-content">
                    <div class="task-title ${task.status === CONFIG.TASK_STATUSES.DONE ? 'completed' : ''}">
                        ${this.escapeHtml(task.title)}
                    </div>
                    ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                    <div class="task-meta">
                        ${tagsHtml ? `<span class="task-tags">${tagsHtml}</span>` : ''}
                        ${task.priority ? `<span class="task-priority" style="color: ${priorityColors[task.priority]}">
                            <i class="fas fa-flag"></i> ${task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                        </span>` : ''}
                        ${formattedDate ? `<span class="task-date"><i class="fas fa-calendar"></i> ${formattedDate}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    createTaskItem(task) {
        const priorityColors = {
            high: 'var(--error)',
            medium: 'var(--warning)',
            low: 'var(--info)'
        };

        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const formattedDate = dueDate ? dueDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '';

        return `
            <div class="task-item" onclick="GTD.showTaskModal('${task.contextId || null}', '${task.contextType || 'inbox'}', '${task.id}')">
                <input type="checkbox" class="task-checkbox" ${task.status === CONFIG.TASK_STATUSES.DONE ? 'checked' : ''}
                       onchange="event.stopPropagation(); App.toggleTask('${task.id}', this.checked)">
                <div class="task-content">
                    <div class="task-title ${task.status === CONFIG.TASK_STATUSES.DONE ? 'completed' : ''}">
                        ${this.escapeHtml(task.title)}
                    </div>
                    ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                    <div class="task-meta">
                        ${task.priority ? `<span class="task-priority" style="color: ${priorityColors[task.priority]}">
                            <i class="fas fa-flag"></i> ${task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                        </span>` : ''}
                        ${formattedDate ? `<span class="task-date"><i class="fas fa-calendar"></i> ${formattedDate}</span>` : ''}
                        ${task.tags && task.tags.length > 0 ? task.tags.map(tag => 
                            `<span class="card-tag">${this.escapeHtml(tag)}</span>`
                        ).join('') : ''}
                    </div>
                </div>
            </div>
        `;
    },

    toggleTask(taskId, completed) {
        const task = Storage.getTask(taskId);
        if (task) {
            if (completed) {
                task.status = CONFIG.TASK_STATUSES.DONE;
                task.archived = true;
                task.archivedAt = new Date().toISOString();
            } else {
                task.status = CONFIG.TASK_STATUSES.NEW;
                task.archived = false;
                delete task.archivedAt;
            }
            Storage.saveTask(taskId, task);
            Kanban.renderKanban('inboxKanban', null, 'inbox');
            if (typeof GTD !== 'undefined' && GTD.currentAreaId) {
                Kanban.renderKanban('areaKanban', GTD.currentAreaId, 'area');
            }
            this.renderTodayView();
            this.renderAllTasksView();
            const r = typeof Router !== 'undefined' && Router.getRoute ? Router.getRoute() : {};
            if (r.page === 'tags') this.renderTagsView(r.id);
            if (r.page === 'task-archive' && this.renderTaskArchiveView) this.renderTaskArchiveView();
            Calendar.render();
            if (typeof Gantt !== 'undefined' && Gantt.renderGantt) Gantt.renderGantt();
            GTD.updateBadges();
            if (GTD.renderAreas) GTD.renderAreas();
            if (GTD.renderTagsNav) GTD.renderTagsNav();
        }
    },

    renderTaskArchiveView() {
        const container = document.getElementById('taskArchiveList');
        if (!container) return;
        const tasks = Storage.getTasks();
        const areas = Storage.getAreas();
        const archived = Object.values(tasks)
            .filter(t => t.archived)
            .sort((a, b) => (b.archivedAt || b.updatedAt || '').localeCompare(a.archivedAt || a.updatedAt || ''));

        const getContextTag = (task) => {
            if (task.contextType === 'area' && task.contextId && areas[task.contextId]) {
                return areas[task.contextId].name;
            }
            return 'Inbox';
        };

        if (archived.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-archive"></i>
                    <h3>Архив пуст</h3>
                    <p>Выполненные задачи с доски появятся здесь</p>
                </div>
            `;
            return;
        }

        container.innerHTML = archived.map(task => {
            const ctx = getContextTag(task);
            const when = task.archivedAt
                ? new Date(task.archivedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '';
            return `
            <div class="task-item task-item-archived">
                <span class="task-archive-check" title="Выполнено"><i class="fas fa-check"></i></span>
                <div class="task-content" onclick="GTD.showTaskModal('${task.contextId || null}', '${task.contextType || 'inbox'}', '${task.id}')">
                    <div class="task-title completed">${this.escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                    <div class="task-meta">
                        <span class="card-tag">${this.escapeHtml(ctx)}</span>
                        ${when ? `<span class="task-date"><i class="fas fa-clock"></i> ${this.escapeHtml(when)}</span>` : ''}
                    </div>
                </div>
                <button type="button" class="btn-icon task-archive-delete" onclick="event.stopPropagation(); App.deleteArchivedTask('${task.id}')" title="Удалить навсегда">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>`;
        }).join('');
    },

    deleteArchivedTask(taskId) {
        const task = Storage.getTask(taskId);
        if (!task || !task.archived) return;
        this.confirmDelete('Удалить задачу из архива безвозвратно?', () => {
            Storage.deleteTask(taskId);
            this.renderTaskArchiveView();
            Kanban.renderKanban('inboxKanban', null, 'inbox');
            if (typeof GTD !== 'undefined' && GTD.currentAreaId) {
                Kanban.renderKanban('areaKanban', GTD.currentAreaId, 'area');
            }
            this.renderTodayView();
            this.renderAllTasksView();
            const r = typeof Router !== 'undefined' && Router.getRoute ? Router.getRoute() : {};
            if (r.page === 'tags') this.renderTagsView(r.id);
            Calendar.render();
            if (typeof Gantt !== 'undefined' && Gantt.renderGantt) Gantt.renderGantt();
            GTD.updateBadges();
            if (GTD.renderAreas) GTD.renderAreas();
            if (GTD.renderTagsNav) GTD.renderTagsNav();
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
