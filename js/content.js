// Content Library (Movies, Books, Series) - formerly Media
const Content = {
    currentType: CONFIG.CONTENT_TYPES.MOVIES,

    init() {
        this.setupEventListeners();
        this.renderContent();
    },

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#addContent')) { e.preventDefault(); this.showContentModal(); }
            const tab = e.target.closest('.tab-btn');
            if (tab && document.getElementById('pageContainer')?.contains(tab)) {
                e.preventDefault();
                this.currentType = tab.dataset.type;
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                tab.classList.add('active');
                this.renderContent();
            }
        });
    },

    renderContent() {
        const grid = document.getElementById('contentGrid');
        if (!grid) return;
        const content = Storage.getContent();
        const filteredContent = Object.values(content).filter(item => item.type === this.currentType);

        if (filteredContent.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-film"></i>
                    <h3>Нет ${this.getTypeName()}</h3>
                    <p>Добавьте свой первый элемент</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = filteredContent.map(item => this.createContentCard(item)).join('');
    },

    createContentCard(item) {
        const statusClass = item.status === 'completed' ? 'completed' : 'planned';
        const statusText = item.status === 'completed' 
            ? (this.currentType === CONFIG.CONTENT_TYPES.BOOKS ? 'Прочитано' : 'Просмотрено')
            : 'Запланировано';

        const rating = item.rating ? `<div class="content-rating">⭐ ${item.rating}/10</div>` : '';
        const genres = item.genres && item.genres.length > 0 
            ? `<div class="content-genres">${item.genres.map(g => `<span class="genre-tag">${this.escapeHtml(g)}</span>`).join('')}</div>`
            : '';

        return `
            <div class="content-card" onclick="Content.openContent('${item.id}')">
                ${item.imageUrl ? `
                    <img src="${this.escapeHtml(item.imageUrl)}" alt="${this.escapeHtml(item.title)}" 
                         class="content-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="content-image" style="display: none; align-items: center; justify-content: center; background: var(--bg-tertiary);">
                        <i class="fas fa-${this.getTypeIcon()}" style="font-size: 3rem; color: var(--text-muted);"></i>
                    </div>
                ` : `
                    <div class="content-image" style="display: flex; align-items: center; justify-content: center; background: var(--bg-tertiary);">
                        <i class="fas fa-${this.getTypeIcon()}" style="font-size: 3rem; color: var(--text-muted);"></i>
                    </div>
                `}
                <div class="content-info">
                    <div class="content-title">${this.escapeHtml(item.title)}</div>
                    ${genres}
                    <div class="content-meta">
                        ${item.year ? `<span>${item.year}</span>` : ''}
                        ${rating}
                        <span class="content-status ${statusClass}">${statusText}</span>
                    </div>
                </div>
            </div>
        `;
    },

    showContentModal(contentId = null) {
        const modal = document.getElementById('contentModal');
        const modalBody = document.getElementById('contentModalBody');
        const item = contentId ? Storage.getContent()[contentId] : null;

        const availableGenres = CONFIG.CONTENT_GENRES[this.currentType.toUpperCase()] || [];
        const selectedGenres = item?.genres || [];

        modalBody.innerHTML = `
            <h2 style="margin-bottom: 1.5rem;">${contentId ? 'Редактировать' : 'Добавить'} ${this.getTypeName()}</h2>
            <form id="contentForm">
                <div class="form-group">
                    <label class="form-label">Название</label>
                    <input type="text" class="form-input" id="contentTitle" value="${item?.title || ''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Год</label>
                    <input type="number" class="form-input" id="contentYear" value="${item?.year || ''}" min="1900" max="2100">
                </div>
                <div class="form-group">
                    <label class="form-label">Ссылка на изображение</label>
                    <input type="url" class="form-input" id="contentImageUrl" value="${item?.imageUrl || ''}" 
                           placeholder="https://example.com/image.jpg">
                    <small style="color: var(--text-muted); font-size: 0.75rem; margin-top: 0.25rem; display: block;">
                        Вставьте ссылку на изображение обложки
                    </small>
                </div>
                <div class="form-group">
                    <label class="form-label">Жанры</label>
                    <div class="genres-selector" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                        ${availableGenres.map(genre => `
                            <label class="genre-checkbox">
                                <input type="checkbox" value="${genre}" ${selectedGenres.includes(genre) ? 'checked' : ''}>
                                <span>${genre}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Описание</label>
                    <textarea class="form-textarea" id="contentDescription">${item?.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Статус</label>
                    <select class="select-input" id="contentStatus">
                        <option value="planned" ${item?.status === 'planned' ? 'selected' : ''}>Запланировано</option>
                        <option value="completed" ${item?.status === 'completed' ? 'selected' : ''}>
                            ${this.currentType === CONFIG.CONTENT_TYPES.BOOKS ? 'Прочитано' : 'Просмотрено'}
                        </option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Рейтинг (1-10)</label>
                    <input type="number" class="form-input" id="contentRating" value="${item?.rating || ''}" 
                           min="1" max="10" step="0.1" placeholder="От 1 до 10">
                </div>
                <div class="form-group">
                    <label class="form-label">Заметки</label>
                    <textarea class="form-textarea" id="contentNotes">${item?.notes || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="Content.closeContentModal()">Отмена</button>
                    <button type="submit" class="btn-primary">Сохранить</button>
                </div>
            </form>
        `;

        document.getElementById('contentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = contentId || 'content_' + Date.now();
            
            // Get selected genres
            const selectedGenres = Array.from(modalBody.querySelectorAll('.genres-selector input[type="checkbox"]:checked'))
                .map(cb => cb.value);

            Storage.saveContentItem(id, {
                title: document.getElementById('contentTitle').value,
                year: document.getElementById('contentYear').value ? parseInt(document.getElementById('contentYear').value) : null,
                imageUrl: document.getElementById('contentImageUrl').value || null,
                description: document.getElementById('contentDescription').value,
                genres: selectedGenres,
                status: document.getElementById('contentStatus').value,
                rating: document.getElementById('contentRating').value ? parseFloat(document.getElementById('contentRating').value) : null,
                notes: document.getElementById('contentNotes').value,
                type: this.currentType
            });

            this.renderContent();
            this.closeContentModal();
        });

        modal.classList.add('active');
    },

    openContent(contentId) {
        this.showContentModal(contentId);
    },

    getTypeName() {
        const names = {
            [CONFIG.CONTENT_TYPES.MOVIES]: 'фильм',
            [CONFIG.CONTENT_TYPES.BOOKS]: 'книгу',
            [CONFIG.CONTENT_TYPES.SERIES]: 'сериал'
        };
        return names[this.currentType] || 'элемент';
    },

    getTypeIcon() {
        const icons = {
            [CONFIG.CONTENT_TYPES.MOVIES]: 'film',
            [CONFIG.CONTENT_TYPES.BOOKS]: 'book',
            [CONFIG.CONTENT_TYPES.SERIES]: 'tv'
        };
        return icons[this.currentType] || 'file';
    },

    closeContentModal() {
        document.getElementById('contentModal').classList.remove('active');
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
