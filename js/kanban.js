// Kanban Board Management
const Kanban = {
    draggedElement: null,
    draggedData: null,

    init() {
        this.setupDragAndDrop();
        this.renderKanban('inboxKanban', null, 'inbox');
    },

    setupDragAndDrop() {
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('kanban-card')) {
                this.draggedElement = e.target;
                this.draggedData = {
                    taskId: e.target.dataset.taskId,
                    status: e.target.closest('.kanban-column').querySelector('.kanban-content').dataset.status
                };
                e.target.classList.add('dragging');
            }
        });

        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('kanban-card')) {
                e.target.classList.remove('dragging');
                this.draggedElement = null;
                this.draggedData = null;
            }
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            const column = e.target.closest('.kanban-content');
            if (column && this.draggedElement) {
                column.style.backgroundColor = 'var(--bg-hover)';
            }
        });

        document.addEventListener('dragleave', (e) => {
            const column = e.target.closest('.kanban-content');
            if (column) {
                column.style.backgroundColor = '';
            }
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            const column = e.target.closest('.kanban-content');
            if (column && this.draggedElement && this.draggedData) {
                const newStatus = column.dataset.status;
                if (newStatus !== this.draggedData.status) {
                    const task = Storage.getTask(this.draggedData.taskId);
                    if (task) {
                        task.status = newStatus;
                        Storage.saveTask(this.draggedData.taskId, task);
                        this.renderKanban(column.closest('.kanban-board').id, 
                            task.contextId, task.contextType);
                        GTD.updateBadges();
                    }
                }
                column.style.backgroundColor = '';
            }
        });
    },

    renderKanban(boardId, contextId, contextType) {
        const board = document.getElementById(boardId);
        if (!board) return;

        const tasks = Storage.getTasks();
        const filteredTasks = Object.values(tasks).filter(task => {
            if (contextType === 'inbox') {
                return task.contextType === 'inbox';
            } else if (contextType === 'area') {
                return task.contextType === 'area' && task.contextId === contextId;
            } else if (contextType === 'project') {
                return task.contextType === 'project' && task.contextId === contextId;
            }
            return false;
        });

        const columns = board.querySelectorAll('.kanban-content');
        columns.forEach(column => {
            const status = column.dataset.status;
            const statusTasks = filteredTasks.filter(t => t.status === status);
            
            // Update count
            const header = column.closest('.kanban-column').querySelector('.column-count');
            if (header) {
                header.textContent = statusTasks.length;
            }

            // Render cards
            column.innerHTML = statusTasks.map(task => this.createCard(task)).join('');
        });
    },

    createCard(task) {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && task.status !== CONFIG.TASK_STATUSES.DONE;
        
        return `
            <div class="kanban-card" draggable="true" data-task-id="${task.id}" 
                 onclick="Kanban.openTask('${task.id}')">
                <div class="card-header">
                    <div class="card-title">${this.escapeHtml(task.title)}</div>
                    <div class="card-priority ${task.priority || 'low'}"></div>
                </div>
                ${task.description ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">${this.escapeHtml(task.description.substring(0, 100))}${task.description.length > 100 ? '...' : ''}</div>` : ''}
                <div class="card-meta">
                    ${task.tags && task.tags.length > 0 ? task.tags.map(tag => 
                        `<span class="card-tag">${this.escapeHtml(tag)}</span>`
                    ).join('') : ''}
                    ${dueDate ? `<span class="card-due-date ${isOverdue ? 'overdue' : ''}">
                        <i class="fas fa-calendar"></i> ${this.formatDate(dueDate)}
                    </span>` : ''}
                </div>
            </div>
        `;
    },

    openTask(taskId) {
        const task = Storage.getTask(taskId);
        if (!task) return;

        const contextType = task.contextType || 'inbox';
        const contextId = task.contextId || null;
        GTD.showTaskModal(contextId, contextType, taskId);
    },

    formatDate(date) {
        const d = new Date(date);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (d.toDateString() === today.toDateString()) {
            return 'Сегодня';
        } else if (d.toDateString() === tomorrow.toDateString()) {
            return 'Завтра';
        } else {
            return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
