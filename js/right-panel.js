// Right Panel - календарь и YouTube плеер
const RightPanel = {
    currentDate: null,

    init() {
        this.currentDate = new Date();
        this.renderCalendar();
        this.setupYouTubePlayer();
        this.setupCalendarNav();
    },

    setupCalendarNav() {
        document.getElementById('rightPanelPrevMonth')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });
        document.getElementById('rightPanelNextMonth')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });
    },

    renderCalendar() {
        const monthEl = document.getElementById('rightPanelMonthYear');
        const daysEl = document.getElementById('rightPanelDays');
        if (!monthEl || !daysEl) return;

        const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        monthEl.textContent = `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        // Пн=0, Вт=1, ... Вс=6
        let startWeekday = firstDay.getDay() - 1;
        if (startWeekday < 0) startWeekday = 6;

        let html = '';
        for (let i = 0; i < startWeekday; i++) {
            html += '<span class="right-panel-day empty"></span>';
        }

        const today = new Date();
        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
            html += `<span class="right-panel-day ${isToday ? 'today' : ''}" data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}">${d}</span>`;
        }

        daysEl.innerHTML = html;
    },

    setupYouTubePlayer() {
        const input = document.getElementById('youtubeUrl');
        const iframe = document.getElementById('youtubePlayer');
        if (!input || !iframe) return;

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.loadYouTubeVideo(input.value.trim());
        });

        input.addEventListener('blur', () => {
            const url = input.value.trim();
            if (url) this.loadYouTubeVideo(url);
        });
    },

    loadYouTubeVideo(input) {
        const iframe = document.getElementById('youtubePlayer');
        if (!iframe) return;

        let videoId = '';
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/
        ];
        for (const p of patterns) {
            const m = input.match(p);
            if (m) {
                videoId = m[1];
                break;
            }
        }

        if (videoId) {
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0`;
            iframe.style.display = 'block';
        } else if (input) {
            iframe.style.display = 'none';
        }
    }
};
