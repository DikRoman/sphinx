/**
 * Роутер — навигация и загрузка страниц
 * Hash: #inbox, #today, #calendar, #sticky-notes, #habits, #content, #gantt, #wishboard, #area/ID
 */
const Router = {
    container: null,
    currentPage: null,
    cache: {},

    PAGE_MAP: {
        inbox: { file: 'inbox.html', init: 'inbox' },
        'all-tasks': { file: 'all-tasks.html', init: 'allTasks' },
        today: { file: 'today.html', init: 'today' },
        calendar: { file: 'calendar.html', init: 'calendar' },
        'sticky-notes': { file: 'sticky-notes.html', init: 'stickyNotes' },
        habits: { file: 'habits.html', init: 'habits' },
        content: { file: 'content.html', init: 'content' },
        gantt: { file: 'gantt.html', init: 'gantt' },
        wishboard: { file: 'wishboard.html', init: 'wishboard' },
        area: { file: 'area.html', init: 'area' }
    },

    init(containerId) {
        this.container = document.getElementById(containerId || 'pageContainer');
        if (!this.container) return;

        if (!location.hash) history.replaceState(null, '', (location.pathname || '/') + (location.search || '') + '#inbox');
        window.addEventListener('hashchange', () => this.onHashChange());
        this.onHashChange();
    },

    getRoute() {
        const hash = (location.hash || '#inbox').slice(1);
        const [page, id] = hash.split('/');
        return { page: page || 'inbox', id: id || null };
    },

    async onHashChange() {
        const { page, id } = this.getRoute();
        await this.loadPage(page, id);
    },

    async loadPage(pageName, id) {
        const config = this.PAGE_MAP[pageName];
        if (!config) {
            this.navigate('inbox');
            return;
        }

        this.container.innerHTML = '<div class="page-loading"><i class="fas fa-spinner fa-spin"></i></div>';
        this.currentPage = pageName;

        try {
            const html = this.cache[config.file] || await fetch(`pages/${config.file}`).then(r => r.text());
            this.cache[config.file] = html;
            this.container.innerHTML = html;
        } catch (e) {
            console.error('Router: fetch failed', e);
            this.container.innerHTML = '<div class="page-error"><p>Не удалось загрузить страницу.</p><a href="#inbox">В Inbox</a></div>';
            return;
        }

        this.setActiveNav(pageName, id);
        this.runPageInit(config.init, id);
        if (typeof App !== 'undefined' && App.moveViewHeaderToCover) App.moveViewHeaderToCover();
    },

    setActiveNav(page, id) {
        document.querySelectorAll('.nav-item[data-page]').forEach(el => {
            let active = false;
            if (el.dataset.page === page) {
                if (page === 'area') active = el.dataset.areaId === id;
                else active = true;
            }
            el.classList.toggle('active', active);
        });
    },

    runPageInit(initName, id) {
        const inits = {
            inbox: () => { Kanban.renderKanban('inboxKanban', null, 'inbox'); },
            allTasks: () => { App.renderAllTasksView(); },
            today: () => { App.renderTodayView(); },
            calendar: () => { Calendar.render(); },
            stickyNotes: () => {
                StickyNotes.setupBackground();
                StickyNotes.renderNotes();
                setTimeout(() => StickyNotes.applyZoom(), 10);
                const header = document.getElementById('stickyBlockHeader');
                const collapsed = localStorage.getItem('sticky_header_collapsed') === 'true';
                if (header) {
                    header.classList.toggle('collapsed', collapsed);
                    const icon = document.querySelector('#stickyHeaderTab i');
                    if (icon) icon.className = collapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
                }
            },
            habits: () => { Habits.renderHabits(); },
            content: () => { Content.renderContent(); },
            gantt: () => { Gantt.renderGantt(); },
            wishboard: () => { Wishboard.render(); },
            area: () => { if (id) GTD.openArea(id); }
        };
        const fn = inits[initName];
        if (fn) fn();
    },

    navigate(hash) {
        location.hash = hash;
    }
};
