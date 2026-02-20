// Sticky Notes Management
const StickyNotes = {
    notes: {},
    completedNotes: {},
    shapes: {},
    draggedNote: null,
    draggedShape: null,
    dragOffset: { x: 0, y: 0 },
    dragStartClient: { x: 0, y: 0 },
    dragStartPosition: { x: 0, y: 0 },
    zoomLevel: 0.5,
    resizingElement: null,
    resizeHandle: null,
    selectedElements: new Set(), // Выделенные элементы
    selectionBox: null,
    isSelecting: false,
    selectionStart: { x: 0, y: 0 },
    isPanning: false,
    panStart: { x: 0, y: 0 },
    panScrollStart: { x: 0, y: 0 },
    spacePressed: false,

    init() {
        this.loadNotes();
        this.loadCompletedNotes();
        this.loadShapes();
        // Загрузить сохраненный уровень масштаба (по умолчанию 50%)
        const savedZoom = localStorage.getItem('sticky_notes_zoom_level');
        this.zoomLevel = savedZoom ? parseFloat(savedZoom) : 0.5;
        this.setupEventListeners();
        this.setupSelection();
        this.setupBackground();
        this.updateZoomIndicator();
        // setupDragAndDrop будет вызван в renderNotes когда контейнер будет доступен
        // или при первом показе sticky notes view
    },

    setupEventListeners() {
        // Делегирование кликов по панели стикеров (работает даже если панель скрыта при загрузке)
        document.addEventListener('click', (e) => {
            const target = e.target.closest ? e.target.closest('button') : e.target;
            if (!target || !target.id) return;
            
            switch (target.id) {
                case 'addStickyNote':
                    e.preventDefault();
                    e.stopPropagation();
                    this.createNewNote();
                    break;
                case 'addShape':
                    e.preventDefault();
                    e.stopPropagation();
                    this.createNewShape();
                    break;
                case 'stickyZoomIn':
                    e.preventDefault();
                    this.zoomInCentered();
                    break;
                case 'stickyZoomOut':
                    e.preventDefault();
                    this.zoomOutCentered();
                    break;
                case 'stickyZoomReset':
                    e.preventDefault();
                    this.zoomReset();
                    break;
            }
        });
        document.addEventListener('click', (e) => {
            if (e.target.closest('#stickyHeaderTab')) {
                e.preventDefault();
                const header = document.getElementById('stickyBlockHeader');
                if (!header) return;
                header.classList.toggle('collapsed');
                const icon = document.querySelector('#stickyHeaderTab i');
                if (icon) icon.className = header.classList.contains('collapsed') ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
                localStorage.setItem('sticky_header_collapsed', header.classList.contains('collapsed'));
            }
        });

        document.getElementById('stickyNotesBackground')?.addEventListener('change', (e) => {
            this.setBackground(e.target.value);
        });
        // Поддержка колесика мыши для масштабирования с центрированием
        const container = document.getElementById('stickyNotesContainer');
        if (container) {
            container.addEventListener('wheel', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (e.deltaY < 0) {
                        this.zoomInCentered();
                    } else {
                        this.zoomOutCentered();
                    }
                }
            }, { passive: false });
        }
        // Горячие клавиши для масштабирования и pan
        document.addEventListener('keydown', (e) => {
            const stickyView = document.getElementById('stickyNotesView');
            if (!stickyView || !stickyView.classList.contains('active')) return;

            if ((e.ctrlKey || e.metaKey) && e.key === '=') {
                e.preventDefault();
                this.zoomInCentered();
            } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
                e.preventDefault();
                this.zoomOutCentered();
            } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
                e.preventDefault();
                this.zoomReset();
            } else if (e.code === 'Space' && !e.target.matches('textarea, input')) {
                e.preventDefault();
                this.spacePressed = true;
                const container = document.getElementById('stickyNotesContainer');
                if (container) {
                    container.style.cursor = 'grab';
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.spacePressed = false;
                const container = document.getElementById('stickyNotesContainer');
                if (container && !this.isPanning) {
                    container.style.cursor = '';
                }
            }
        });
        
        // Обработка клавиши Delete для удаления выделенных элементов
        document.addEventListener('keydown', (e) => {
            const stickyView = document.getElementById('stickyNotesView');
            if (!stickyView || !stickyView.classList.contains('active')) return;
            
            // Проверяем, что не редактируется текст
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
                // Если в textarea, разрешаем стандартное поведение
                return;
            }
            
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                e.stopPropagation();
                this.deleteSelectedElements();
            }
            
            // Escape для снятия выделения
            if (e.key === 'Escape') {
                e.preventDefault();
                this.clearSelection();
            }
        });
    },

    setupSelection() {
        const container = document.getElementById('stickyNotesContainer');
        if (!container) return;
        
        let isMouseDown = false;
        let startX = 0;
        let startY = 0;
        let startTime = 0;
        let hasMoved = false;
        
        container.addEventListener('mousedown', (e) => {
            // Pan при правой кнопке мыши или пробеле
            if (e.button === 2 || this.spacePressed) {
                e.preventDefault();
                this.isPanning = true;
                this.panStart.x = e.clientX;
                this.panStart.y = e.clientY;
                this.panScrollStart.x = container.scrollLeft;
                this.panScrollStart.y = container.scrollTop;
                container.style.cursor = 'grabbing';
                return;
            }
            
            // Не начинаем выделение если кликнули на элемент или кнопку
            if (e.target.closest('.sticky-note') || 
                e.target.closest('.sticky-shape') || 
                e.target.closest('button') ||
                e.target.closest('.resize-handle')) {
                return;
            }
            
            isMouseDown = true;
            this.isSelecting = true;
            hasMoved = false;
            startTime = Date.now();
            
            const rect = container.getBoundingClientRect();
            const scrollX = container.scrollLeft;
            const scrollY = container.scrollTop;
            
            startX = (e.clientX - rect.left + scrollX) / this.zoomLevel;
            startY = (e.clientY - rect.top + scrollY) / this.zoomLevel;
            
            this.selectionStart = { x: startX, y: startY };
            
            // Создаем selection box
            if (!this.selectionBox) {
                this.selectionBox = document.createElement('div');
                this.selectionBox.className = 'selection-box';
                container.appendChild(this.selectionBox);
            }
            
            this.selectionBox.style.display = 'block';
            this.selectionBox.style.left = `${startX}px`;
            this.selectionBox.style.top = `${startY}px`;
            this.selectionBox.style.width = '0px';
            this.selectionBox.style.height = '0px';
            
            // Снимаем выделение если не зажат Shift
            if (!e.shiftKey) {
                this.clearSelection();
            }
        });
        
        container.addEventListener('mousemove', (e) => {
            if (!isMouseDown || !this.isSelecting) return;
            
            const moved = Math.abs(e.movementX) > 2 || Math.abs(e.movementY) > 2;
            if (moved) {
                hasMoved = true;
            }
            
            const rect = container.getBoundingClientRect();
            const scrollX = container.scrollLeft;
            const scrollY = container.scrollTop;
            
            const currentX = (e.clientX - rect.left + scrollX) / this.zoomLevel;
            const currentY = (e.clientY - rect.top + scrollY) / this.zoomLevel;
            
            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            
            if (this.selectionBox && hasMoved) {
                this.selectionBox.style.left = `${left}px`;
                this.selectionBox.style.top = `${top}px`;
                this.selectionBox.style.width = `${width}px`;
                this.selectionBox.style.height = `${height}px`;
            }
            
            // Выделяем элементы внутри selection box только если мышь двигалась
            if (hasMoved && width > 5 && height > 5) {
                this.selectElementsInBox(left, top, width, height);
            }
        });
        
        container.addEventListener('mouseup', () => {
            if (isMouseDown) {
                isMouseDown = false;
                this.isSelecting = false;
                
                if (this.selectionBox) {
                    // Не скрываем сразу, чтобы пользователь видел что выделено
                    setTimeout(() => {
                        if (this.selectionBox && !this.isSelecting) {
                            this.selectionBox.style.display = 'none';
                        }
                    }, 100);
                }
            }
        });
        
        // Останавливаем выделение при выходе за пределы контейнера
        container.addEventListener('mouseleave', () => {
            if (isMouseDown) {
                isMouseDown = false;
                this.isSelecting = false;
                if (this.selectionBox) {
                    this.selectionBox.style.display = 'none';
                }
            }
        });
    },

    selectElementsInBox(left, top, width, height) {
        const container = document.getElementById('stickyNotesContainer');
        if (!container) return;
        
        const right = left + width;
        const bottom = top + height;
        
        // Проверяем все стикеры
        container.querySelectorAll('.sticky-note').forEach(noteEl => {
            const noteId = noteEl.dataset.noteId;
            if (!noteId) return;
            
            const noteRect = noteEl.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const scrollX = container.scrollLeft;
            const scrollY = container.scrollTop;
            
            const noteLeft = (noteRect.left - containerRect.left + scrollX) / this.zoomLevel;
            const noteTop = (noteRect.top - containerRect.top + scrollY) / this.zoomLevel;
            const noteRight = noteLeft + (noteRect.width / this.zoomLevel);
            const noteBottom = noteTop + (noteRect.height / this.zoomLevel);
            
            // Проверяем пересечение
            const isIntersecting = !(noteRight < left || noteLeft > right || noteBottom < top || noteTop > bottom);
            
            if (isIntersecting) {
                this.selectedElements.add(`note_${noteId}`);
                noteEl.classList.add('selected');
            } else if (!noteEl.classList.contains('dragging')) {
                this.selectedElements.delete(`note_${noteId}`);
                noteEl.classList.remove('selected');
            }
        });
        
        // Проверяем все фигуры
        container.querySelectorAll('.sticky-shape').forEach(shapeEl => {
            const shapeId = shapeEl.dataset.shapeId;
            if (!shapeId) return;
            
            const shapeRect = shapeEl.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const scrollX = container.scrollLeft;
            const scrollY = container.scrollTop;
            
            const shapeLeft = (shapeRect.left - containerRect.left + scrollX) / this.zoomLevel;
            const shapeTop = (shapeRect.top - containerRect.top + scrollY) / this.zoomLevel;
            const shapeRight = shapeLeft + (shapeRect.width / this.zoomLevel);
            const shapeBottom = shapeTop + (shapeRect.height / this.zoomLevel);
            
            // Проверяем пересечение
            const isIntersecting = !(shapeRight < left || shapeLeft > right || shapeBottom < top || shapeTop > bottom);
            
            if (isIntersecting) {
                this.selectedElements.add(`shape_${shapeId}`);
                shapeEl.classList.add('selected');
            } else if (!shapeEl.classList.contains('dragging')) {
                this.selectedElements.delete(`shape_${shapeId}`);
                shapeEl.classList.remove('selected');
            }
        });
    },

    clearSelection() {
        this.selectedElements.clear();
        const container = document.getElementById('stickyNotesContainer');
        if (container) {
            container.querySelectorAll('.selected').forEach(el => {
                el.classList.remove('selected');
            });
        }
    },

    deleteSelectedElements() {
        if (this.selectedElements.size === 0) {
            return;
        }
        
        const count = this.selectedElements.size;
        if (!confirm(`Удалить ${count} выделенных элементов?`)) {
            return;
        }
        
        const toDelete = Array.from(this.selectedElements);
        let deletedNotes = 0;
        let deletedShapes = 0;
        
        toDelete.forEach(id => {
            const parts = id.split('_');
            if (parts.length < 2) return;
            
            const type = parts[0];
            const elementId = parts.slice(1).join('_'); // На случай если ID содержит подчеркивания
            
            if (type === 'note') {
                if (this.notes[elementId]) {
                    delete this.notes[elementId];
                    deletedNotes++;
                }
            } else if (type === 'shape') {
                if (this.shapes[elementId]) {
                    delete this.shapes[elementId];
                    deletedShapes++;
                }
            }
        });
        
        this.saveNotes();
        this.saveShapes();
        this.clearSelection();
        this.renderNotes();
    },

    setupDragAndDrop() {
        const container = document.getElementById('stickyNotesContainer');
        if (!container) return;
        if (container.dataset.dragSetup === 'true') return;

        document.addEventListener('mousemove', (e) => {
            if (this.draggedNote) {
                e.preventDefault();
                const note = this.notes[this.draggedNote];
                if (!note) return;
                
                const dx = (e.clientX - this.dragStartClient.x) / this.zoomLevel;
                const dy = (e.clientY - this.dragStartClient.y) / this.zoomLevel;
                
                const x = this.dragStartPosition.x + dx;
                const y = this.dragStartPosition.y + dy;
                
                const elementWidth = note.width || 230;
                const elementHeight = note.height || 150;
                const containerWidth = container.scrollWidth / this.zoomLevel;
                const containerHeight = container.scrollHeight / this.zoomLevel;
                const maxX = Math.max(0, containerWidth - elementWidth);
                const maxY = Math.max(0, containerHeight - elementHeight);
                
                note.position.x = Math.max(0, Math.min(x, maxX));
                note.position.y = Math.max(0, Math.min(y, maxY));
                
                const noteElement = container.querySelector(`[data-note-id="${note.id}"]`);
                if (noteElement) {
                    noteElement.style.left = `${note.position.x}px`;
                    noteElement.style.top = `${note.position.y}px`;
                }
            } else if (this.draggedShape) {
                e.preventDefault();
                const shape = this.shapes[this.draggedShape];
                if (!shape) return;
                
                const dx = (e.clientX - this.dragStartClient.x) / this.zoomLevel;
                const dy = (e.clientY - this.dragStartClient.y) / this.zoomLevel;
                
                const x = this.dragStartPosition.x + dx;
                const y = this.dragStartPosition.y + dy;
                
                const elementWidth = shape.width || 250;
                const elementHeight = shape.height || 150;
                const containerWidth = container.scrollWidth / this.zoomLevel;
                const containerHeight = container.scrollHeight / this.zoomLevel;
                const maxX = Math.max(0, containerWidth - elementWidth);
                const maxY = Math.max(0, containerHeight - elementHeight);
                
                shape.position.x = Math.max(0, Math.min(x, maxX));
                shape.position.y = Math.max(0, Math.min(y, maxY));
                
                const shapeElement = container.querySelector(`[data-shape-id="${shape.id}"]`);
                if (shapeElement) {
                    shapeElement.style.left = `${shape.position.x}px`;
                    shapeElement.style.top = `${shape.position.y}px`;
                }
            } else if (this.isPanning) {
                e.preventDefault();
                const deltaX = e.clientX - this.panStart.x;
                const deltaY = e.clientY - this.panStart.y;
                
                container.scrollLeft = this.panScrollStart.x - deltaX;
                container.scrollTop = this.panScrollStart.y - deltaY;
            }
        });

        const finishDrag = () => {
            if (this.draggedNote) {
                const note = this.notes[this.draggedNote];
                if (note) {
                    note.updatedAt = new Date().toISOString();
                    this.saveNotes();
                }
                const el = container.querySelector(`[data-note-id="${this.draggedNote}"]`);
                if (el) el.classList.remove('dragging');
                this.draggedNote = null;
            }
            if (this.draggedShape) {
                const shape = this.shapes[this.draggedShape];
                if (shape) {
                    shape.updatedAt = new Date().toISOString();
                    this.saveShapes();
                }
                const el = container.querySelector(`[data-shape-id="${this.draggedShape}"]`);
                if (el) el.classList.remove('dragging');
                this.draggedShape = null;
            }
            if (this.isPanning) {
                this.isPanning = false;
                container.style.cursor = '';
            }
        };

        document.addEventListener('mouseup', finishDrag);
        window.addEventListener('blur', finishDrag);

        // Pan для контейнера (правая кнопка мыши или пробел)
        container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        container.dataset.dragSetup = 'true';
    },

    loadNotes() {
        const saved = localStorage.getItem('sphinx_sticky_notes');
        if (saved) {
            this.notes = JSON.parse(saved);
        }
    },

    saveNotes() {
        localStorage.setItem('sphinx_sticky_notes', JSON.stringify(this.notes));
    },

    loadCompletedNotes() {
        const saved = localStorage.getItem('sphinx_sticky_completed');
        if (saved) {
            this.completedNotes = JSON.parse(saved);
        }
    },

    saveCompletedNotes() {
        localStorage.setItem('sphinx_sticky_completed', JSON.stringify(this.completedNotes));
    },

    loadShapes() {
        const saved = localStorage.getItem('sphinx_sticky_shapes');
        if (saved) {
            this.shapes = JSON.parse(saved);
        }
    },

    saveShapes() {
        localStorage.setItem('sphinx_sticky_shapes', JSON.stringify(this.shapes));
    },

    setupBackground() {
        const bg = localStorage.getItem('sphinx_sticky_notes_background') || 'dark';
        this.applyBackground(bg);
        const sel = document.getElementById('stickyNotesBackground');
        if (sel) sel.value = bg;
    },

    setBackground(bg) {
        localStorage.setItem('sphinx_sticky_notes_background', bg);
        this.applyBackground(bg);
    },

    applyBackground(bg) {
        const container = document.getElementById('stickyNotesContainer');
        if (!container) return;
        container.classList.remove('sticky-bg-dark', 'sticky-bg-light', 'sticky-bg-sandy');
        container.classList.add('sticky-bg-' + (bg || 'dark'));
    },

    createNewNote() {
        const id = 'note_' + Date.now();
        const colors = ['yellow', 'pink', 'green', 'blue', 'orange', 'purple'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Получаем центр видимой области контейнера
        const container = document.getElementById('stickyNotesContainer');
        let centerX = 400;
        let centerY = 300;
        
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const scrollX = container.scrollLeft;
            const scrollY = container.scrollTop;
            
            // Центр видимой области в логических координатах (с учетом zoom и scroll)
            centerX = (containerRect.width / 2 + scrollX) / this.zoomLevel - 115; // половина ширины стикера
            centerY = (containerRect.height / 2 + scrollY) / this.zoomLevel - 75;  // половина высоты стикера
        }
        
        const note = {
            id: id,
            title: 'Новая заметка',
            content: '',
            color: randomColor,
            width: 230,
            height: 150,
            position: {
                x: Math.max(0, centerX),
                y: Math.max(0, centerY)
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.notes[id] = note;
        this.saveNotes();
        this.renderNotes();
        
        // Прокручиваем к новому элементу
        if (container) {
            setTimeout(() => {
                const noteElement = container.querySelector(`[data-note-id="${id}"]`);
                if (noteElement) {
                    noteElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }
            }, 100);
        }
    },

    renderNotes() {
        const container = document.getElementById('stickyNotesContainer');
        if (!container) return;
        
        const totalItems = Object.keys(this.notes).length + Object.keys(this.shapes).length;
        
        if (totalItems === 0) {
            container.innerHTML = `
                <div class="empty-state" style="position: relative; top: 50%; transform: translateY(-50%);">
                    <i class="fas fa-sticky-note" style="font-size: 3rem; opacity: 0.3;"></i>
                    <h3>Нет стикеров</h3>
                    <p>Добавьте свою первую заметку-стикер или фигуру</p>
                </div>
            `;
            this.applyZoom();
            return;
        }

        container.innerHTML = '';
        
        // Рендерим стикеры
        Object.values(this.notes).forEach(note => {
            const noteElement = this.createNoteElement(note);
            container.appendChild(noteElement);
        });

        // Рендерим фигуры
        Object.values(this.shapes).forEach(shape => {
            const shapeElement = this.createShapeElement(shape);
            container.appendChild(shapeElement);
        });

        // Убедиться что drag and drop настроен
        this.setupDragAndDrop();
        this.setupResizeHandles();
        this.applyZoom();
        
        // Восстанавливаем выделение после рендеринга
        this.restoreSelection();
        
        // Убедиться, что панель инструментов видна
        const toolbar = document.querySelector('.sticky-notes-toolbar');
        if (toolbar) {
            toolbar.style.display = 'flex';
            toolbar.style.visibility = 'visible';
            toolbar.style.opacity = '1';
        }
    },

    restoreSelection() {
        const container = document.getElementById('stickyNotesContainer');
        if (!container) return;
        
        this.selectedElements.forEach(id => {
            const [type, elementId] = id.split('_');
            const element = container.querySelector(`[data-${type === 'note' ? 'note' : 'shape'}-id="${elementId}"]`);
            if (element) {
                element.classList.add('selected');
            }
        });
    },

    renderCompletedNotes() {
        const container = document.getElementById('completedStickyNotesContainer');
        if (!container) return;
        
        const completedItems = Object.keys(this.completedNotes).length;
        
        if (completedItems === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle" style="font-size: 3rem; opacity: 0.3;"></i>
                    <h3>Нет выполненных стикеров</h3>
                    <p>Выполненные стикеры будут отображаться здесь</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        
        Object.values(this.completedNotes).forEach(note => {
            const noteElement = this.createCompletedNoteElement(note);
            container.appendChild(noteElement);
        });
    },

    createNoteElement(note) {
        const container = document.getElementById('stickyNotesContainer');
        const div = document.createElement('div');
        div.className = `sticky-note ${note.color}`;
        div.style.left = `${note.position.x}px`;
        div.style.top = `${note.position.y}px`;
        div.style.width = `${note.width || 230}px`;
        div.style.minHeight = `${note.height || 150}px`;
        div.dataset.noteId = note.id;
        div.dataset.type = 'note';
        
        // Сохраняем размеры если их еще нет
        if (!note.width) note.width = 230;
        if (!note.height) note.height = 150;

        div.innerHTML = `
            <div class="sticky-note-header">
                <div class="sticky-note-status-buttons">
                    <button class="sticky-status-btn completed" onclick="event.stopPropagation(); StickyNotes.completeNote('${note.id}')" title="Выполнено">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="sticky-status-btn delete" onclick="event.stopPropagation(); StickyNotes.deleteNote('${note.id}')" title="В корзину">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <textarea class="sticky-note-title" placeholder="Заголовок..." 
                          onblur="StickyNotes.updateNote('${note.id}', 'title', this.value)"
                          onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
                          onmousedown="event.stopPropagation()"
                          >${this.escapeHtml(note.title)}</textarea>
                <div class="sticky-note-actions">
                    <button class="sticky-note-btn" onclick="event.stopPropagation(); StickyNotes.showColorPicker('${note.id}')" title="Изменить цвет">
                        <i class="fas fa-palette"></i>
                    </button>
                    <button class="sticky-note-btn" onclick="event.stopPropagation(); StickyNotes.showSizeControls('${note.id}')" title="Изменить размер">
                        <i class="fas fa-expand-arrows-alt"></i>
                    </button>
                </div>
            </div>
            <textarea class="sticky-note-content" placeholder="Напишите что-нибудь..."
                      onblur="StickyNotes.updateNote('${note.id}', 'content', this.value)"
                      onmousedown="event.stopPropagation()"
                      >${this.escapeHtml(note.content)}</textarea>
            <div class="sticky-note-footer">
                <div class="sticky-note-color-picker" id="colorPicker_${note.id}" style="display: none;">
                    <div class="color-dot yellow ${note.color === 'yellow' ? 'active' : ''}" 
                         onclick="StickyNotes.changeColor('${note.id}', 'yellow')" 
                         style="background: #ffeb3b;"></div>
                    <div class="color-dot pink ${note.color === 'pink' ? 'active' : ''}" 
                         onclick="StickyNotes.changeColor('${note.id}', 'pink')" 
                         style="background: #f8bbd0;"></div>
                    <div class="color-dot green ${note.color === 'green' ? 'active' : ''}" 
                         onclick="StickyNotes.changeColor('${note.id}', 'green')" 
                         style="background: #c5e1a5;"></div>
                    <div class="color-dot blue ${note.color === 'blue' ? 'active' : ''}" 
                         onclick="StickyNotes.changeColor('${note.id}', 'blue')" 
                         style="background: #90caf9;"></div>
                    <div class="color-dot orange ${note.color === 'orange' ? 'active' : ''}" 
                         onclick="StickyNotes.changeColor('${note.id}', 'orange')" 
                         style="background: #ffcc80;"></div>
                    <div class="color-dot purple ${note.color === 'purple' ? 'active' : ''}" 
                         onclick="StickyNotes.changeColor('${note.id}', 'purple')" 
                         style="background: #ce93d8;"></div>
                </div>
                <span style="font-size: 0.65rem; opacity: 0.6;">
                    ${new Date(note.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </span>
            </div>
            <div class="resize-handle" data-element-id="${note.id}" data-element-type="note"></div>
        `;

        // Клик по стикеру для выделения (только если не было перетаскивания)
        let noteClickTime = 0;
        let noteHasDragged = false;
        let noteMouseDownX = 0;
        let noteMouseDownY = 0;

        div.addEventListener('mousedown', (e) => {
            if (!container) return;
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA' || 
                e.target.closest('button') || e.target.closest('.resize-handle')) {
                return;
            }
            if (e.button === 2 || this.spacePressed) return;
            
            noteClickTime = Date.now();
            noteHasDragged = false;
            noteMouseDownX = e.clientX;
            noteMouseDownY = e.clientY;
            
            // Останавливаем выделение при начале перетаскивания
            this.isSelecting = false;
            if (this.selectionBox) {
                this.selectionBox.style.display = 'none';
            }
            
            this.draggedNote = note.id;
            this.draggedShape = null;
            div.classList.add('dragging');
            container.appendChild(div);
            
            this.dragStartClient.x = e.clientX;
            this.dragStartClient.y = e.clientY;
            const cr = container.getBoundingClientRect();
            const er = div.getBoundingClientRect();
            this.dragStartPosition.x = (er.left - cr.left + container.scrollLeft) / this.zoomLevel;
            this.dragStartPosition.y = (er.top - cr.top + container.scrollTop) / this.zoomLevel;
            note.position.x = this.dragStartPosition.x;
            note.position.y = this.dragStartPosition.y;
            
            e.preventDefault();
        });
        
        div.addEventListener('click', (e) => {
            // Не выделяем если кликнули на кнопку или textarea
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA' || e.target.closest('button')) {
                return;
            }
            
            // Не выделяем если был drag
            if (noteHasDragged) {
                noteHasDragged = false;
                return;
            }
            
            const movedDistance = Math.abs(e.clientX - noteMouseDownX) + Math.abs(e.clientY - noteMouseDownY);
            const timeSinceMouseDown = Date.now() - noteClickTime;
            
            if (movedDistance > 5 || timeSinceMouseDown > 300) {
                return;
            }
            
            if (e.shiftKey) {
                if (this.selectedElements.has(`note_${note.id}`)) {
                    this.selectedElements.delete(`note_${note.id}`);
                    div.classList.remove('selected');
                } else {
                    this.selectedElements.add(`note_${note.id}`);
                    div.classList.add('selected');
                }
            } else {
                this.clearSelection();
                this.selectedElements.add(`note_${note.id}`);
                div.classList.add('selected');
            }
        });

        // Отслеживание движения мыши для определения drag
        div.addEventListener('mousemove', (e) => {
            if (this.draggedNote === note.id) {
                const movedDistance = Math.abs(e.clientX - noteMouseDownX) + Math.abs(e.clientY - noteMouseDownY);
                if (movedDistance > 5) {
                    noteHasDragged = true;
                }
            }
        });

        div.addEventListener('mouseup', () => {
            if (this.draggedNote === note.id) {
                div.classList.remove('dragging');
            }
        });

        return div;
    },

    updateNote(id, field, value) {
        if (this.notes[id]) {
            this.notes[id][field] = value;
            this.notes[id].updatedAt = new Date().toISOString();
            this.saveNotes();
        }
    },

    changeColor(id, color) {
        if (this.notes[id]) {
            this.notes[id].color = color;
            this.notes[id].updatedAt = new Date().toISOString();
            this.saveNotes();
            this.renderNotes();
        }
    },

    showColorPicker(id) {
        const picker = document.getElementById(`colorPicker_${id}`);
        if (picker) {
            // Hide all other pickers
            document.querySelectorAll('.sticky-note-color-picker').forEach(p => {
                if (p.id !== `colorPicker_${id}`) {
                    p.style.display = 'none';
                }
            });
            picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
        }
    },

    completeNote(id) {
        if (this.notes[id]) {
            const note = this.notes[id];
            note.completedAt = new Date().toISOString();
            this.completedNotes[id] = note;
            delete this.notes[id];
            this.saveNotes();
            this.saveCompletedNotes();
            this.renderNotes();
            this.renderCompletedNotes();
        }
    },

    deleteNote(id) {
        if (confirm('Удалить эту заметку?')) {
            delete this.notes[id];
            this.saveNotes();
            this.renderNotes();
        }
    },

    createCompletedNoteElement(note) {
        const div = document.createElement('div');
        div.className = `sticky-note completed ${note.color}`;
        div.style.width = `${note.width || 230}px`;
        div.style.minHeight = `${note.height || 150}px`;
        div.dataset.noteId = note.id;

        div.innerHTML = `
            <div class="sticky-note-header">
                <div class="sticky-note-status-buttons">
                    <button class="sticky-status-btn restore" onclick="event.stopPropagation(); StickyNotes.restoreNote('${note.id}')" title="Вернуть">
                        <i class="fas fa-undo"></i>
                    </button>
                    <button class="sticky-status-btn delete" onclick="event.stopPropagation(); StickyNotes.deleteCompletedNote('${note.id}')" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="sticky-note-title">${this.escapeHtml(note.title)}</div>
            </div>
            <div class="sticky-note-content">${this.escapeHtml(note.content)}</div>
            <div class="sticky-note-footer">
                <span style="font-size: 0.65rem; opacity: 0.6;">
                    Выполнено: ${new Date(note.completedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </span>
            </div>
        `;

        return div;
    },

    restoreNote(id) {
        if (this.completedNotes[id]) {
            const note = this.completedNotes[id];
            delete note.completedAt;
            this.notes[id] = note;
            delete this.completedNotes[id];
            this.saveNotes();
            this.saveCompletedNotes();
            this.renderNotes();
            this.renderCompletedNotes();
        }
    },

    deleteCompletedNote(id) {
        if (confirm('Удалить эту заметку навсегда?')) {
            delete this.completedNotes[id];
            this.saveCompletedNotes();
            this.renderCompletedNotes();
        }
    },

    createNewShape() {
        const id = 'shape_' + Date.now();
        
        // Получаем центр видимой области контейнера
        const container = document.getElementById('stickyNotesContainer');
        let centerX = 400;
        let centerY = 300;
        
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const scrollX = container.scrollLeft;
            const scrollY = container.scrollTop;
            
            // Центр видимой области в логических координатах (с учетом zoom и scroll)
            centerX = (containerRect.width / 2 + scrollX) / this.zoomLevel - 125; // 125 = половина ширины фигуры
            centerY = (containerRect.height / 2 + scrollY) / this.zoomLevel - 75; // 75 = половина высоты фигуры
        }
        
        const shape = {
            id: id,
            text: '',
            width: 250,
            height: 150,
            position: {
                x: Math.max(0, centerX),
                y: Math.max(0, centerY)
            },
            color: '#ffffff',
            borderColor: '#333333',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.shapes[id] = shape;
        this.saveShapes();
        this.renderNotes();
        
        // Прокручиваем к новому элементу
        if (container) {
            setTimeout(() => {
                const shapeElement = container.querySelector(`[data-shape-id="${id}"]`);
                if (shapeElement) {
                    shapeElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }
            }, 100);
        }
    },

    createShapeElement(shape) {
        const container = document.getElementById('stickyNotesContainer');
        const div = document.createElement('div');
        div.className = 'sticky-shape';
        div.style.left = `${shape.position.x}px`;
        div.style.top = `${shape.position.y}px`;
        div.style.width = `${shape.width}px`;
        div.style.height = `${shape.height}px`;
        div.style.backgroundColor = shape.color || '#ffffff';
        div.style.borderColor = shape.borderColor || '#333333';
        div.dataset.shapeId = shape.id;
        div.dataset.type = 'shape';

        div.innerHTML = `
            <div class="sticky-shape-header">
                <button class="sticky-shape-btn" onclick="event.stopPropagation(); StickyNotes.deleteShape('${shape.id}')" title="Удалить">
                    <i class="fas fa-times"></i>
                </button>
                <button class="sticky-shape-btn" onclick="event.stopPropagation(); StickyNotes.showShapeColorPicker('${shape.id}')" title="Изменить цвет">
                    <i class="fas fa-palette"></i>
                </button>
            </div>
            <textarea class="sticky-shape-content" placeholder="Введите текст..."
                      onblur="StickyNotes.updateShape('${shape.id}', 'text', this.value)"
                      onmousedown="event.stopPropagation()"
                      style="width: 100%; height: calc(100% - 30px); border: none; background: transparent; resize: none; padding: 0.5rem; font-family: inherit; font-size: 0.875rem;">${this.escapeHtml(shape.text || '')}</textarea>
            <div class="sticky-shape-color-picker" id="shapeColorPicker_${shape.id}" style="display: none;">
                <div class="color-dot" onclick="StickyNotes.changeShapeColor('${shape.id}', '#ffffff')" style="background: #ffffff; border: 1px solid #ccc;"></div>
                <div class="color-dot" onclick="StickyNotes.changeShapeColor('${shape.id}', '#ffeb3b')" style="background: #ffeb3b;"></div>
                <div class="color-dot" onclick="StickyNotes.changeShapeColor('${shape.id}', '#f8bbd0')" style="background: #f8bbd0;"></div>
                <div class="color-dot" onclick="StickyNotes.changeShapeColor('${shape.id}', '#c5e1a5')" style="background: #c5e1a5;"></div>
                <div class="color-dot" onclick="StickyNotes.changeShapeColor('${shape.id}', '#90caf9')" style="background: #90caf9;"></div>
                <div class="color-dot" onclick="StickyNotes.changeShapeColor('${shape.id}', '#ffcc80')" style="background: #ffcc80;"></div>
                <div class="color-dot" onclick="StickyNotes.changeShapeColor('${shape.id}', '#ce93d8')" style="background: #ce93d8;"></div>
            </div>
            <div class="resize-handle" data-element-id="${shape.id}" data-element-type="shape"></div>
        `;

        // Клик по фигуре для выделения
        div.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA' || e.target.closest('button')) {
                return;
            }
            
            if (shapeHasDragged) {
                shapeHasDragged = false;
                return;
            }
            
            const movedDistance = Math.abs(e.clientX - shapeMouseDownX) + Math.abs(e.clientY - shapeMouseDownY);
            const timeSinceMouseDown = Date.now() - shapeClickTime;
            
            if (movedDistance > 5 || timeSinceMouseDown > 300) {
                return;
            }
            
            if (e.shiftKey) {
                if (this.selectedElements.has(`shape_${shape.id}`)) {
                    this.selectedElements.delete(`shape_${shape.id}`);
                    div.classList.remove('selected');
                } else {
                    this.selectedElements.add(`shape_${shape.id}`);
                    div.classList.add('selected');
                }
            } else {
                this.clearSelection();
                this.selectedElements.add(`shape_${shape.id}`);
                div.classList.add('selected');
            }
        });

        let shapeClickTime = Date.now();
        let shapeHasDragged = false;
        let shapeMouseDownX = 0;
        let shapeMouseDownY = 0;

        div.addEventListener('mousedown', (e) => {
            if (!container) return;
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA' || 
                e.target.closest('button') || e.target.closest('.resize-handle')) {
                return;
            }
            if (e.button === 2 || this.spacePressed) return;
            
            shapeClickTime = Date.now();
            shapeHasDragged = false;
            shapeMouseDownX = e.clientX;
            shapeMouseDownY = e.clientY;
            
            this.isSelecting = false;
            if (this.selectionBox) {
                this.selectionBox.style.display = 'none';
            }
            
            this.draggedShape = shape.id;
            this.draggedNote = null;
            div.classList.add('dragging');
            container.appendChild(div);
            
            this.dragStartClient.x = e.clientX;
            this.dragStartClient.y = e.clientY;
            const cr = container.getBoundingClientRect();
            const er = div.getBoundingClientRect();
            this.dragStartPosition.x = (er.left - cr.left + container.scrollLeft) / this.zoomLevel;
            this.dragStartPosition.y = (er.top - cr.top + container.scrollTop) / this.zoomLevel;
            shape.position.x = this.dragStartPosition.x;
            shape.position.y = this.dragStartPosition.y;
            
            e.preventDefault();
        });

        div.addEventListener('mousemove', (e) => {
            if (this.draggedShape === shape.id) {
                const movedDistance = Math.abs(e.clientX - shapeMouseDownX) + Math.abs(e.clientY - shapeMouseDownY);
                if (movedDistance > 5) {
                    shapeHasDragged = true;
                }
            }
        });

        div.addEventListener('mouseup', () => {
            if (this.draggedShape === shape.id) {
                div.classList.remove('dragging');
            }
        });

        return div;
    },

    updateShape(id, field, value) {
        if (this.shapes[id]) {
            this.shapes[id][field] = value;
            this.shapes[id].updatedAt = new Date().toISOString();
            this.saveShapes();
        }
    },

    changeShapeColor(id, color) {
        if (this.shapes[id]) {
            this.shapes[id].color = color;
            this.shapes[id].updatedAt = new Date().toISOString();
            this.saveShapes();
            this.renderNotes();
        }
    },

    showShapeColorPicker(id) {
        const picker = document.getElementById(`shapeColorPicker_${id}`);
        if (picker) {
            document.querySelectorAll('.sticky-shape-color-picker').forEach(p => {
                if (p.id !== `shapeColorPicker_${id}`) {
                    p.style.display = 'none';
                }
            });
            picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
        }
    },

    showSizeControls(id) {
        // Показать/скрыть элементы управления размером
        const element = document.querySelector(`[data-note-id="${id}"], [data-shape-id="${id}"]`);
        if (element) {
            element.classList.toggle('resizing-mode');
        }
    },

    deleteShape(id) {
        if (confirm('Удалить эту фигуру?')) {
            delete this.shapes[id];
            this.saveShapes();
            this.renderNotes();
        }
    },

    setupResizeHandles() {
        const handles = document.querySelectorAll('.resize-handle');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const elementId = handle.dataset.elementId;
                const elementType = handle.dataset.elementType;
                this.startResize(elementId, elementType, e);
            });
        });
    },

    startResize(elementId, elementType, e) {
        this.resizingElement = { id: elementId, type: elementType };
        const element = document.querySelector(`[data-${elementType === 'note' ? 'note' : 'shape'}-id="${elementId}"]`);
        if (!element) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = parseInt(element.style.width) || (elementType === 'note' ? 230 : 250);
        const startHeight = parseInt(element.style.minHeight) || parseInt(element.style.height) || (elementType === 'note' ? 150 : 150);
        const startLeft = parseInt(element.style.left);
        const startTop = parseInt(element.style.top);

        const doResize = (e) => {
            const width = startWidth + (e.clientX - startX) / this.zoomLevel;
            const height = startHeight + (e.clientY - startY) / this.zoomLevel;
            
            const minSize = 100;
            const newWidth = Math.max(minSize, width);
            const newHeight = Math.max(minSize, height);

            element.style.width = `${newWidth}px`;
            if (elementType === 'note') {
                element.style.minHeight = `${newHeight}px`;
            } else {
                element.style.height = `${newHeight}px`;
            }
        };

        const stopResize = () => {
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
            
            if (this.resizingElement) {
                const id = this.resizingElement.id;
                const type = this.resizingElement.type;
                const element = document.querySelector(`[data-${type === 'note' ? 'note' : 'shape'}-id="${id}"]`);
                
                if (element) {
                    const width = parseInt(element.style.width);
                    const height = parseInt(element.style.minHeight) || parseInt(element.style.height);
                    
                    if (type === 'note' && this.notes[id]) {
                        this.notes[id].width = width;
                        this.notes[id].height = height;
                        this.saveNotes();
                    } else if (type === 'shape' && this.shapes[id]) {
                        this.shapes[id].width = width;
                        this.shapes[id].height = height;
                        this.saveShapes();
                    }
                }
                
                this.resizingElement = null;
            }
        };

        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
    },

    // Масштабирование
    zoomIn() {
        if (this.zoomLevel < 2.0) {
            this.zoomLevel = Math.min(2.0, this.zoomLevel + 0.1);
            this.applyZoom();
            this.saveZoom();
        }
    },

    // Масштабирование с центрированием на видимой области (как в Miro)
    zoomInCentered() {
        const container = document.getElementById('stickyNotesContainer');
        if (!container) {
            this.zoomIn();
            return;
        }
        
        const oldZoom = this.zoomLevel;
        if (oldZoom >= 2.0) return;
        
        const newZoom = Math.min(2.0, oldZoom + 0.1);
        const zoomFactor = newZoom / oldZoom;
        
        // Сохраняем центр видимой области
        const containerRect = container.getBoundingClientRect();
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
        
        // Текущий scroll
        const scrollX = container.scrollLeft;
        const scrollY = container.scrollTop;
        
        // Новая позиция scroll для сохранения центра
        const newScrollX = (scrollX + centerX) * zoomFactor - centerX;
        const newScrollY = (scrollY + centerY) * zoomFactor - centerY;
        
        this.zoomLevel = newZoom;
        this.applyZoom();
        this.saveZoom();
        
        // Применяем новый scroll
        container.scrollLeft = newScrollX;
        container.scrollTop = newScrollY;
    },

    zoomOutCentered() {
        const container = document.getElementById('stickyNotesContainer');
        if (!container) {
            this.zoomOut();
            return;
        }
        
        const oldZoom = this.zoomLevel;
        if (oldZoom <= 0.1) return;
        
        const newZoom = Math.max(0.1, oldZoom - 0.1);
        const zoomFactor = newZoom / oldZoom;
        
        // Сохраняем центр видимой области
        const containerRect = container.getBoundingClientRect();
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
        
        // Текущий scroll
        const scrollX = container.scrollLeft;
        const scrollY = container.scrollTop;
        
        // Новая позиция scroll для сохранения центра
        const newScrollX = (scrollX + centerX) * zoomFactor - centerX;
        const newScrollY = (scrollY + centerY) * zoomFactor - centerY;
        
        this.zoomLevel = newZoom;
        this.applyZoom();
        this.saveZoom();
        
        // Применяем новый scroll
        container.scrollLeft = newScrollX;
        container.scrollTop = newScrollY;
    },

    zoomOut() {
        if (this.zoomLevel > 0.1) {
            this.zoomLevel = Math.max(0.1, this.zoomLevel - 0.1);
            this.applyZoom();
            this.saveZoom();
        }
    },

    zoomReset() {
        this.zoomLevel = 1.0;
        this.applyZoom();
        this.saveZoom();
    },

    applyZoom() {
        const container = document.getElementById('stickyNotesContainer');
        if (!container) return;
        // Используем CSS zoom для масштабирования всего контейнера
        container.style.zoom = this.zoomLevel;
        this.updateZoomIndicator();
    },

    updateZoomIndicator() {
        const zoomIndicator = document.getElementById('stickyZoomLevel');
        if (zoomIndicator) {
            zoomIndicator.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
    },

    saveZoom() {
        localStorage.setItem('sticky_notes_zoom_level', this.zoomLevel.toString());
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
