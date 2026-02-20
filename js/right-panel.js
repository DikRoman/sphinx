// Right Panel - календарь и YouTube плеер с плейлистами и историей
const RightPanel = {
    currentDate: null,
    ytPlayer: null,
    currentVideoId: null,
    currentPlaylistId: null,
    currentVideoIndex: -1,
    autoNext: true,
    savePositionInterval: null,
    calendarCollapsed: false,

    init() {
        this.currentDate = new Date();
        this.calendarCollapsed = localStorage.getItem('sphinx_calendar_collapsed') === 'true';
        this.renderCalendar();
        this.setupCalendarTab();
        this.setupCalendarNav();
        this.setupYouTubePlayer();
        this.initYouTubeAPI();
    },

    setupCalendarTab() {
        const tab = document.getElementById('calendarTab');
        const calendar = document.getElementById('rightPanelCalendar');
        tab?.addEventListener('click', () => {
            this.calendarCollapsed = !this.calendarCollapsed;
            localStorage.setItem('sphinx_calendar_collapsed', this.calendarCollapsed);
            calendar?.classList.toggle('collapsed', this.calendarCollapsed);
            const icon = tab?.querySelector('i');
            icon.className = this.calendarCollapsed ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        });
        calendar?.classList.toggle('collapsed', this.calendarCollapsed);
        const tabIcon = document.getElementById('calendarTab')?.querySelector('i');
        if (tabIcon) tabIcon.className = this.calendarCollapsed ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    },

    initYouTubeAPI() {
        if (typeof YT !== 'undefined' && YT.Player) {
            this.createYTPlayer();
            return;
        }
        window.onYouTubeIframeAPIReady = () => this.createYTPlayer();
    },

    createYTPlayer() {
        const container = document.getElementById('youtubePlayerContainer');
        if (!container || this.ytPlayer) return;
        this.ytPlayer = new YT.Player('youtubePlayerContainer', {
            height: '180',
            width: '100%',
            videoId: '',
            playerVars: {
                autoplay: 1,
                enablejsapi: 1
            },
            events: {
                onStateChange: (e) => {
                    if (e.data === YT.PlayerState.PLAYING) {
                        this.startSavePosition();
                    } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
                        this.saveCurrentPosition();
                        this.stopSavePosition();
                        if (e.data === YT.PlayerState.ENDED && this.autoNext) this.playNext();
                    }
                }
            }
        });
        this.updateResumeButton();
        this.applyPlayerSize();
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
        this.renderWeekStrip();
    },

    renderWeekStrip() {
        const strip = document.getElementById('rightPanelWeekStrip');
        if (!strip) return;
        const d = new Date();
        const day = d.getDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        let html = '';
        for (let i = 0; i < 7; i++) {
            const fd = new Date(d);
            fd.setDate(d.getDate() + mondayOffset + i);
            const isToday = fd.toDateString() === d.toDateString();
            html += `<span class="right-panel-day ${isToday ? 'today' : ''}">${fd.getDate()}</span>`;
        }
        strip.innerHTML = html;
    },

    parseVideoId(input) {
        if (!input || typeof input !== 'string') return null;
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/
        ];
        for (const p of patterns) {
            const m = input.match(p);
            if (m) return m[1];
        }
        return null;
    },

    getHistory() {
        return Storage.getYoutubeHistory();
    },

    saveHistory(data) {
        Storage.saveYoutubeHistory(data);
    },

    formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    },

    startSavePosition() {
        this.stopSavePosition();
        this.savePositionInterval = setInterval(() => this.saveCurrentPosition(), 5000);
    },

    stopSavePosition() {
        if (this.savePositionInterval) {
            clearInterval(this.savePositionInterval);
            this.savePositionInterval = null;
        }
    },

    saveCurrentPosition() {
        if (!this.ytPlayer || !this.currentVideoId || typeof this.ytPlayer.getCurrentTime !== 'function') return;
        try {
            const pos = this.ytPlayer.getCurrentTime();
            if (pos < 5) return; // не сохраняем если меньше 5 сек
            const history = this.getHistory();
            history.positions[this.currentVideoId] = { pos: Math.floor(pos) };
            history.lastVideo = { id: this.currentVideoId, pos: Math.floor(pos) };
            this.saveHistory(history);
            this.updateResumeButton();
        } catch (e) {}
    },

    updateResumeButton() {
        const btn = document.getElementById('youtubeResumeBtn');
        if (!btn) return;
        const history = this.getHistory();
        const label = btn.querySelector('.youtube-resume-label');
        if (history.lastVideo && history.lastVideo.pos > 5) {
            btn.style.display = 'flex';
            if (label) label.textContent = ` Продолжить (${this.formatTime(history.lastVideo.pos)})`;
        } else {
            btn.style.display = 'none';
        }
    },

    setupYouTubePlayer() {
        const input = document.getElementById('youtubeUrl');
        const select = document.getElementById('youtubePlaylistSelect');
        const addBtn = document.getElementById('youtubeAddVideo');
        const newPlaylistBtn = document.getElementById('youtubeNewPlaylist');
        const resumeBtn = document.getElementById('youtubeResumeBtn');
        const playlistsEl = document.getElementById('youtubePlaylists');
        if (!input) return;

        resumeBtn?.addEventListener('click', () => {
            const h = this.getHistory();
            if (h.lastVideo) this.playVideo(h.lastVideo.id, false, null, -1);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const videoId = this.parseVideoId(input.value.trim());
                const playlistId = select?.value;
                if (videoId && playlistId) {
                    this.addVideoToPlaylist(videoId, playlistId);
                    input.value = '';
                } else if (videoId) {
                    this.playVideo(videoId, null, null, -1);
                }
            }
        });

        addBtn?.addEventListener('click', () => {
            const videoId = this.parseVideoId(input.value.trim());
            const playlistId = select?.value;
            if (!videoId) return;
            if (playlistId) {
                this.addVideoToPlaylist(videoId, playlistId);
                input.value = '';
            } else {
                this.playVideo(videoId, null, null, -1);
            }
        });

        newPlaylistBtn?.addEventListener('click', () => this.showNewPlaylistModal());

        this.setupPlayerNav();
        document.getElementById('youtubeExpandBtn')?.addEventListener('click', () => this.expandVideo());
        document.getElementById('youtubeExpandClose')?.addEventListener('click', () => this.collapseVideo());
        document.getElementById('youtubeExpandedModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'youtubeExpandedModal') this.collapseVideo();
        });

        this.renderPlaylists();
        this.updateResumeButton();
        document.addEventListener('click', (e) => {
            const playBtn = e.target.closest('[data-play-video]');
            const delVideo = e.target.closest('[data-delete-video]');
            const delPlaylist = e.target.closest('[data-delete-playlist]');
            const playlistHeader = e.target.closest('.youtube-playlist-header');
            if (playBtn) {
                e.preventDefault();
                e.stopPropagation();
                const videoId = playBtn.getAttribute('data-play-video') || playBtn.dataset?.playVideo;
                let plId = playBtn.getAttribute('data-playlist-id') || playBtn.dataset?.playlistId;
                if (!plId || plId === '') plId = null;
                let idx = -1;
                const idxAttr = playBtn.getAttribute('data-video-index') ?? playBtn.dataset?.videoIndex;
                if (idxAttr !== undefined && idxAttr !== null && idxAttr !== '') idx = parseInt(String(idxAttr), 10);
                this.playVideo(videoId, null, plId || null, idx >= 0 ? idx : -1);
            } else if (delVideo) {
                e.preventDefault();
                this.deleteVideo(delVideo.dataset.playlistId, delVideo.dataset.videoId);
            } else if (delPlaylist) {
                e.preventDefault();
                this.deletePlaylist(delPlaylist.dataset.playlistId);
            } else if (playlistHeader) {
                const list = playlistHeader.closest('.youtube-playlist');
                if (list) list.classList.toggle('expanded');
            }
        });
    },

    getData() {
        return Storage.getYoutubePlaylists();
    },

    saveData(data) {
        Storage.saveYoutubePlaylists(data);
    },

    renderPlaylists() {
        const data = this.getData();
        const select = document.getElementById('youtubePlaylistSelect');
        const playlistsEl = document.getElementById('youtubePlaylists');

        if (select) {
            select.innerHTML = '<option value="">— в плейлист —</option>';
            data.playlists.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`;
            });
        }

        if (playlistsEl) {
            if (data.playlists.length === 0) {
                playlistsEl.innerHTML = '<p class="youtube-empty">Создайте плейлист и добавляйте видео</p>';
                return;
            }
            playlistsEl.innerHTML = data.playlists.map(p => `
                <div class="youtube-playlist" data-playlist-id="${p.id}">
                    <div class="youtube-playlist-header">
                        <i class="fas fa-chevron-right"></i>
                        <span>${this.escapeHtml(p.name)}</span>
                        <span class="youtube-playlist-count">${p.videos.length}</span>
                        <button type="button" class="youtube-del-playlist" data-delete-playlist data-playlist-id="${p.id}" title="Удалить плейлист"><i class="fas fa-trash-alt"></i></button>
                    </div>
                    <div class="youtube-playlist-videos">
                        ${p.videos.map((v, idx) => `
                            <div class="youtube-video-item">
                                <button type="button" class="youtube-play-btn" data-play-video="${v.id}" data-playlist-id="${p.id}" data-video-index="${idx}" title="Играть">
                                    <i class="fas fa-play"></i> ${this.escapeHtml(v.title || v.id)}
                                </button>
                                <button type="button" class="youtube-del-video" data-delete-video data-playlist-id="${p.id}" data-video-id="${v.id}" title="Удалить"><i class="fas fa-times"></i></button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },

    showNewPlaylistModal() {
        const name = prompt('Название плейлиста');
        if (name && name.trim()) this.createPlaylist(name.trim());
    },

    createPlaylist(name) {
        const data = this.getData();
        const id = 'pl-' + Date.now();
        data.playlists.push({ id, name, videos: [] });
        this.saveData(data);
        this.renderPlaylists();
    },

    addVideoToPlaylist(videoId, playlistId) {
        const data = this.getData();
        const pl = data.playlists.find(p => p.id === playlistId);
        if (!pl) return;
        if (pl.videos.some(v => v.id === videoId)) return;
        pl.videos.push({ id: videoId, title: videoId });
        this.saveData(data);
        this.renderPlaylists();
    },

    deleteVideo(playlistId, videoId) {
        const data = this.getData();
        const pl = data.playlists.find(p => p.id === playlistId);
        if (!pl) return;
        pl.videos = pl.videos.filter(v => v.id !== videoId);
        this.saveData(data);
        this.renderPlaylists();
    },

    deletePlaylist(playlistId) {
        if (!confirm('Удалить плейлист?')) return;
        const data = this.getData();
        data.playlists = data.playlists.filter(p => p.id !== playlistId);
        this.saveData(data);
        this.renderPlaylists();
    },

    applyPlayerSize() {
        const container = document.getElementById('youtubePlayerContainer');
        if (this.ytPlayer && typeof this.ytPlayer.setSize === 'function') {
            try {
                const w = container?.offsetWidth || 220;
                this.ytPlayer.setSize(w, 180);
            } catch (e) {}
        }
    },

    setupPlayerNav() {
        const prevBtn = document.getElementById('youtubePrevBtn');
        const nextBtn = document.getElementById('youtubeNextBtn');
        prevBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.playPrev(); });
        nextBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.playNext(); });
    },

    getCurrentPlaylistVideos() {
        const data = this.getData();
        if (this.currentPlaylistId) {
            const pl = data.playlists.find(p => p.id === this.currentPlaylistId);
            if (pl && pl.videos?.length) return pl.videos;
        }
        if (this.currentVideoId) {
            for (const p of data.playlists || []) {
                const idx = p.videos?.findIndex(v => v.id === this.currentVideoId);
                if (idx >= 0) {
                    this.currentPlaylistId = p.id;
                    this.currentVideoIndex = idx;
                    return p.videos;
                }
            }
        }
        return [];
    },

    playNext() {
        const videos = this.getCurrentPlaylistVideos();
        if (videos.length === 0) return;
        const nextIdx = (this.currentVideoIndex + 1) % videos.length;
        this.playVideo(videos[nextIdx].id, null, this.currentPlaylistId, nextIdx);
    },

    playPrev() {
        const videos = this.getCurrentPlaylistVideos();
        if (videos.length === 0) return;
        const prevIdx = this.currentVideoIndex <= 0 ? videos.length - 1 : this.currentVideoIndex - 1;
        this.playVideo(videos[prevIdx].id, null, this.currentPlaylistId, prevIdx);
    },

    playVideo(videoId, fromStart = null, playlistId = null, videoIndex = -1) {
        this.currentVideoId = videoId;
        this.currentPlaylistId = playlistId !== undefined ? playlistId : this.currentPlaylistId;
        this.currentVideoIndex = videoIndex >= 0 ? videoIndex : -1;
        const history = this.getHistory();
        let startSeconds = 0;
        if (fromStart === false && history.positions[videoId]?.pos > 5) {
            startSeconds = history.positions[videoId].pos;
        } else if (fromStart === null && history.positions[videoId]?.pos > 5) {
            startSeconds = history.positions[videoId].pos;
        }

        if (!this.ytPlayer && typeof YT !== 'undefined' && YT.Player) {
            this.createYTPlayer();
        }
        if (this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
            this.ytPlayer.loadVideoById({
                videoId,
                startSeconds,
                suggestedQuality: 'default'
            });
            document.getElementById('youtubePlayerContainer')?.style.setProperty('display', 'block');
            document.getElementById('youtubeExpandBtn')?.style.setProperty('display', 'flex');
            this.applyPlayerSize();
        } else {
            const container = document.getElementById('youtubePlayerContainer');
            if (container && !container.querySelector('iframe')) {
                container.innerHTML = `<iframe width="100%" height="180" src="https://www.youtube.com/embed/${videoId}?autoplay=1&start=${startSeconds}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                container.style.display = 'block';
                document.getElementById('youtubeExpandBtn')?.style.setProperty('display', 'flex');
            }
        }
    },

    expandVideo() {
        if (!this.currentVideoId) return;
        let startSec = 0;
        if (this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
            try { startSec = Math.floor(this.ytPlayer.getCurrentTime()); } catch (e) {}
        } else {
            const h = this.getHistory();
            startSec = h.positions[this.currentVideoId]?.pos || 0;
        }
        const modal = document.getElementById('youtubeExpandedModal');
        const container = document.getElementById('youtubeExpandedPlayer');
        if (!modal || !container) return;
        container.innerHTML = `<iframe src="https://www.youtube.com/embed/${this.currentVideoId}?autoplay=1&start=${startSec}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        modal.classList.add('active');
    },

    collapseVideo() {
        const modal = document.getElementById('youtubeExpandedModal');
        const container = document.getElementById('youtubeExpandedPlayer');
        if (modal) modal.classList.remove('active');
        if (container) container.innerHTML = '';
    }
};
