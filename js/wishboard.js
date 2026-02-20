// Wish Board - доска желаний с картинками для вдохновения
const Wishboard = {
    data: { boards: [], currentBoardId: null },
    settings: {},
    isPanning: false,
    panStart: { x: 0, y: 0 },
    panScrollStart: { x: 0, y: 0 },

    get currentBoard() {
        return this.data.boards.find(b => b.id === this.data.currentBoardId) || this.data.boards[0];
    },

    get images() {
        const b = this.currentBoard;
        return b ? b.images : [];
    },

    init() {
        this.data = Storage.getWishboard();
        if (!this.data.boards || this.data.boards.length === 0) {
            this.data = { boards: [{ id: 'default', name: 'Основная', images: [] }], currentBoardId: 'default' };
            Storage.saveWishboard(this.data);
        }
        if (!this.data.currentBoardId && this.data.boards[0]) {
            this.data.currentBoardId = this.data.boards[0].id;
            Storage.saveWishboard(this.data);
        }
        this.settings = Storage.getWishboardSettings();
        this.setupEventListeners();
        this.applyBackground();
        this.setupPan();
        this.renderBoardsSelect();
    },

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#addWishboardImage') || e.target.closest('#wbToolAddImage') || e.target.closest('#wbToolFrame')) {
                e.preventDefault();
                this.showAddPrompt();
            }
        });
        document.addEventListener('click', (e) => {
            if (e.target.closest('#addWishboardBoard')) {
                e.preventDefault();
                this.createBoard();
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('#wishboardClosePrompt')) this.hideAddPrompt();
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('#wishboardAddByUrl')) this.addImageByUrl();
        });

        document.getElementById('wishboardImageUrl')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.addImageByUrl();
        });

        document.getElementById('wishboardBoards')?.addEventListener('change', (e) => {
            this.data.currentBoardId = e.target.value;
            Storage.saveWishboard(this.data);
            this.render();
        });

        document.getElementById('wishboardBoardName')?.addEventListener('change', (e) => {
            const name = e.target.value?.trim();
            if (name && this.currentBoard) {
                this.currentBoard.name = name;
                Storage.saveWishboard(this.data);
                this.renderBoardsSelect();
            }
        });
        document.getElementById('wishboardBoardName')?.addEventListener('blur', (e) => {
            const name = e.target.value?.trim();
            if (name && this.currentBoard) {
                this.currentBoard.name = name;
                Storage.saveWishboard(this.data);
                this.renderBoardsSelect();
            }
        });

        const addZone = document.getElementById('wishboardAddZone');
        const container = document.getElementById('wishboardContainer');
        const setupDrop = (el, addClass) => {
            if (!el) return;
            el.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (addClass) el.classList.add('drag-over');
            });
            el.addEventListener('dragleave', () => { if (addClass) el.classList.remove('drag-over'); });
            el.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (addClass) el.classList.remove('drag-over');
                const files = e.dataTransfer?.files;
                if (files?.length) this.addImageByFile(files[0]);
            });
        };
        setupDrop(addZone, true);
        setupDrop(container, false);

        document.addEventListener('paste', (e) => {
            const container = document.getElementById('wishboardContainer');
            if (!container?.closest('.view-panel.active')) return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const frame = document.querySelector('input[name="frameStyle"]:checked')?.value || 'polaroid';
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        this.addImage({ dataUrl: ev.target.result }, frame);
                    };
                    reader.readAsDataURL(item.getAsFile());
                    break;
                }
            }
        });

        document.getElementById('wishboardBackground')?.addEventListener('change', (e) => {
            this.setBackground(e.target.value);
        });

        document.getElementById('wbToolBg')?.addEventListener('click', () => {
            const sel = document.getElementById('wishboardBackground');
            if (sel) sel.focus();
        });
    },

    renderBoardsSelect() {
        const sel = document.getElementById('wishboardBoards');
        const nameInput = document.getElementById('wishboardBoardName');
        if (!sel) return;
        sel.innerHTML = this.data.boards.map(b => `<option value="${b.id}" ${b.id === this.data.currentBoardId ? 'selected' : ''}>${b.name || 'Без названия'}</option>`).join('');
        if (nameInput && this.currentBoard) {
            nameInput.value = this.currentBoard.name || '';
        }
    },

    createBoard() {
        const id = 'wb_' + Date.now();
        const name = prompt('Название новой доски:', 'Новая доска') || 'Новая доска';
        this.data.boards.push({ id, name, images: [] });
        this.data.currentBoardId = id;
        Storage.saveWishboard(this.data);
        this.renderBoardsSelect();
        this.render();
        const nameInput = document.getElementById('wishboardBoardName');
        if (nameInput) nameInput.value = name;
    },

    applyBackground() {
        const wrapper = document.getElementById('wishboardWrapper');
        if (!wrapper) return;
        wrapper.classList.remove('wishboard-bg-dark', 'wishboard-bg-light', 'wishboard-bg-beige');
        wrapper.classList.add('wishboard-bg-' + (this.settings.background || 'dark'));
        const sel = document.getElementById('wishboardBackground');
        if (sel) sel.value = this.settings.background || 'dark';
    },

    setBackground(bg) {
        this.settings.background = bg;
        Storage.saveWishboardSettings(this.settings);
        this.applyBackground();
    },

    setupPan() {
        const container = document.getElementById('wishboardContainer');
        if (!container) return;

        container.addEventListener('contextmenu', (e) => e.preventDefault());

        container.addEventListener('mousedown', (e) => {
            if (e.button !== 2) return;
            if (e.target.closest('.wishboard-image-card')) return;
            e.preventDefault();
            this.isPanning = true;
            this.panStart.x = e.clientX;
            this.panStart.y = e.clientY;
            this.panScrollStart.x = container.scrollLeft;
            this.panScrollStart.y = container.scrollTop;
            container.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isPanning) return;
            const dx = e.clientX - this.panStart.x;
            const dy = e.clientY - this.panStart.y;
            container.scrollLeft = this.panScrollStart.x - dx;
            container.scrollTop = this.panScrollStart.y - dy;
        });

        document.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                container.style.cursor = '';
            }
        });
    },

    showAddPrompt() {
        const prompt = document.getElementById('wishboardAddPrompt');
        const urlInput = document.getElementById('wishboardImageUrl');
        if (prompt) {
            prompt.classList.add('active');
            setTimeout(() => urlInput?.focus(), 100);
        }
    },

    hideAddPrompt() {
        document.getElementById('wishboardAddPrompt')?.classList.remove('active');
        const urlInput = document.getElementById('wishboardImageUrl');
        if (urlInput) urlInput.value = '';
    },

    addImageByUrl() {
        const urlInput = document.getElementById('wishboardImageUrl');
        const url = urlInput?.value?.trim();
        if (!url) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const frame = document.querySelector('input[name="frameStyle"]:checked')?.value || 'polaroid';
            this.addImage({ url, width: img.naturalWidth, height: img.naturalHeight }, frame);
            this.hideAddPrompt();
        };
        img.onerror = () => {
            alert('Не удалось загрузить изображение. Проверьте ссылку.');
        };
        img.src = url;
    },

    addImageByFile(file) {
        if (!file?.type?.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const frame = document.querySelector('input[name="frameStyle"]:checked')?.value || 'polaroid';
            this.addImage({ dataUrl: e.target.result }, frame);
            this.hideAddPrompt();
        };
        reader.readAsDataURL(file);
    },

    addImage(data, frameStyle = 'polaroid') {
        const board = this.currentBoard;
        if (!board) return;
        const id = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        const image = {
            id,
            url: data.url || null,
            dataUrl: data.dataUrl || null,
            width: data.width || 300,
            height: data.height || 200,
            frameStyle,
            caption: '',
            createdAt: new Date().toISOString()
        };
        board.images.push(image);
        Storage.saveWishboard(this.data);
        this.render();
    },

    removeImage(id) {
        const board = this.currentBoard;
        if (!board) return;
        board.images = board.images.filter(img => img.id !== id);
        Storage.saveWishboard(this.data);
        this.render();
    },

    render() {
        const container = document.getElementById('wishboardContainer');
        const prompt = document.getElementById('wishboardAddPrompt');
        if (!container) return;

        this.renderBoardsSelect();

        const images = this.images;
        if (!images || images.length === 0) {
            container.innerHTML = '';
            if (prompt) prompt.classList.add('show-empty');
            return;
        }

        if (prompt) prompt.classList.remove('show-empty');

        container.innerHTML = images.map(img => `
            <div class="wishboard-image-card ${img.frameStyle || 'polaroid'}" data-id="${img.id}">
                <div class="polaroid-image">
                    <img src="${img.dataUrl || img.url}" alt="Вдохновение">
                </div>
                <button class="wishboard-image-remove" onclick="Wishboard.removeImage('${img.id}')" title="Удалить">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
};
