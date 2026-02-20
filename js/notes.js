// Notes Management
const Notes = {
    init() {
        if (document.getElementById('notesContainer')) {
            this.renderNotes();
        }
        this.setupEventListeners();
    },

    setupEventListeners() {
        document.getElementById('addNote')?.addEventListener('click', () => {
            this.showNoteModal();
        });
        document.getElementById('switchToStickyNotes')?.addEventListener('click', () => {
            if (typeof Router !== 'undefined') Router.navigate('#sticky-notes');
        });
    },

    renderNotes() {
        const container = document.getElementById('notesContainer');
        if (!container) return;
        const notes = Storage.getNotes();
        const noteEntries = Object.values(notes).sort((a, b) => {
            return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
        });

        if (noteEntries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sticky-note"></i>
                    <h3>Нет заметок</h3>
                    <p>Создайте свою первую заметку</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="notes-grid">
                ${noteEntries.map(note => this.createNoteCard(note)).join('')}
            </div>
        `;
    },

    createNoteCard(note) {
        const blocks = note.blocks || [];
        return `
            <div class="note-card" onclick="Notes.openNote('${note.id}')">
                <div class="note-header">
                    <h3 class="note-title">${this.escapeHtml(note.title || 'Без названия')}</h3>
                    <div class="note-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); Notes.showNoteModal('${note.id}')" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation(); Notes.deleteNote('${note.id}')" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="note-content-preview">
                    ${blocks.slice(0, 3).map(block => this.renderBlockPreview(block)).join('')}
                    ${blocks.length > 3 ? `<div class="note-more-blocks">+${blocks.length - 3} блоков</div>` : ''}
                </div>
                <div class="note-footer">
                    <span class="note-date">${this.formatDate(note.updatedAt)}</span>
                </div>
            </div>
        `;
    },

    renderBlockPreview(block) {
        if (block.type === 'text') {
            const text = block.content || '';
            return `<div class="note-block-preview-text">${this.escapeHtml(text.substring(0, 100))}${text.length > 100 ? '...' : ''}</div>`;
        } else if (block.type === 'block') {
            return `<div class="note-block-preview-block">${this.escapeHtml(block.content || '').substring(0, 50)}</div>`;
        }
        return '';
    },

    showNoteModal(noteId = null) {
        const modal = document.getElementById('noteModal');
        const modalBody = document.getElementById('noteModalBody');
        const note = noteId ? Storage.getNotes()[noteId] : null;

        modalBody.innerHTML = `
            <h2 style="margin-bottom: 1.5rem;">${noteId ? 'Редактировать' : 'Создать'} заметку</h2>
            <form id="noteForm">
                <div class="form-group">
                    <label class="form-label">Название</label>
                    <input type="text" class="form-input" id="noteTitle" value="${note?.title || ''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Блоки</label>
                    <div id="noteBlocksContainer" class="note-blocks-container">
                        ${note?.blocks ? note.blocks.map((block, idx) => this.renderBlockEditor(block, idx)).join('') : ''}
                    </div>
                    <button type="button" class="btn-secondary" onclick="Notes.addTextBlock()" style="margin-top: 0.5rem;">
                        <i class="fas fa-plus"></i> Добавить текст
                    </button>
                    <button type="button" class="btn-secondary" onclick="Notes.addBlockBlock()" style="margin-top: 0.5rem;">
                        <i class="fas fa-square"></i> Добавить блок
                    </button>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="Notes.closeNoteModal()">Отмена</button>
                    <button type="submit" class="btn-primary">Сохранить</button>
                </div>
            </form>
        `;

        document.getElementById('noteForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = noteId || 'note_' + Date.now();
            const blocks = [];
            document.querySelectorAll('.note-block-editor').forEach(editor => {
                const type = editor.dataset.blockType;
                const content = editor.querySelector('.note-block-content').value;
                if (content.trim()) {
                    blocks.push({ type, content: content.trim() });
                }
            });

            Storage.saveNote(id, {
                title: document.getElementById('noteTitle').value,
                blocks: blocks
            });

            this.renderNotes();
            this.closeNoteModal();
        });

        modal.classList.add('active');
    },

    renderBlockEditor(block, index) {
        const blockId = `block_${index || Date.now()}`;
        return `
            <div class="note-block-editor" data-block-type="${block.type || 'text'}" data-block-id="${blockId}">
                <div class="note-block-header">
                    <span class="note-block-type">${block.type === 'block' ? 'Блок' : 'Текст'}</span>
                    <button type="button" class="btn-icon" onclick="Notes.removeBlock('${blockId}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <textarea class="note-block-content form-textarea" 
                          style="min-height: ${block.type === 'block' ? '80px' : '60px'}; width: 100%;">${this.escapeHtml(block.content || '')}</textarea>
            </div>
        `;
    },

    addTextBlock() {
        const container = document.getElementById('noteBlocksContainer');
        const blockId = `block_${Date.now()}`;
        const blockHtml = this.renderBlockEditor({ type: 'text', content: '' }, blockId);
        container.insertAdjacentHTML('beforeend', blockHtml);
    },

    addBlockBlock() {
        const container = document.getElementById('noteBlocksContainer');
        const blockId = `block_${Date.now()}`;
        const blockHtml = this.renderBlockEditor({ type: 'block', content: '' }, blockId);
        container.insertAdjacentHTML('beforeend', blockHtml);
    },

    removeBlock(blockId) {
        const block = document.querySelector(`[data-block-id="${blockId}"]`);
        if (block) {
            block.remove();
        }
    },

    openNote(noteId) {
        this.showNoteModal(noteId);
    },

    deleteNote(noteId) {
        if (confirm('Удалить эту заметку?')) {
            Storage.deleteNote(noteId);
            this.renderNotes();
        }
    },

    closeNoteModal() {
        document.getElementById('noteModal').classList.remove('active');
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
