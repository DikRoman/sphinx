// Habits Tracker
const Habits = {
    init() {
        this.renderHabits();
        this.setupEventListeners();
    },

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#addHabit')) { e.preventDefault(); this.showHabitModal(); }
        });
    },

    renderHabits() {
        const container = document.getElementById('habitsContainer');
        if (!container) return;
        const habits = Storage.getHabits();
        const habitEntries = Object.values(habits);

        if (habitEntries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <h3>Нет привычек</h3>
                    <p>Создайте свою первую привычку для отслеживания</p>
                </div>
            `;
            return;
        }

        container.innerHTML = habitEntries.map(habit => this.createHabitCard(habit)).join('');
    },

    createHabitCard(habit) {
        const calendar = this.generateCalendar(habit);
        const stats = this.calculateStats(habit);

        return `
            <div class="habit-card">
                <div class="habit-header">
                    <div>
                        <div class="habit-title">${this.escapeHtml(habit.name)}</div>
                        <div class="habit-frequency">${this.getFrequencyText(habit)}</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-icon" onclick="Habits.showHabitModal('${habit.id}')" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="Habits.deleteHabit('${habit.id}')" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="habit-calendar">
                    ${calendar}
                </div>
                <div class="habit-stats">
                    <span>Выполнено: ${stats.completed}/${stats.total}</span>
                    <span>${stats.percentage}%</span>
                </div>
            </div>
        `;
    },

    generateCalendar(habit) {
        const days = [];
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 13); // Last 14 days

        for (let i = 0; i < 14; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const completed = habit.completions && habit.completions[dateStr];
            
            days.push(`
                <div class="habit-day ${completed ? 'completed' : ''}" 
                     onclick="Habits.toggleDay('${habit.id}', '${dateStr}')"
                     title="${date.toLocaleDateString('ru-RU')}">
                    ${date.getDate()}
                </div>
            `);
        }

        return days.join('');
    },

    calculateStats(habit) {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 13);
        
        let completed = 0;
        let total = 14;

        for (let i = 0; i < 14; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            if (habit.completions && habit.completions[dateStr]) {
                completed++;
            }
        }

        return {
            completed,
            total,
            percentage: Math.round((completed / total) * 100)
        };
    },

    getFrequencyText(habit) {
        if (habit.frequency === CONFIG.HABIT_FREQUENCIES.DAILY) {
            return 'Ежедневно';
        } else if (habit.frequency === CONFIG.HABIT_FREQUENCIES.WEEKLY) {
            return `Не реже ${habit.weeklyMin || 1} раз в неделю`;
        } else if (habit.frequency === CONFIG.HABIT_FREQUENCIES.CUSTOM) {
            return habit.customFrequency || 'Настраиваемая частота';
        }
        return 'Ежедневно';
    },

    toggleDay(habitId, dateStr) {
        const habit = Storage.getHabits()[habitId];
        if (!habit) return;

        if (!habit.completions) {
            habit.completions = {};
        }

        if (habit.completions[dateStr]) {
            delete habit.completions[dateStr];
        } else {
            habit.completions[dateStr] = true;
        }

        Storage.saveHabit(habitId, habit);
        this.renderHabits();
    },

    showHabitModal(habitId = null) {
        const modal = document.getElementById('habitModal');
        const modalBody = document.getElementById('habitModalBody');
        const habit = habitId ? Storage.getHabits()[habitId] : null;

        modalBody.innerHTML = `
            <h2 style="margin-bottom: 1.5rem;">${habitId ? 'Редактировать' : 'Создать'} привычку</h2>
            <form id="habitForm">
                <div class="form-group">
                    <label class="form-label">Название</label>
                    <input type="text" class="form-input" id="habitName" value="${habit?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Частота</label>
                    <select class="select-input" id="habitFrequency" onchange="Habits.updateFrequencyOptions()">
                        <option value="daily" ${habit?.frequency === 'daily' ? 'selected' : ''}>Ежедневно</option>
                        <option value="weekly" ${habit?.frequency === 'weekly' ? 'selected' : ''}>Несколько раз в неделю</option>
                        <option value="custom" ${habit?.frequency === 'custom' ? 'selected' : ''}>Настраиваемая</option>
                    </select>
                </div>
                <div class="form-group" id="weeklyOptions" style="display: ${habit?.frequency === 'weekly' ? 'block' : 'none'};">
                    <label class="form-label">Минимум раз в неделю</label>
                    <input type="number" class="form-input" id="weeklyMin" value="${habit?.weeklyMin || 1}" min="1" max="7">
                </div>
                <div class="form-group" id="customOptions" style="display: ${habit?.frequency === 'custom' ? 'block' : 'none'};">
                    <label class="form-label">Описание частоты</label>
                    <input type="text" class="form-input" id="customFrequency" value="${habit?.customFrequency || ''}" placeholder="Например: 3 раза в неделю">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="Habits.closeHabitModal()">Отмена</button>
                    <button type="submit" class="btn-primary">Сохранить</button>
                </div>
            </form>
        `;

        document.getElementById('habitForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = habitId || 'habit_' + Date.now();
            const frequency = document.getElementById('habitFrequency').value;
            
            const habitData = {
                name: document.getElementById('habitName').value,
                frequency: frequency,
                completions: habit?.completions || {}
            };

            if (frequency === CONFIG.HABIT_FREQUENCIES.WEEKLY) {
                habitData.weeklyMin = parseInt(document.getElementById('weeklyMin').value) || 1;
            } else if (frequency === CONFIG.HABIT_FREQUENCIES.CUSTOM) {
                habitData.customFrequency = document.getElementById('customFrequency').value;
            }

            Storage.saveHabit(id, habitData);
            this.renderHabits();
            this.closeHabitModal();
        });

        modal.classList.add('active');
    },

    updateFrequencyOptions() {
        const frequency = document.getElementById('habitFrequency').value;
        document.getElementById('weeklyOptions').style.display = 
            frequency === CONFIG.HABIT_FREQUENCIES.WEEKLY ? 'block' : 'none';
        document.getElementById('customOptions').style.display = 
            frequency === CONFIG.HABIT_FREQUENCIES.CUSTOM ? 'block' : 'none';
    },

    deleteHabit(habitId) {
        if (confirm('Удалить эту привычку?')) {
            Storage.deleteHabit(habitId);
            this.renderHabits();
        }
    },

    closeHabitModal() {
        document.getElementById('habitModal').classList.remove('active');
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
