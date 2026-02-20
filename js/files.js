// Files Management
const Files = {
    init() {
        this.renderFiles();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const uploadBtn = document.getElementById('uploadFile');
        uploadBtn.addEventListener('click', () => {
            this.showUploadDialog();
        });
    },

    showUploadDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = (e) => {
            Array.from(e.target.files).forEach(file => {
                this.handleFileUpload(file);
            });
        };
        input.click();
    },

    async handleFileUpload(file) {
        const id = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const fileData = {
                name: file.name,
                type: file.type,
                size: file.size,
                data: e.target.result,
                uploadedAt: new Date().toISOString(),
            };

            Storage.saveFile(id, fileData);
            this.renderFiles();
        };
        reader.readAsDataURL(file);
    },

    renderFiles() {
        const filesGrid = document.getElementById('filesGrid');
        const files = Storage.getFiles();
        const fileEntries = Object.entries(files).sort((a, b) => {
            const dateA = new Date(b[1].updatedAt || b[1].uploadedAt || 0);
            const dateB = new Date(a[1].updatedAt || a[1].uploadedAt || 0);
            return dateA - dateB;
        });

        if (fileEntries.length === 0) {
            filesGrid.innerHTML = '<div class="empty-state">Нет загруженных файлов</div>';
            return;
        }

        filesGrid.innerHTML = fileEntries.map(([id, file]) => {
            const icon = this.getFileIcon(file.type);
            return `
                <div class="file-card" onclick="Files.openFile('${id}')">
                    <div class="file-icon">${icon}</div>
                    <div class="file-name">${this.escapeHtml(file.name)}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">
                        ${this.formatFileSize(file.size)}
                    </div>
                </div>
            `;
        }).join('');
    },

    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) {
            return '<i class="fas fa-image"></i>';
        } else if (mimeType.startsWith('video/')) {
            return '<i class="fas fa-video"></i>';
        } else if (mimeType.startsWith('audio/')) {
            return '<i class="fas fa-music"></i>';
        } else if (mimeType.includes('pdf')) {
            return '<i class="fas fa-file-pdf"></i>';
        } else if (mimeType.includes('word') || mimeType.includes('document')) {
            return '<i class="fas fa-file-word"></i>';
        } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
            return '<i class="fas fa-file-excel"></i>';
        } else {
            return '<i class="fas fa-file"></i>';
        }
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    openFile(id) {
        const file = Storage.getFile(id);
        if (!file) return;

        // For images, show in modal
        if (file.type.startsWith('image/')) {
            this.showImageModal(file);
        } else {
            // For other files, try to download/open
            const link = document.createElement('a');
            link.href = file.data;
            link.download = file.name;
            link.click();
        }
    },

    showImageModal(file) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <img src="${file.data}" alt="${this.escapeHtml(file.name)}" 
                 style="max-width: 100%; max-height: 70vh; border-radius: 8px;">
            <h3 style="margin-top: 1rem;">${this.escapeHtml(file.name)}</h3>
        `;
        modal.classList.add('active');

        modal.querySelector('.modal-close').onclick = () => {
            modal.classList.remove('active');
        };
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
