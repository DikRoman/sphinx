// Cover / обложка блока
const Cover = {
    STORAGE_KEY: 'sphinx_cover_image',
    LAYOUT_KEY: 'sphinx_cover_position',
    COLLAPSED_KEY: 'sphinx_cover_collapsed',

    init() {
        this.loadCover();
        this.loadLayout();
        this.applyCollapsedState();
        this.setupCoverTab();
        this.setupEventListeners();
        this.setupLayoutListeners();
    },

    setupCoverTab() {
        const tab = document.getElementById('coverCollapseTab');
        const cover = document.getElementById('appCover');
        tab?.addEventListener('click', () => {
            const collapsed = cover?.classList.toggle('collapsed');
            localStorage.setItem(this.COLLAPSED_KEY, collapsed ? '1' : '0');
        });
    },

    applyCollapsedState() {
        const cover = document.getElementById('appCover');
        if (cover && localStorage.getItem(this.COLLAPSED_KEY) === '1') {
            cover.classList.add('collapsed');
        }
    },

    loadCover() {
        const url = localStorage.getItem(this.STORAGE_KEY);
        if (url) this.setBackground(url);
    },

    loadLayout() {
        const pos = localStorage.getItem(this.LAYOUT_KEY) || 'center center';
        this.applyPosition(pos);
    },

    setBackground(url) {
        const cover = document.getElementById('appCover');
        if (!cover) return;
        if (url) {
            cover.style.backgroundImage = `linear-gradient(to bottom, transparent 0%, rgba(5,5,8,0.1) 60%, rgba(5,5,8,0.35) 100%), url("${url}")`;
            cover.classList.add('has-cover');
        } else {
            cover.style.backgroundImage = '';
            cover.classList.remove('has-cover');
            localStorage.removeItem(this.STORAGE_KEY);
        }
    },

    applyPosition(position) {
        const cover = document.getElementById('appCover');
        if (!cover) return;
        cover.style.backgroundPosition = position;
    },

    setupLayoutListeners() {
        const btn = document.getElementById('coverLayoutBtn');
        const overlay = document.getElementById('coverLayoutOverlay');
        const okBtn = document.getElementById('coverLayoutOk');
        const options = document.querySelectorAll('.cover-layout-option');

        btn?.addEventListener('click', () => {
            const saved = localStorage.getItem(this.LAYOUT_KEY) || 'center center';
            options.forEach(o => {
                o.classList.toggle('active', o.dataset.position === saved);
            });
            overlay.style.display = 'flex';
        });

        okBtn?.addEventListener('click', () => {
            const active = document.querySelector('.cover-layout-option.active');
            const pos = active?.dataset.position || 'center center';
            this.applyPosition(pos);
            localStorage.setItem(this.LAYOUT_KEY, pos);
            overlay.style.display = 'none';
        });

        options.forEach(opt => {
            opt.addEventListener('click', () => {
                options.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });
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
            document.getElementById('coverUnsplashRow').style.display = 'none';
            document.getElementById('coverUnsplashQuery').value = '';
            this.hideModal();
        });

        document.getElementById('coverRemove')?.addEventListener('click', () => {
            this.setBackground(null);
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
