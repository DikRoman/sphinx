// GTD System Management
const GTD = {
    currentAreaId: null,

    /** Распознавание даты и времени из текста (сегодня, @завтра, через 2 недели и т.д.) */
    parseNaturalDate(text) {
        if (!text || typeof text !== 'string') return { date: null, time: null };
        const t = text.toLowerCase().trim();
        const now = new Date();
        let date = null;
        let time = null;

        // Время: 14:00, 9:30
        const timeMatch = t.match(/\b(\d{1,2})[:\s](\d{2})\b/);
        if (timeMatch) {
            const h = parseInt(timeMatch[1], 10);
            const m = parseInt(timeMatch[2], 10);
            if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
                time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            }
        }

        const addDays = (base, n) => {
            const d = new Date(base);
            d.setDate(d.getDate() + n);
            return d.toISOString().split('T')[0];
        };

        // @завтра, @послезавтра, @сегодня, @неделя, @месяц, @14 дней, @2 недели
        const patterns = [
            [/@?сегодня\b/, () => addDays(now, 0)],
            [/@?завтра\b/, () => addDays(now, 1)],
            [/@?послезавтра\b/, () => addDays(now, 2)],
            [/@?через\s*(\d+)\s*дн[ейя]?/i, (m) => addDays(now, parseInt(m[1], 10))],
            [/@?(\d+)\s*дн[ейя]?\b/i, (m) => addDays(now, parseInt(m[1], 10))],
            [/@?через\s*(\d+)\s*недел/i, (m) => addDays(now, parseInt(m[1], 10) * 7)],
            [/@?(\d+)\s*недел/i, (m) => addDays(now, parseInt(m[1], 10) * 7)],
            [/@?через\s*недел[уы]\b|@?через\s*1\s*недел|@?недел[ау]\b|@?неделю\b/, () => addDays(now, 7)],
            [/@?через\s*(\d+)\s*месяц/i, (m) => { const d = new Date(now); d.setMonth(d.getMonth() + parseInt(m[1], 10)); return d.toISOString().split('T')[0]; }],
            [/@?через\s*месяц|@?месяц\b/, () => { const d = new Date(now); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0]; }]
        ];
        for (const [re, fn] of patterns) {
            const match = t.match(re);
            if (match) {
                date = match.length > 1 ? fn(match) : fn();
                break;
            }
        }

        return { date, time };
    },

    init() {
        this.renderAreas();
        this.renderTagsNav();
        this.setupTagsToggle();
        this.updateBadges();
        this.setupEventListeners();
    },

    setupTagsToggle() {
        const section = document.querySelector('.nav-section-tags');
        const list = document.getElementById('tagsListNav');
        const chevronBtn = document.querySelector('.nav-tags-chevron-btn');
        if (!section || !list || !chevronBtn) return;
        const collapsed = localStorage.getItem('sphinx_tags_collapsed');
        const isCollapsed = collapsed === null ? true : collapsed === '1';
        list.classList.toggle('nav-tags-collapsed', isCollapsed);
        section.classList.toggle('expanded', !isCollapsed);
        chevronBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const nowCollapsed = list.classList.toggle('nav-tags-collapsed');
            section.classList.toggle('expanded', !nowCollapsed);
            localStorage.setItem('sphinx_tags_collapsed', nowCollapsed ? '1' : '0');
        });
    },

    setupEventListeners() {
        document.getElementById('addArea').addEventListener('click', () => this.showAreaModal());

        document.addEventListener('click', (e) => {
            if (e.target.closest('#quickAddTask')) { e.preventDefault(); this.showTaskModal(null, 'inbox'); }
            if (e.target.closest('#inboxColumnsSettings') || e.target.closest('#areaColumnsSettings')) { e.preventDefault(); this.showInboxColumnsModal(); }
            if (e.target.closest('#addAreaTask')) { e.preventDefault(); this.showTaskModal(this.currentAreaId, 'area'); }
            if (e.target.closest('#editArea')) { e.preventDefault(); this.showAreaModal(this.currentAreaId); }
            if (e.target.closest('#viewGantt')) { e.preventDefault(); if (typeof Router !== 'undefined') Router.navigate('#gantt'); }
        });
    },

    renderAreas() {
        const areasList = document.getElementById('areasList');
        const areas = Storage.getAreas();
        areasList.innerHTML = '';

        const tasks = Storage.getTasks();
        const taskList = Object.values(tasks);

        const areaColors = ['#00F5FF', '#FF3D7F', '#FFE135', '#00FF88', '#A855F7', '#00B8FF'];
        areasList.className = 'areas-cards';

        Object.values(areas).forEach((area, i) => {
            const color = area.color || areaColors[i % areaColors.length];
            const areaTasks = taskList.filter(t => t.contextType === 'area' && t.contextId === area.id);
            const total = areaTasks.length;
            const card = document.createElement('a');
            card.href = `#area/${area.id}`;
            card.className = 'nav-item nav-area-card';
            card.dataset.page = 'area';
            card.dataset.areaId = area.id;
            card.style.setProperty('--area-color', color);
            card.innerHTML = `
                <div class="nav-area-main">
                    <span class="nav-area-icon"></span>
                    <div class="nav-area-text">
                        <span class="nav-area-card-title">${this.escapeHtml(area.name)}</span>
                        <span class="nav-area-card-meta">${total} задач</span>
                    </div>
                </div>
                <i class="nav-area-card-icon fas fa-external-link-alt"></i>
            `;
            areasList.appendChild(card);
        });
    },

    renderTagsNav() {
        const container = document.getElementById('tagsListNav');
        if (!container) return;
        const tasks = Storage.getTasks();
        const taskList = Object.values(tasks);
        const tagCounts = {};
        const areas = Storage.getAreas();
        taskList.forEach(t => {
            if (t.contextType === 'area' && t.contextId && areas[t.contextId]) {
                const areaTag = areas[t.contextId].name;
                tagCounts[areaTag] = (tagCounts[areaTag] || 0) + 1;
            }
            (t.tags || []).forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
        });
        const tags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
        container.innerHTML = tags.map(tag => {
            const color = Storage.getTagColor(tag);
            const count = tagCounts[tag];
            return `<a href="#tags/${encodeURIComponent(tag)}" class="nav-item nav-tag-card" data-page="tags" data-tag="${this.escapeHtml(tag)}" style="--tag-color: ${color}; background: ${color}22; border-left: 3px solid ${color};">
                <span class="nav-tag-card-title">${this.escapeHtml(tag)}</span>
                <span class="nav-tag-card-meta">${count}</span>
            </a>`;
        }).join('') || '<span class="nav-empty-hint">Нет тегов</span>';
    },

    openArea(areaId) {
        this.currentAreaId = areaId;
        const area = Storage.getAreas()[areaId];
        if (!area) return;

        const titleEl = document.getElementById('areaViewTitle');
        const subtitleEl = document.getElementById('areaViewSubtitle');
        if (titleEl) titleEl.innerHTML = `
            <i class="fas fa-${area.icon || 'folder'}" style="color: ${area.color || '#6366f1'}"></i> ${this.escapeHtml(area.name)}
        `;
        if (subtitleEl) subtitleEl.textContent = area.description || '';

        // Render kanban for area tasks
        Kanban.renderKanban('areaKanban', areaId, 'area');
        if (typeof App !== 'undefined' && App.moveViewHeaderToCover) App.moveViewHeaderToCover();
    },

    showAreaModal(areaId = null) {
        const modal = document.getElementById('areaModal');
        const modalBody = document.getElementById('areaModalBody');
        const area = areaId ? Storage.getAreas()[areaId] : null;

        modalBody.innerHTML = `
            <h2 style="margin-bottom: 1.5rem;">${areaId ? 'Редактировать' : 'Создать'} область</h2>
            <form id="areaForm">
                <div class="form-group">
                    <label class="form-label">Название</label>
                    <input type="text" class="form-input" id="areaName" value="${area?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Описание</label>
                    <textarea class="form-textarea" id="areaDescription">${area?.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Иконка (Font Awesome класс)</label>
                    <input type="text" class="form-input" id="areaIcon" value="${area?.icon || 'folder'}" placeholder="folder, briefcase, heart">
                </div>
                <div class="form-group">
                    <label class="form-label">Цвет</label>
                    <input type="color" class="form-input" id="areaColor" value="${area?.color || '#6366f1'}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="GTD.closeAreaModal()">Отмена</button>
                    <button type="submit" class="btn-primary">Сохранить</button>
                </div>
            </form>
        `;

        document.getElementById('areaForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = areaId || 'area_' + Date.now();
            Storage.saveArea(id, {
                name: document.getElementById('areaName').value,
                description: document.getElementById('areaDescription').value,
                icon: document.getElementById('areaIcon').value || 'folder',
                color: document.getElementById('areaColor').value
            });
            this.renderAreas();
            this.closeAreaModal();
            if (this.currentAreaId === id) {
                this.openArea(id);
            }
        });

        modal.classList.add('active');
    },

    showTaskModal(contextId, contextType, taskId = null, defaults = {}) {
        const modal = document.getElementById('taskModal');
        const modalBody = document.getElementById('taskModalBody');
        const task = taskId ? Storage.getTask(taskId) : null;

        const taskEmoji = (task?.emoji || defaults?.emoji || '').trim();
        modalBody.innerHTML = `
            <h2 style="margin-bottom: 1.5rem;">${taskId ? 'Редактировать' : 'Создать'} задачу</h2>
            <form id="taskForm">
                <div class="form-group form-group-emoji">
                    <label class="form-label">Эмодзи</label>
                    <div class="task-emoji-row">
                        <span class="task-emoji-preview" id="taskEmojiPreview">${this.escapeHtml(taskEmoji) || '—'}</span>
                        <input type="hidden" id="taskEmoji" value="${this.escapeHtml(taskEmoji)}">
                        <button type="button" class="btn-secondary btn-emoji-pick" id="taskEmojiPick" title="Выбрать эмодзи">
                            <i class="fas fa-smile"></i> Выбрать
                        </button>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Название</label>
                    <input type="text" class="form-input" id="taskTitle" value="${task?.title || ''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Описание</label>
                    <textarea class="form-textarea" id="taskDescription">${task?.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Приоритет</label>
                    <select class="select-input" id="taskPriority">
                        <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>Низкий</option>
                        <option value="medium" ${task?.priority === 'medium' ? 'selected' : ''}>Средний</option>
                        <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>Высокий</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Дата выполнения</label>
                    <input type="date" class="form-input" id="taskDueDate" value="${task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Время начала</label>
                    <input type="time" class="form-input" id="taskStartTime" value="${task?.startTime || defaults.startTime || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Длительность (часы)</label>
                    <input type="number" class="form-input" id="taskDuration" value="${task?.duration || defaults.duration || 1}" min="0.5" max="24" step="0.5">
                </div>
                <div class="form-group">
                    <label class="form-label">Теги (через запятую)</label>
                    <input type="text" class="form-input" id="taskTags" value="${task?.tags?.join(', ') || ''}">
                </div>
                <div class="form-actions form-actions-task">
                    ${taskId ? `<button type="button" class="btn-danger" id="taskDeleteBtn"><i class="fas fa-trash"></i> Удалить</button>` : ''}
                    <button type="button" class="btn-secondary" onclick="GTD.closeTaskModal()">Отмена</button>
                    <button type="submit" class="btn-primary">Сохранить</button>
                </div>
            </form>
        `;

        document.getElementById('taskEmojiPick')?.addEventListener('click', (e) => {
            e.preventDefault();
            const input = document.getElementById('taskEmoji');
            const preview = document.getElementById('taskEmojiPreview');
            this.showEmojiPicker(e.currentTarget, input?.value || '', (emoji) => {
                if (input) input.value = emoji;
                if (preview) preview.textContent = emoji || '—';
            });
        });

        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = taskId || 'task_' + Date.now();
            const title = document.getElementById('taskTitle').value;
            const description = document.getElementById('taskDescription').value;
            const tags = document.getElementById('taskTags').value
                .split(',')
                .map(t => t.trim())
                .filter(t => t);

            let dueDate = document.getElementById('taskDueDate').value;
            let startTime = document.getElementById('taskStartTime').value;
            const parsed = this.parseNaturalDate(title + ' ' + description);
            if (parsed.date) dueDate = dueDate || parsed.date;
            if (parsed.time) startTime = startTime || parsed.time;
            const duration = parseFloat(document.getElementById('taskDuration').value) || 1;

            const emoji = (document.getElementById('taskEmoji')?.value || '').trim();
            Storage.saveTask(id, {
                title,
                description,
                priority: document.getElementById('taskPriority').value,
                dueDate: dueDate || null,
                startTime: startTime || null,
                duration: duration,
                tags: tags,
                emoji: emoji || undefined,
                status: task?.status || (contextType === 'inbox' ? (defaults?.status || Storage.getInboxColumns()[0]?.id || CONFIG.TASK_STATUSES.NEW) : CONFIG.TASK_STATUSES.NEW),
                contextId: contextId || task?.contextId,
                contextType: contextType || task?.contextType || 'inbox'
            });

            // Refresh views
            Kanban.renderKanban('inboxKanban', null, 'inbox');
            if (this.currentAreaId) {
                Kanban.renderKanban('areaKanban', this.currentAreaId, 'area');
            }
            if (typeof Calendar !== 'undefined') {
                Calendar.render();
            }
            if (typeof App !== 'undefined') {
                App.renderTodayView();
                App.renderAllTasksView();
                if (Router?.currentPage === 'tags' && App.renderTagsView) {
                    const tagId = (location.hash || '').split('/')[1] || null;
                    App.renderTagsView(tagId);
                }
            }
            this.renderTagsNav();
            this.updateBadges();
            this.closeTaskModal();
        });

        const deleteBtn = document.getElementById('taskDeleteBtn');
        if (deleteBtn && taskId) {
            deleteBtn.addEventListener('click', () => {
                if (typeof App !== 'undefined' && App.confirmDelete) {
                    App.confirmDelete('Удалить задачу?', () => {
                        Storage.deleteTask(taskId);
                        Kanban.renderKanban('inboxKanban', null, 'inbox');
                        if (this.currentAreaId) Kanban.renderKanban('areaKanban', this.currentAreaId, 'area');
                        if (typeof Calendar !== 'undefined') Calendar.render();
                        if (typeof App !== 'undefined') {
                            App.renderTodayView();
                            App.renderAllTasksView();
                        }
                        this.updateBadges();
                        this.closeTaskModal();
                    });
                } else if (confirm('Удалить задачу?')) {
                    Storage.deleteTask(taskId);
                    Kanban.renderKanban('inboxKanban', null, 'inbox');
                    if (this.currentAreaId) Kanban.renderKanban('areaKanban', this.currentAreaId, 'area');
                    if (typeof Calendar !== 'undefined') Calendar.render();
                    if (typeof App !== 'undefined') {
                        App.renderTodayView();
                        App.renderAllTasksView();
                    }
                    this.updateBadges();
                    this.closeTaskModal();
                }
            });
        }

        modal.classList.add('active');
    },

    closeAreaModal() {
        document.getElementById('areaModal').classList.remove('active');
    },

    closeTaskModal() {
        document.getElementById('taskModal').classList.remove('active');
    },

    getOrCreateEmojiPicker() {
        let el = document.getElementById('emojiPickerPopover');
        if (el) return el;
        const regular = CONFIG.TASK_EMOJI || [];
        const kaomoji = CONFIG.TASK_EMOJI_KAOMOJI || [];
        el = document.createElement('div');
        el.id = 'emojiPickerPopover';
        el.className = 'emoji-picker-popover';
        el.innerHTML = `
            <div class="emoji-picker-inner">
                <div class="emoji-picker-tabs">
                    <button type="button" class="emoji-picker-tab active" data-tab="regular">Обычные</button>
                    <button type="button" class="emoji-picker-tab" data-tab="anime">Аниме</button>
                </div>
                <div class="emoji-picker-panel active" data-panel="regular">
                    <div class="emoji-picker-grid">${regular.map(e => `<button type="button" class="emoji-picker-item" data-emoji="${this.escapeHtml(e)}">${e}</button>`).join('')}</div>
                </div>
                <div class="emoji-picker-panel" data-panel="anime">
                    <div class="emoji-picker-grid emoji-picker-grid-kaomoji">${kaomoji.map(e => `<button type="button" class="emoji-picker-item" data-emoji="${this.escapeHtml(e)}">${this.escapeHtml(e)}</button>`).join('')}</div>
                </div>
            </div>
        `;
        document.body.appendChild(el);
        el.querySelectorAll('.emoji-picker-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.stopPropagation();
                el.querySelectorAll('.emoji-picker-tab').forEach(t => t.classList.remove('active'));
                el.querySelectorAll('.emoji-picker-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                el.querySelector(`.emoji-picker-panel[data-panel="${tab.dataset.tab}"]`)?.classList.add('active');
            });
        });
        return el;
    },

    showEmojiPicker(anchorEl, currentEmoji, onSelect) {
        const picker = this.getOrCreateEmojiPicker();
        const rect = anchorEl?.getBoundingClientRect();
        if (rect) {
            picker.style.left = Math.max(8, rect.left) + 'px';
            picker.style.top = (rect.bottom + 4) + 'px';
        }
        const closeHandler = (e) => {
            if (!picker.contains(e.target) && e.target !== anchorEl && !anchorEl?.contains(e.target)) {
                picker.classList.remove('active');
                document.removeEventListener('click', closeHandler);
            }
        };
        picker.onclick = (e) => {
            const item = e.target.closest('.emoji-picker-item');
            if (item) {
                const emoji = (item.dataset.emoji != null ? item.dataset.emoji : item.textContent || '').trim();
                if (typeof onSelect === 'function') onSelect(emoji);
                picker.classList.remove('active');
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
        picker.classList.add('active');
    },

    showInboxColumnsModal() {
        const modal = document.getElementById('inboxColumnsModal');
        const body = document.getElementById('inboxColumnsModalBody');
        let columns = Storage.getInboxColumns().map(c => ({ ...c }));

        const renderList = () => {
            body.innerHTML = `
                <h2 style="margin-bottom: 1rem;">Колонки Inbox</h2>
                <p class="modal-hint" style="margin-bottom: 1rem;">Добавляйте блоки, меняйте порядок, задавайте цвет или картинку для шапки.</p>
                <div class="inbox-columns-list" id="inboxColumnsList"></div>
                <div class="form-actions" style="margin-top: 1rem;">
                    <button type="button" class="btn-secondary" id="inboxColumnAdd">
                        <i class="fas fa-plus"></i> Добавить колонку
                    </button>
                    <button type="button" class="btn-primary" id="inboxColumnsSave">Сохранить</button>
                </div>
            `;

            const listEl = document.getElementById('inboxColumnsList');
            columns.forEach((col, index) => {
                const row = document.createElement('div');
                row.className = 'inbox-column-row';
                row.dataset.index = index;
                const colEmoji = (col.emoji != null ? col.emoji : '').toString().trim();
                row.innerHTML = `
                    <div class="inbox-column-order">
                        <button type="button" class="btn-icon" title="Вверх" ${index === 0 ? 'disabled' : ''} data-move="up"><i class="fas fa-chevron-up"></i></button>
                        <button type="button" class="btn-icon" title="Вниз" ${index === columns.length - 1 ? 'disabled' : ''} data-move="down"><i class="fas fa-chevron-down"></i></button>
                    </div>
                    <input type="text" class="form-input inbox-col-name" placeholder="Название" value="${this.escapeHtml(col.name || '')}" data-field="name">
                    <input type="color" class="inbox-col-color" value="${col.color || '#00F5FF'}" title="Цвет шапки" data-field="color">
                    <span class="inbox-col-emoji-preview">${this.escapeHtml(colEmoji) || '—'}</span>
                    <input type="hidden" class="inbox-col-emoji" value="${this.escapeHtml(colEmoji)}">
                    <button type="button" class="btn-icon inbox-col-emoji-pick" title="Эмодзи шапки"><i class="fas fa-smile"></i></button>
                    <button type="button" class="btn-icon btn-icon-danger" title="Удалить" data-remove><i class="fas fa-trash"></i></button>
                `;
                listEl.appendChild(row);
                const emojiInput = row.querySelector('.inbox-col-emoji');
                const emojiPreview = row.querySelector('.inbox-col-emoji-preview');
                row.querySelector('.inbox-col-emoji-pick').addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showEmojiPicker(e.currentTarget, emojiInput?.value || '', (emoji) => {
                        if (emojiInput) emojiInput.value = emoji;
                        if (emojiPreview) emojiPreview.textContent = emoji || '—';
                    });
                });
            });

            listEl.addEventListener('click', (e) => {
                const row = e.target.closest('.inbox-column-row');
                if (!row) return;
                const i = parseInt(row.dataset.index, 10);
                if (e.target.closest('[data-move="up"]')) {
                    if (i > 0) { [columns[i], columns[i - 1]] = [columns[i - 1], columns[i]]; renderList(); }
                } else if (e.target.closest('[data-move="down"]')) {
                    if (i < columns.length - 1) { [columns[i], columns[i + 1]] = [columns[i + 1], columns[i]]; renderList(); }
                } else if (e.target.closest('[data-remove]')) {
                    if (columns.length <= 1) return;
                    columns.splice(i, 1);
                    renderList();
                }
            });

            document.getElementById('inboxColumnAdd').addEventListener('click', () => {
                columns.push({ id: 'inbox_col_' + Date.now(), name: 'Новый блок', color: '#A855F7', emoji: '', order: columns.length });
                renderList();
            });

            document.getElementById('inboxColumnsSave').addEventListener('click', () => {
                const rows = body.querySelectorAll('.inbox-column-row');
                const next = [];
                rows.forEach((row, idx) => {
                    const col = columns[idx];
                    if (!col) return;
                    col.name = row.querySelector('.inbox-col-name').value.trim() || col.id;
                    col.color = row.querySelector('.inbox-col-color').value;
                    col.emoji = (row.querySelector('.inbox-col-emoji')?.value || '').trim();
                    if (col.imageUrl !== undefined) delete col.imageUrl;
                    col.order = idx;
                    next.push(col);
                });
                const validIds = next.map(c => c.id);
                const tasks = Storage.getTasks();
                const firstId = next[0] ? next[0].id : CONFIG.TASK_STATUSES.NEW;
                Object.keys(tasks).forEach(taskId => {
                    const t = tasks[taskId];
                    if (validIds.indexOf(t.status) < 0) {
                        t.status = firstId;
                        Storage.saveTask(taskId, t);
                    }
                });
                Storage.saveInboxColumns(next);
                modal.classList.remove('active');
                Kanban.renderKanban('inboxKanban', null, 'inbox');
                if (this.currentAreaId) Kanban.renderKanban('areaKanban', this.currentAreaId, 'area');
            });
        };

        renderList();
        modal.classList.add('active');
    },

    updateBadges() {
        const tasks = Storage.getTasks();
        const today = new Date().toDateString();
        const inboxCount = Object.values(tasks).filter(t => 
            t.contextType === 'inbox' && t.status !== CONFIG.TASK_STATUSES.DONE
        ).length;
        const todayCount = Object.values(tasks).filter(t => {
            if (t.status === CONFIG.TASK_STATUSES.DONE) return false;
            if (!t.dueDate) return false;
            return new Date(t.dueDate).toDateString() === today;
        }).length;

        document.getElementById('inboxBadge').textContent = inboxCount;
        document.getElementById('todayBadge').textContent = todayCount;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
