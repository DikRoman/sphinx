// Cover / обложка блока
const Cover = {
    STORAGE_KEY: 'sphinx_cover_image',

    init() {
        this.loadCover();
        this.setupEventListeners();
    },

    loadCover() {
        const url = localStorage.getItem(this.STORAGE_KEY);
        if (url) this.setBackground(url);
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
