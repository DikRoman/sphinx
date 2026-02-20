// Main Application
const App = {
    init() {
        // Initialize modules
        GTD.init();
        Kanban.init();
        Habits.init();
        Content.init();
        Calendar.init();
        Notes.init();
        StickyNotes.init();
        Wishboard.init();
        RightPanel.init();
        Gantt.init();
        if (typeof Cover !== 'undefined') Cover.init();

        // Router — hash-based navigation and page loading
        Router.init('pageContainer');

        // Setup sidebar toggle
        this.setupSidebarToggle();

        // Setup modals
        this.setupModals();

        // Initial page load via Router (hashchange triggers on load)
        this.moveViewHeaderToCover();

        console.log('SPHINX GTD initialized');
    },

    setupSidebarToggle() {
        const toggleBtn = document.getElementById('toggleSidebar');
        const sidebar = document.querySelector('.sidebar');

        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            const icon = toggleBtn.querySelector('i');
            if (sidebar.classList.contains('collapsed')) {
                icon.className = 'fas fa-chevron-right';
            } else {
                icon.className = 'fas fa-chevron-left';
            }
        });
    },

    moveViewHeaderToCover() {
        const coverCenter = document.getElementById('coverCenter');
        const pageContainer = document.getElementById('pageContainer');
        if (!coverCenter || !pageContainer) return;
        const viewHeader = pageContainer.querySelector('.view-header');
        if (viewHeader) {
            coverCenter.innerHTML = '';
            coverCenter.appendChild(viewHeader);
        }
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
