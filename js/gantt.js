// Gantt Chart
const Gantt = {
    scale: 1,
    startDate: null,
    endDate: null,

    init() {
        this.setupEventListeners();
        this.renderGantt();
    },

    setupEventListeners() {
        document.addEventListener('change', (e) => {
            if (e.target.id === 'ganttProjectSelect') this.renderGantt();
        });
        document.addEventListener('click', (e) => {
            if (e.target.closest('#ganttZoomIn')) { e.preventDefault(); this.scale = Math.min(this.scale * 1.2, 3); this.renderGantt(); }
            if (e.target.closest('#ganttZoomOut')) { e.preventDefault(); this.scale = Math.max(this.scale / 1.2, 0.5); this.renderGantt(); }
        });
    },

    renderGantt() {
        const container = document.getElementById('ganttContainer');
        const projectSelect = document.getElementById('ganttProjectSelect');
        if (!container || !projectSelect) return;
        const selectedProject = projectSelect.value;

        // Update project select
        const projects = Storage.getProjects();
        projectSelect.innerHTML = '<option value="all">Все проекты</option>';
        Object.values(projects).forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            if (selectedProject === project.id) {
                option.selected = true;
            }
            projectSelect.appendChild(option);
        });

        // Get tasks for selected project
        const tasks = Storage.getTasks();
        let filteredTasks = Object.values(tasks).filter(task => {
            if (task.contextType !== 'project') return false;
            if (selectedProject === 'all') return true;
            return task.contextId === selectedProject;
        });

        if (filteredTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-gantt"></i>
                    <h3>Нет задач для отображения</h3>
                    <p>Создайте проект и добавьте задачи с датами</p>
                </div>
            `;
            return;
        }

        // Calculate date range
        const dates = [];
        filteredTasks.forEach(task => {
            if (task.dueDate) dates.push(new Date(task.dueDate));
        });

        if (dates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-gantt"></i>
                    <h3>Нет задач с датами</h3>
                    <p>Добавьте сроки выполнения задачам</p>
                </div>
            `;
            return;
        }

        this.startDate = new Date(Math.min(...dates));
        this.endDate = new Date(Math.max(...dates));
        this.startDate.setDate(this.startDate.getDate() - 7);
        this.endDate.setDate(this.endDate.getDate() + 7);

        // Render Gantt
        const days = this.getDaysBetween(this.startDate, this.endDate);
        const dayWidth = 40 * this.scale;

        container.innerHTML = `
            <div class="gantt-chart" style="min-width: ${days.length * dayWidth}px;">
                ${filteredTasks.map(task => this.renderTaskRow(task, days, dayWidth)).join('')}
            </div>
        `;
    },

    renderTaskRow(task, days, dayWidth) {
        const project = task.contextId ? Storage.getProjects()[task.contextId] : null;
        const taskStart = task.dueDate ? new Date(task.dueDate) : new Date();
        const taskEnd = new Date(taskStart);
        taskEnd.setDate(taskEnd.getDate() + (task.duration || 1));

        const startOffset = this.getDaysBetween(this.startDate, taskStart).length * dayWidth;
        const width = Math.max((task.duration || 1) * dayWidth, 100);

        return `
            <div class="gantt-row">
                <div class="gantt-task-name">
                    ${this.escapeHtml(task.title)}
                    ${project ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${this.escapeHtml(project.name)}</div>` : ''}
                </div>
                <div class="gantt-timeline">
                    <div class="gantt-bar" style="left: ${startOffset}px; width: ${width}px;" 
                         onclick="Gantt.openTask('${task.id}')">
                        ${this.escapeHtml(task.title)}
                    </div>
                </div>
            </div>
        `;
    },

    getDaysBetween(start, end) {
        const days = [];
        const current = new Date(start);
        while (current <= end) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return days;
    },

    openTask(taskId) {
        const task = Storage.getTask(taskId);
        if (task) {
            GTD.showTaskModal(task.contextId, task.contextType, taskId);
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
