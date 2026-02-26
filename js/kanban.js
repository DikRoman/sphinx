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
            if (e.dataTransfer.getData('application/x-inbox-column')) return;
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

    getColumnsForBoard(boardId, contextType) {
        if (boardId === 'inboxKanban' && contextType === 'inbox') {
            return Storage.getInboxColumns();
        }
        return CONFIG.DEFAULT_INBOX_COLUMNS.map((c, i) => ({ ...c, order: i }));
    },

    buildBoardColumns(board, contextType) {
        const boardId = board.id;
        const isInbox = boardId === 'inboxKanban' && contextType === 'inbox';
        const columns = this.getColumnsForBoard(boardId, contextType);
        board.innerHTML = columns.map(col => {
            let style = '';
            if (col.imageUrl) {
                const url = this.escapeHtml(col.imageUrl).replace(/"/g, '&quot;');
                style = ` style="background-image: url(\"${url}\"); background-size: cover; background-position: center; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.7);"`;
            } else if (col.color) {
                style = ` style="background: ${col.color}33; color: ${col.color};"`;
            }
            const grip = isInbox ? `<span class="column-drag-handle" draggable="true" title="Перетащить колонку"><i class="fas fa-grip-vertical"></i></span>` : '';
            const clickHint = isInbox ? ' title="Нажмите, чтобы изменить дизайн шапки"' : '';
            const addBtn = isInbox ? `
                <div class="kanban-column-add-row">
                    <button type="button" class="kanban-column-add-btn" data-status="${this.escapeHtml(col.id)}" title="Добавить задачу в эту колонку">
                        <i class="fas fa-plus"></i> Новая задача
                    </button>
                </div>
            ` : '';
            return `
                <div class="kanban-column ${isInbox ? 'inbox-column-draggable' : ''}" data-column-id="${this.escapeHtml(col.id)}">
                    <div class="kanban-header kanban-header-custom kanban-header-editable"${style}${clickHint}>
                        ${grip}
                        <h3>${this.escapeHtml(col.name || col.id)}</h3>
                        <span class="column-count">0</span>
                    </div>
                    ${addBtn}
                    <div class="kanban-content" data-status="${this.escapeHtml(col.id)}"></div>
                </div>
            `;
        }).join('');
        if (isInbox) this.setupInboxColumnDragAndEdit(board);
    },

    draggedColumnId: null,

    setupInboxColumnDragAndEdit(board) {
        if (!board || board.id !== 'inboxKanban') return;

        board.querySelectorAll('.column-drag-handle').forEach(handle => {
            handle.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                const col = e.target.closest('.kanban-column');
                if (col) {
                    this.draggedColumnId = col.dataset.columnId;
                    e.dataTransfer.setData('application/x-inbox-column', this.draggedColumnId);
                    e.dataTransfer.effectAllowed = 'move';
                    col.classList.add('column-dragging');
                }
            });
            handle.addEventListener('dragend', (e) => {
                board.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('column-drag-over'));
                this.draggedColumnId = null;
                const col = e.target.closest('.kanban-column');
                if (col) col.classList.remove('column-dragging');
            });
        });

        board.querySelectorAll('.kanban-column').forEach(columnEl => {
            columnEl.addEventListener('dragover', (e) => {
                if (!this.draggedColumnId || this.draggedColumnId === columnEl.dataset.columnId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                columnEl.classList.add('column-drag-over');
            });
            columnEl.addEventListener('dragleave', (e) => {
                if (!columnEl.contains(e.relatedTarget)) columnEl.classList.remove('column-drag-over');
            });
            columnEl.addEventListener('drop', (e) => {
                e.preventDefault();
                columnEl.classList.remove('column-drag-over');
                const movedId = e.dataTransfer.getData('application/x-inbox-column');
                if (!movedId || movedId === columnEl.dataset.columnId) return;
                const columns = Storage.getInboxColumns();
                const fromIdx = columns.findIndex(c => c.id === movedId);
                const toIdx = columns.findIndex(c => c.id === columnEl.dataset.columnId);
                if (fromIdx < 0 || toIdx < 0) return;
                const [removed] = columns.splice(fromIdx, 1);
                columns.splice(toIdx, 0, removed);
                Storage.saveInboxColumns(columns);
                this.renderKanban('inboxKanban', null, 'inbox');
                this.draggedColumnId = null;
            });
        });

        board.querySelectorAll('.kanban-header-editable').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('.column-drag-handle')) return;
                const col = header.closest('.kanban-column');
                if (col) this.showHeaderDesignEditor(col);
            });
        });

        board.querySelectorAll('.kanban-column-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const status = btn.dataset.status;
                if (status && typeof GTD !== 'undefined') GTD.showTaskModal(null, 'inbox', null, { status });
            });
        });
    },

    getOrCreateHeaderEditorPopover() {
        let el = document.getElementById('columnHeaderEditorPopover');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'columnHeaderEditorPopover';
        el.className = 'column-header-editor-popover';
        el.innerHTML = `
            <div class="column-header-editor-inner">
                <div class="column-header-editor-title"><i class="fas fa-palette"></i> Дизайн шапки</div>
                <div class="form-group">
                    <label class="form-label">Название</label>
                    <input type="text" class="form-input" id="headerEditorName" placeholder="Название блока">
                </div>
                <div class="form-group">
                    <label class="form-label">Цвет шапки</label>
                    <input type="color" class="form-input header-editor-color" id="headerEditorColor" title="Цвет">
                </div>
                <div class="form-group">
                    <label class="form-label">Картинка для шапки (URL)</label>
                    <input type="url" class="form-input" id="headerEditorImage" placeholder="https://...">
                </div>
                <div class="form-actions" style="margin-top: 0.75rem; border: none; padding: 0;">
                    <button type="button" class="btn-secondary" id="headerEditorCancel">Отмена</button>
                    <button type="button" class="btn-primary" id="headerEditorSave">Сохранить</button>
                </div>
            </div>
        `;
        document.body.appendChild(el);

        el.querySelector('#headerEditorCancel').addEventListener('click', () => this.hideHeaderDesignEditor());
        el.querySelector('#headerEditorSave').addEventListener('click', () => {
            const columnId = el.dataset.columnId;
            if (!columnId) return;
            const columns = Storage.getInboxColumns();
            const col = columns.find(c => c.id === columnId);
            if (col) {
                col.name = document.getElementById('headerEditorName').value.trim() || col.name;
                col.color = document.getElementById('headerEditorColor').value;
                col.imageUrl = (document.getElementById('headerEditorImage').value || '').trim();
                Storage.saveInboxColumns(columns);
                this.renderKanban('inboxKanban', null, 'inbox');
            }
            this.hideHeaderDesignEditor();
        });
        document.addEventListener('click', (e) => {
            if (!el.classList.contains('active')) return;
            if (el.contains(e.target)) return;
            if (e.target.closest('.kanban-header-editable')) return;
            this.hideHeaderDesignEditor();
        });
        return el;
    },

    showHeaderDesignEditor(columnEl) {
        const columnId = columnEl.dataset.columnId;
        const columns = Storage.getInboxColumns();
        const col = columns.find(c => c.id === columnId);
        if (!col) return;
        const popover = this.getOrCreateHeaderEditorPopover();
        popover.dataset.columnId = columnId;
        document.getElementById('headerEditorName').value = col.name || '';
        document.getElementById('headerEditorColor').value = col.color || '#00F5FF';
        document.getElementById('headerEditorImage').value = col.imageUrl || '';
        const header = columnEl.querySelector('.kanban-header');
        const rect = header.getBoundingClientRect();
        popover.style.left = Math.max(8, rect.left) + 'px';
        popover.style.top = (rect.bottom + 4) + 'px';
        popover.classList.add('active');
    },

    hideHeaderDesignEditor() {
        const el = document.getElementById('columnHeaderEditorPopover');
        if (el) el.classList.remove('active');
    },

    renderKanban(boardId, contextId, contextType) {
        const board = document.getElementById(boardId);
        if (!board) return;

        const columnsConfig = this.getColumnsForBoard(boardId, contextType);
        const existingColumns = board.querySelectorAll('.kanban-content');
        const existingStatuses = Array.from(existingColumns).map(c => c.dataset.status);
        const needRebuild = existingStatuses.length !== columnsConfig.length ||
            columnsConfig.some((c, i) => (existingStatuses[i] || '') !== (c.id || ''));

        if (needRebuild) {
            this.buildBoardColumns(board, contextType);
        }

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
            const colConfig = columnsConfig.find(c => c.id === status);
            const columnColor = colConfig?.color || null;

            const header = column.closest('.kanban-column').querySelector('.column-count');
            if (header) header.textContent = statusTasks.length;

            column.innerHTML = statusTasks.map(task => this.createCard(task, columnColor)).join('');
        });
    },

    getTaskCategoryLabel(task) {
        if (task.contextType === 'area' && task.contextId) {
            const area = Storage.getAreas()[task.contextId];
            return area ? area.name : 'Inbox';
        }
        if (task.contextType === 'project' && task.contextId) {
            const project = Storage.getProjects()[task.contextId];
            return project ? project.name : 'Проект';
        }
        return 'Inbox';
    },

    getTaskCategoryColor(task) {
        if (task.contextType === 'area' && task.contextId) {
            const area = Storage.getAreas()[task.contextId];
            return (area && area.color) || '#00F5FF';
        }
        if (task.contextType === 'project' && task.contextId) {
            const project = Storage.getProjects()[task.contextId];
            return (project && project.color) || '#A855F7';
        }
        const p = { high: '#ef4444', medium: '#f59e0b', low: '#00B8FF' };
        return p[task.priority] || '#00F5FF';
    },

    formatDueText(task) {
        if (!task.dueDate) return '';
        const due = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return '<i class="fas fa-clock"></i> Просрочено';
        if (diffDays === 0) return '<i class="fas fa-clock"></i> Сегодня';
        if (diffDays === 1) return '<i class="fas fa-clock"></i> Завтра';
        if (diffDays <= 7) return `<i class="fas fa-clock"></i> Через ${diffDays} дн.`;
        return `<i class="fas fa-clock"></i> ${this.formatDate(task.dueDate)}`;
    },

    createCard(task, columnColor) {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && task.status !== CONFIG.TASK_STATUSES.DONE;
        const category = this.getTaskCategoryLabel(task);
        const categoryColor = this.getTaskCategoryColor(task);
        const color = columnColor || categoryColor;
        const dueHtml = this.formatDueText(task);
        const desc = task.description ? this.escapeHtml(task.description.substring(0, 100)) + (task.description.length > 100 ? '...' : '') : '';
        const emojiDisplay = task.emoji ? this.escapeHtml(task.emoji) : '<i class="fas fa-smile"></i>';
        return `
            <div class="kanban-card" draggable="true" data-task-id="${task.id}" 
                 onclick="Kanban.openTask('${task.id}')" style="--card-color: ${color}">
                <div class="kanban-card-emoji-wrap" onclick="event.stopPropagation(); Kanban.openEmojiPicker('${task.id}', event)" title="Выбрать эмодзи">
                    <span class="kanban-card-emoji">${emojiDisplay}</span>
                </div>
                <div class="kanban-card-category">
                    <span class="kanban-card-dot"></span>
                    <span>${this.escapeHtml(category.toUpperCase())}</span>
                </div>
                <div class="card-header">
                    <div class="card-title">${this.escapeHtml(task.title)}</div>
                    <div class="card-priority ${task.priority || 'low'}"></div>
                </div>
                ${desc ? `<div class="kanban-card-desc">${desc}</div>` : ''}
                <div class="card-meta">
                    ${task.tags && task.tags.length > 0 ? task.tags.map(tag => 
                        `<span class="card-tag">${this.escapeHtml(tag)}</span>`
                    ).join('') : ''}
                    ${dueHtml ? `<span class="card-due-text ${isOverdue ? 'overdue' : ''}">${dueHtml}</span>` : ''}
                </div>
                <div class="kanban-card-bar"></div>
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

    openEmojiPicker(taskId, event) {
        const task = Storage.getTask(taskId);
        if (!task) return;
        const board = event.target.closest('.kanban-board');
        const boardId = board?.id;
        const contextType = task.contextType || 'inbox';
        const contextId = task.contextId || null;
        if (typeof GTD !== 'undefined') {
            GTD.showEmojiPicker(event.currentTarget, task.emoji || '', (emoji) => {
                task.emoji = emoji;
                Storage.saveTask(taskId, task);
                if (boardId) this.renderKanban(boardId, contextId, contextType);
                if (typeof GTD !== 'undefined') GTD.updateBadges();
            });
        }
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
