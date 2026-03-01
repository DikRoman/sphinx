// Cover / обложка блока
const Cover = {
    STORAGE_KEY: 'sphinx_cover_image',
    LAYOUT_KEY: 'sphinx_cover_position',
    ZOOM_KEY: 'sphinx_cover_zoom',

    PRESET_TO_PERCENT: {
        'top left': '0% 0%',
        'top center': '50% 0%',
        'top right': '100% 0%',
        'center left': '0% 50%',
        'center center': '50% 50%',
        'center right': '100% 50%',
        'bottom left': '0% 100%',
        'bottom center': '50% 100%',
        'bottom right': '100% 100%'
    },

    init() {
        this.loadCover();
        this.loadLayout();
        this.setupEventListeners();
        this.setupLayoutListeners();
        this.setupCoverDrag();
    },

    loadCover() {
        const url = localStorage.getItem(this.STORAGE_KEY);
        if (url) this.setBackground(url);
    },

    loadLayout() {
        const pos = localStorage.getItem(this.LAYOUT_KEY) || '50% 50%';
        this.applyPosition(pos);
        const zoom = this.getZoom();
        this.applyZoom(zoom);
    },

    normalizePosition(pos) {
        const preset = this.PRESET_TO_PERCENT[pos];
        if (preset) return preset;
        if (typeof pos === 'string' && pos.includes('%')) return pos;
        return '50% 50%';
    },

    setBackground(url) {
        const cover = document.getElementById('appCover');
        if (!cover) return;
        if (url) {
            cover.style.backgroundImage = `linear-gradient(to bottom, transparent 0%, rgba(5,5,8,0.1) 60%, rgba(5,5,8,0.35) 100%), url("${url}")`;
            cover.classList.add('has-cover');
            this.applyZoom(this.getZoom());
        } else {
            cover.style.backgroundImage = '';
            cover.classList.remove('has-cover');
            localStorage.removeItem(this.STORAGE_KEY);
        }
    },

    applyPosition(position) {
        const cover = document.getElementById('appCover');
        if (!cover) return;
        const pos = this.normalizePosition(position);
        cover.style.backgroundPosition = pos;
    },

    getZoom() {
        const raw = localStorage.getItem(this.ZOOM_KEY);
        const num = raw ? parseFloat(raw) : 100;
        if (Number.isNaN(num)) return 100;
        return Math.max(60, Math.min(220, num));
    },

    applyZoom(zoom) {
        const cover = document.getElementById('appCover');
        if (!cover || !cover.classList.contains('has-cover')) return;
        const z = Math.max(60, Math.min(220, zoom || 100));
        cover.style.backgroundSize = `auto ${z}%`;
    },

    getPositionXY() {
        const pos = this.normalizePosition(localStorage.getItem(this.LAYOUT_KEY) || '50% 50%');
        const m = pos.match(/(\d+(?:\.\d+)?)\s*%\s*(\d+(?:\.\d+)?)\s*%/);
        return m ? [parseFloat(m[1]), parseFloat(m[2])] : [50, 50];
    },

    savePositionXY(x, y) {
        const clampedX = Math.max(0, Math.min(100, x));
        const clampedY = Math.max(0, Math.min(100, y));
        const pos = `${clampedX}% ${clampedY}%`;
        this.applyPosition(pos);
        localStorage.setItem(this.LAYOUT_KEY, pos);
    },

    setupLayoutListeners() {
        const btn = document.getElementById('coverLayoutBtn');
        const overlay = document.getElementById('coverLayoutOverlay');
        const okBtn = document.getElementById('coverLayoutOk');
        const cover = document.getElementById('appCover');
        const zoomRange = document.getElementById('coverZoomRange');
        const zoomValue = document.getElementById('coverZoomValue');

        btn?.addEventListener('click', () => {
            overlay.style.display = 'flex';
            if (cover?.classList.contains('has-cover')) cover.classList.add('cover-drag-mode');

            const currentZoom = this.getZoom();
            if (zoomRange) zoomRange.value = String(currentZoom);
            if (zoomValue) zoomValue.textContent = `${currentZoom}%`;
        });

        okBtn?.addEventListener('click', () => {
            overlay.style.display = 'none';
            cover?.classList.remove('cover-drag-mode');
        });

        zoomRange?.addEventListener('input', (e) => {
            const target = e.target;
            const value = parseFloat(target.value);
            const z = Number.isNaN(value) ? 100 : value;
            localStorage.setItem(this.ZOOM_KEY, String(z));
            this.applyZoom(z);
            if (zoomValue) zoomValue.textContent = `${Math.round(z)}%`;
            if (typeof SupabaseSync !== 'undefined' && SupabaseSync.pushSettings) SupabaseSync.pushSettings();
        });
    },

    setupCoverDrag() {
        const cover = document.getElementById('appCover');
        const overlay = document.getElementById('coverLayoutOverlay');
        const resizeHandle = document.getElementById('coverResizeHandle');

        if (!cover || !overlay) return;

        let isDragging = false;
        let startX = 0, startY = 0;
        let startPosX = 0, startPosY = 0;

        const onMouseDown = (e) => {
            if (!cover.classList.contains('has-cover')) return;
            if (overlay.style.display !== 'flex') return;
            if (e.target.closest('.cover-settings-btn') || e.target.closest('.cover-layout-btn') || 
                e.target.closest('.cover-layout-panel') || e.target === resizeHandle) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            [startPosX, startPosY] = this.getPositionXY();
            cover.classList.add('cover-dragging');
            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const k = 0.15;
            const newX = startPosX - dx * k;
            const newY = startPosY - dy * k;
            this.savePositionXY(newX, newY);
            e.preventDefault();
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                cover.classList.remove('cover-dragging');
            }
        };

        cover.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    },

    setupEventListeners() {
        document.getElementById('coverSettingsBtn')?.addEventListener('click', () => this.showModal());

        document.querySelector('[data-close="coverModal"]')?.addEventListener('click', () => this.hideModal());

        document.getElementById('coverUpload')?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file?.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                this.setBackground(ev.target.result);
                localStorage.setItem(this.STORAGE_KEY, ev.target.result);
                if (typeof SupabaseSync !== 'undefined' && SupabaseSync.pushSettings) SupabaseSync.pushSettings();
                this.hideModal();
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        });

        document.getElementById('coverUrlBtn')?.addEventListener('click', () => {
            document.getElementById('coverUrlRow').style.display = 'flex';
            document.getElementById('coverUnsplashRow').style.display = 'none';
        });

        document.getElementById('coverUrlApply')?.addEventListener('click', () => {
            const url = document.getElementById('coverUrlInput')?.value?.trim();
            if (!url) return;
            this.setBackground(url);
            localStorage.setItem(this.STORAGE_KEY, url);
            if (typeof SupabaseSync !== 'undefined' && SupabaseSync.pushSettings) SupabaseSync.pushSettings();
            document.getElementById('coverUrlRow').style.display = 'none';
            document.getElementById('coverUrlInput').value = '';
            this.hideModal();
        });

        document.getElementById('coverUnsplash')?.addEventListener('click', () => {
            document.getElementById('coverUrlRow').style.display = 'none';
            document.getElementById('coverUnsplashRow').style.display = 'flex';
        });

        document.getElementById('coverUnsplashApply')?.addEventListener('click', () => {
            const seed = Math.floor(Math.random() * 1000);
            const w = 1920;
            const h = 200;
            const url = `https://picsum.photos/seed/${seed}/${w}/${h}`;
            this.setBackground(url);
            localStorage.setItem(this.STORAGE_KEY, url);
            if (typeof SupabaseSync !== 'undefined' && SupabaseSync.pushSettings) SupabaseSync.pushSettings();
            document.getElementById('coverUnsplashRow').style.display = 'none';
            document.getElementById('coverUnsplashQuery').value = '';
            this.hideModal();
        });

        document.getElementById('coverRemove')?.addEventListener('click', () => {
            this.setBackground(null);
            if (typeof SupabaseSync !== 'undefined' && SupabaseSync.pushSettings) SupabaseSync.pushSettings();
            document.getElementById('coverUrlRow').style.display = 'none';
            document.getElementById('coverUnsplashRow').style.display = 'none';
            this.hideModal();
        });

        document.getElementById('coverModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'coverModal') this.hideModal();
        });
    },

    showModal() {
        document.getElementById('coverModal').classList.add('active');
        document.getElementById('coverUrlRow').style.display = 'none';
        document.getElementById('coverUnsplashRow').style.display = 'none';
    },

    hideModal() {
        document.getElementById('coverModal').classList.remove('active');
    }
};
