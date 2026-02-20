// Calendar Management
const Calendar = {
    currentView: CONFIG.CALENDAR_VIEWS.WEEK,
    currentDate: new Date(),
    zoomLevel: 1.0, // Уровень масштабирования (1.0 = 100%)

    init() {
        // Загрузить сохраненный уровень масштаба
        const savedZoom = localStorage.getItem('calendar_zoom_level');
        if (savedZoom) {
            this.zoomLevel = parseFloat(savedZoom);
        }
        this.setupEventListeners();
        this.updateZoomIndicator();
        this.render();
    },

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const t = e.target.closest ? e.target.closest('[id]') : null;
            if (!t || !t.id) return;
            if (t.id === 'calendarViewDay') { e.preventDefault(); this.setView(CONFIG.CALENDAR_VIEWS.DAY); }
            if (t.id === 'calendarViewWeek') { e.preventDefault(); this.setView(CONFIG.CALENDAR_VIEWS.WEEK); }
            if (t.id === 'calendarViewMonth') { e.preventDefault(); this.setView(CONFIG.CALENDAR_VIEWS.MONTH); }
            if (t.id === 'calendarPrev') { e.preventDefault(); this.navigate(-1); }
            if (t.id === 'calendarNext') { e.preventDefault(); this.navigate(1); }
            if (t.id === 'calendarToday') { e.preventDefault(); this.currentDate = new Date(); this.render(); }
            if (t.id === 'calendarZoomIn') { e.preventDefault(); this.zoomIn(); }
            if (t.id === 'calendarZoomOut') { e.preventDefault(); this.zoomOut(); }
            if (t.id === 'calendarZoomReset') { e.preventDefault(); this.zoomReset(); }
        });

        document.addEventListener('wheel', (e) => {
            const container = document.getElementById('calendarContainer');
            if (!container || !container.contains(e.target)) return;
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (e.deltaY < 0) this.zoomIn();
                else this.zoomOut();
            }
        }, { passive: false });

        document.addEventListener('keydown', (e) => {
            if (typeof Router === 'undefined' || Router.currentPage !== 'calendar') return;

            if ((e.ctrlKey || e.metaKey) && e.key === '=') {
                e.preventDefault();
                this.zoomIn();
            } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
                e.preventDefault();
                this.zoomOut();
            } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
                e.preventDefault();
                this.zoomReset();
            }
        });
    },

    setView(view) {
        this.currentView = view;
        document.querySelectorAll('#calendarViewDay, #calendarViewWeek, #calendarViewMonth').forEach(btn => {
            btn.classList.remove('active');
        });
        if (view === CONFIG.CALENDAR_VIEWS.DAY) {
            document.getElementById('calendarViewDay').classList.add('active');
        } else if (view === CONFIG.CALENDAR_VIEWS.WEEK) {
            document.getElementById('calendarViewWeek').classList.add('active');
        } else {
            document.getElementById('calendarViewMonth').classList.add('active');
        }
        this.render();
    },

    navigate(direction) {
        if (this.currentView === CONFIG.CALENDAR_VIEWS.DAY) {
            this.currentDate.setDate(this.currentDate.getDate() + direction);
        } else if (this.currentView === CONFIG.CALENDAR_VIEWS.WEEK) {
            this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
        } else {
            this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        }
        this.render();
    },

    render() {
        const container = document.getElementById('calendarContainer');
        if (!container) return;

        if (this.currentView === CONFIG.CALENDAR_VIEWS.DAY) {
            container.innerHTML = this.renderDayView();
        } else if (this.currentView === CONFIG.CALENDAR_VIEWS.WEEK) {
            container.innerHTML = this.renderWeekView();
        } else {
            container.innerHTML = this.renderMonthView();
        }

        // Применить масштаб после небольшой задержки для правильного расчета размеров
        setTimeout(() => {
            this.applyZoom();
        }, 10);
        this.attachTaskEvents();
    },

    zoomIn() {
        const oldZoom = this.zoomLevel;
        this.zoomLevel = Math.min(this.zoomLevel + 0.1, 2.0); // Максимум 200%
        if (oldZoom !== this.zoomLevel) {
            this.saveZoom();
            this.applyZoom();
        }
    },

    zoomOut() {
        const oldZoom = this.zoomLevel;
        this.zoomLevel = Math.max(this.zoomLevel - 0.1, 0.5); // Минимум 50%
        if (oldZoom !== this.zoomLevel) {
            this.saveZoom();
            this.applyZoom();
        }
    },

    zoomReset() {
        if (this.zoomLevel !== 1.0) {
            this.zoomLevel = 1.0;
            this.saveZoom();
            this.applyZoom();
        }
    },

    saveZoom() {
        localStorage.setItem('calendar_zoom_level', this.zoomLevel.toString());
    },

    applyZoom() {
        const container = document.getElementById('calendarContainer');
        if (!container) return;

        // Применяем масштаб через CSS zoom (лучше для календаря)
        container.style.zoom = this.zoomLevel;
        this.updateZoomIndicator();
    },

    updateZoomIndicator() {
        const zoomIndicator = document.getElementById('calendarZoomLevel');
        if (zoomIndicator) {
            zoomIndicator.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
    },

    renderDayView() {
        const date = new Date(this.currentDate);
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const tasks = this.getTasksForDate(date);

        return `
            <div class="calendar-day-view">
                <div class="calendar-day-header">
                    <h2>${date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
                </div>
                <div class="calendar-day-hours">
                    ${hours.map(hour => {
                        const hourTasks = tasks.filter(t => {
                            if (!t.startTime) return false;
                            let timeStr = t.startTime;
                            if (timeStr.includes('T')) {
                                timeStr = new Date(timeStr).toTimeString().slice(0, 5);
                            }
                            const taskHour = parseInt(timeStr.split(':')[0]);
                            return taskHour === hour;
                        });
                        return `
                            <div class="calendar-hour-row" data-hour="${hour}">
                                <div class="calendar-hour-label">${hour.toString().padStart(2, '0')}:00</div>
                                <div class="calendar-hour-content" data-hour="${hour}">
                                    ${hourTasks.map(task => this.renderTaskBlock(task)).join('')}
                                    <div class="calendar-hour-add" onclick="Calendar.addTaskAtHour(${hour})">
                                        <i class="fas fa-plus"></i>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },

    renderWeekView() {
        const startOfWeek = this.getStartOfWeek(this.currentDate);
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            return d;
        });
        const hours = Array.from({ length: 24 }, (_, i) => i);

        return `
            <div class="calendar-week-view">
                <div class="calendar-week-header">
                    <div class="calendar-week-time-column"></div>
                    ${days.map(day => `
                        <div class="calendar-week-day-header ${this.isToday(day) ? 'today' : ''}">
                            <div class="calendar-week-day-name">${day.toLocaleDateString('ru-RU', { weekday: 'short' })}</div>
                            <div class="calendar-week-day-number">${day.getDate()}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="calendar-week-body">
                    ${hours.map(hour => {
                        const hourLabel = hour.toString().padStart(2, '0') + ':00';
                        return `
                            <div class="calendar-week-hour-row">
                                <div class="calendar-week-time-label">${hourLabel}</div>
                                ${days.map(day => {
                                    const tasks = this.getTasksForDateAndHour(day, hour);
                                    return `
                                        <div class="calendar-week-cell" data-date="${day.toISOString().split('T')[0]}" data-hour="${hour}">
                                            ${tasks.map(task => this.renderTaskBlock(task)).join('')}
                                            <div class="calendar-hour-add" onclick="Calendar.addTaskAtDateHour('${day.toISOString().split('T')[0]}', ${hour})">
                                                <i class="fas fa-plus"></i>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },

    renderMonthView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = this.getStartOfWeek(firstDay);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 41); // 6 weeks

        const weeks = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const week = [];
            for (let i = 0; i < 7; i++) {
                week.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            weeks.push(week);
        }

        return `
            <div class="calendar-month-view">
                <div class="calendar-month-header">
                    ${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => `
                        <div class="calendar-month-day-name">${day}</div>
                    `).join('')}
                </div>
                <div class="calendar-month-body">
                    ${weeks.map(week => `
                        <div class="calendar-month-week">
                            ${week.map(day => {
                                const tasks = this.getTasksForDate(day);
                                const isCurrentMonth = day.getMonth() === month;
                                return `
                                    <div class="calendar-month-day ${!isCurrentMonth ? 'other-month' : ''} ${this.isToday(day) ? 'today' : ''}" 
                                         data-date="${day.toISOString().split('T')[0]}">
                                        <div class="calendar-month-day-number">${day.getDate()}</div>
                                        <div class="calendar-month-day-tasks">
                                            ${tasks.slice(0, 3).map(task => `
                                                <div class="calendar-month-task" onclick="Calendar.openTask('${task.id}')" title="${this.escapeHtml(task.title)}">
                                                    ${this.escapeHtml(task.title.substring(0, 20))}
                                                </div>
                                            `).join('')}
                                            ${tasks.length > 3 ? `<div class="calendar-month-task-more">+${tasks.length - 3}</div>` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
        return new Date(d.setDate(diff));
    },

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },

    getTasksForDate(date) {
        const tasks = Storage.getTasks();
        const dateStr = date.toISOString().split('T')[0];
        return Object.values(tasks).filter(task => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
            return taskDate === dateStr && task.status !== CONFIG.TASK_STATUSES.DONE;
        });
    },

    getTasksForDateAndHour(date, hour) {
        const tasks = this.getTasksForDate(date);
        return tasks.filter(task => {
            if (!task.startTime) return false;
            // startTime может быть строкой HH:MM или ISO строкой
            let timeStr = task.startTime;
            if (timeStr.includes('T')) {
                // ISO формат, извлекаем время
                timeStr = new Date(timeStr).toTimeString().slice(0, 5);
            }
            const taskHour = parseInt(timeStr.split(':')[0]);
            return taskHour === hour;
        });
    },

    renderTaskBlock(task) {
        const priorityColors = {
            high: 'var(--error)',
            medium: 'var(--warning)',
            low: 'var(--info)'
        };
        const color = priorityColors[task.priority] || 'var(--primary)';
        const duration = task.duration || 1;
        const height = Math.max(duration * 40, 40);
        
        // Форматируем время
        let timeDisplay = '';
        if (task.startTime) {
            if (task.startTime.includes('T')) {
                timeDisplay = new Date(task.startTime).toTimeString().slice(0, 5);
            } else {
                timeDisplay = task.startTime;
            }
        }

        return `
            <div class="calendar-task-block" 
                 style="background: ${color}; height: ${height}px;"
                 onclick="Calendar.openTask('${task.id}')"
                 draggable="true"
                 data-task-id="${task.id}">
                <div class="calendar-task-title">${this.escapeHtml(task.title)}</div>
                ${timeDisplay ? `<div class="calendar-task-time">${timeDisplay}</div>` : ''}
            </div>
        `;
    },

    openTask(taskId) {
        const task = Storage.getTask(taskId);
        if (task) {
            GTD.showTaskModal(task.contextId, task.contextType, taskId);
        }
    },

    addTaskAtHour(hour) {
        const date = new Date(this.currentDate);
        const startTime = `${hour.toString().padStart(2, '0')}:00`;
        GTD.showTaskModal(null, 'inbox', null, {
            dueDate: date.toISOString().split('T')[0],
            startTime: startTime
        });
    },

    addTaskAtDateHour(dateStr, hour) {
        const startTime = `${hour.toString().padStart(2, '0')}:00`;
        GTD.showTaskModal(null, 'inbox', null, {
            dueDate: dateStr,
            startTime: startTime
        });
    },

    attachTaskEvents() {
        // Drag and drop для задач в календаре
        document.querySelectorAll('.calendar-task-block').forEach(block => {
            block.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('taskId', block.dataset.taskId);
            });
        });

        document.querySelectorAll('.calendar-hour-content, .calendar-week-cell').forEach(cell => {
            cell.addEventListener('dragover', (e) => {
                e.preventDefault();
                cell.style.backgroundColor = 'var(--bg-hover)';
            });

            cell.addEventListener('dragleave', () => {
                cell.style.backgroundColor = '';
            });

            cell.addEventListener('drop', (e) => {
                e.preventDefault();
                cell.style.backgroundColor = '';
                const taskId = e.dataTransfer.getData('taskId');
                const date = cell.dataset.date || this.currentDate.toISOString().split('T')[0];
                const hour = parseInt(cell.dataset.hour || '0');
                const startTime = `${hour.toString().padStart(2, '0')}:00`;
                
                const task = Storage.getTask(taskId);
                if (task) {
                    task.dueDate = date;
                    task.startTime = startTime;
                    Storage.saveTask(taskId, task);
                    this.render();
                }
            });
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
