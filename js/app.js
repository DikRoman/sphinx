// Main Application
const App = {
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

        // Supabase Auth + Sync
        this.setupSupabase();

        this.setupAppSettings();

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
        const DEFAULT_COVER = 135;

        const cover = document.getElementById('appCover');
        const coverResizeHandle = document.getElementById('coverResizeHandle');
        const musicTab = document.getElementById('musicCollapseTab');
        const musicPlayer = document.getElementById('rightPanelPlayer');

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

    setupSupabase() {
        const block = document.getElementById('authBlock');
        if (block) block.setAttribute('data-configured', SupabaseAuth?.isConfigured() ? '1' : '0');
        if (typeof SupabaseAuth === 'undefined' || !SupabaseAuth.isConfigured()) return;
        SupabaseAuth.init(async (session) => {
            this.updateAuthUI(session);
            if (session) {
                SupabaseSync.init();
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
    },

    updateAuthUI(session) {
        const out = document.getElementById('authLoggedOut');
        const inEl = document.getElementById('authLoggedIn');
        const email = document.getElementById('authEmail');
        const block = document.getElementById('authBlock');
        if (!block) return;
        if (session) {
            if (out) out.style.display = 'none';
            if (inEl) inEl.style.display = 'flex';
            if (email) email.textContent = session.user?.email || 'Вход выполнен';
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
            task.status = completed ? CONFIG.TASK_STATUSES.DONE : CONFIG.TASK_STATUSES.NEW;
            Storage.saveTask(taskId, task);
            Kanban.renderKanban('inboxKanban', null, 'inbox');
            this.renderTodayView();
            Calendar.render();
            GTD.updateBadges();
        }
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
