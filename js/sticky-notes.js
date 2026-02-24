// Sticky Notes Management
const StickyNotes = {
    CANVAS_SIZE: 20000,
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
    currentTool: 'select', // select | frame
    isDrawingFrame: false,
    frameTempEl: null,
    frameStart: { x: 0, y: 0 },
    pendingBoardClick: null,
    contextMenuEl: null,
    contextMenuState: null,
    gridEnabled: false,

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
        this.loadGridState();
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
                case 'addFrame':
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleFrameTool();
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

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.sticky-bg-btn');
            if (btn && document.getElementById('pageContainer')?.contains(btn)) {
                e.preventDefault();
                const bg = btn.dataset.bg;
                this.setBackground(bg);
                document.querySelectorAll('.sticky-bg-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
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
                this.closeContextMenu();
            }
        });

    },

    toggleFrameTool() {
        const btn = document.getElementById('addFrame');
        const enable = this.currentTool !== 'frame';
        this.currentTool = enable ? 'frame' : 'select';
        if (btn) {
            btn.classList.toggle('active', enable);
        }
    },

    ensureContextMenu() {
        if (this.contextMenuEl) return this.contextMenuEl;
        const el = document.createElement('div');
        el.className = 'sticky-context-menu';
        el.innerHTML = `
            <button class="sticky-context-item" data-action="create-note">Создать стикер здесь</button>
            <button class="sticky-context-item" data-action="reset-view">Сбросить вид</button>
            <button class="sticky-context-item" data-action="toggle-grid">Сетка</button>
        `;
        el.addEventListener('click', (e) => {
            const btn = e.target.closest('.sticky-context-item');
            if (!btn) return;
            const action = btn.dataset.action;
            if (action === 'create-note') {
                if (this.contextMenuState) {
                    this.createNewNoteAt(this.contextMenuState.worldX, this.contextMenuState.worldY);
                }
            } else if (action === 'reset-view') {
                this.zoomReset();
                const container = document.getElementById('stickyNotesContainer');
                if (container) {
                    container.scrollLeft = 0;
                    container.scrollTop = 0;
                }
            } else if (action === 'toggle-grid') {
                this.toggleGrid();
            }
            this.closeContextMenu();
        });
        document.body.appendChild(el);
        this.contextMenuEl = el;
        return el;
    },

    openContextMenu(state) {
        const el = this.ensureContextMenu();
        this.contextMenuState = state;
        el.style.display = 'block';
        el.style.left = `${state.sx}px`;
        el.style.top = `${state.sy}px`;
    },

    closeContextMenu() {
        if (this.contextMenuEl) {
            this.contextMenuEl.style.display = 'none';
        }
        this.contextMenuState = null;
    },

    loadGridState() {
        const saved = localStorage.getItem('sticky_grid_enabled');
        this.gridEnabled = saved === 'true';
        this.applyGrid();
    },

    applyGrid() {
        const container = document.getElementById('stickyNotesContainer');
        if (!container) return;
        const board = container.querySelector('.sticky-notes-board');
        if (!board) return;
        board.classList.toggle('grid', this.gridEnabled);
    },

    toggleGrid() {
        this.gridEnabled = !this.gridEnabled;
        localStorage.setItem('sticky_grid_enabled', this.gridEnabled ? 'true' : 'false');
        this.applyGrid();
    },

    setupSelection() {
        const container = document.getElementById('stickyNotesContainer');
        if (!container) return;
        if (container.dataset.selectionSetup === 'true') return;
        container.dataset.selectionSetup = 'true';
        
        let isMouseDown = false;
        let startX = 0;
        let startY = 0;
        let startTime = 0;
        let hasMoved = false;
        
        container.addEventListener('mousedown', (e) => {
            this.closeContextMenu();
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

            const rect = container.getBoundingClientRect();
            const scrollX = container.scrollLeft;
            const scrollY = container.scrollTop;
            const worldX = (e.clientX - rect.left + scrollX) / this.zoomLevel;
            const worldY = (e.clientY - rect.top + scrollY) / this.zoomLevel;

            // Режим рисования рамки
            if (this.currentTool === 'frame') {
                e.preventDefault();
                this.isDrawingFrame = true;
                this.frameStart.x = worldX;
                this.frameStart.y = worldY;
                if (!this.frameTempEl) {
                    const board = container.querySelector('.sticky-notes-board') || container;
                    this.frameTempEl = document.createElement('div');
                    this.frameTempEl.className = 'sticky-frame-temp';
                    board.appendChild(this.frameTempEl);
                }
                this.frameTempEl.style.display = 'block';
                this.frameTempEl.style.left = `${worldX}px`;
                this.frameTempEl.style.top = `${worldY}px`;
                this.frameTempEl.style.width = '0px';
                this.frameTempEl.style.height = '0px';
                return;
            }

            // Кандидат клика по пустому месту для контекстного меню
            this.pendingBoardClick = {
                sx: e.clientX,
                sy: e.clientY,
                worldX,
                worldY,
                moved: false
            };

            isMouseDown = true;
            this.isSelecting = true;
            hasMoved = false;
            startTime = Date.now();
            startX = worldX;
            startY = worldY;
            
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
            const rect = container.getBoundingClientRect();
            const scrollX = container.scrollLeft;
            const scrollY = container.scrollTop;
            const currentX = (e.clientX - rect.left + scrollX) / this.zoomLevel;
            const currentY = (e.clientY - rect.top + scrollY) / this.zoomLevel;

            // Обновляем статус клика для контекстного меню
            if (this.pendingBoardClick) {
                const dx = e.clientX - this.pendingBoardClick.sx;
                const dy = e.clientY - this.pendingBoardClick.sy;
                if (dx * dx + dy * dy > 25) {
                    this.pendingBoardClick.moved = true;
                }
            }

            // Рисование рамки
            if (this.isDrawingFrame && this.currentTool === 'frame' && this.frameTempEl) {
                const left = Math.min(this.frameStart.x, currentX);
                const top = Math.min(this.frameStart.y, currentY);
                const width = Math.abs(currentX - this.frameStart.x);
                const height = Math.abs(currentY - this.frameStart.y);
                this.frameTempEl.style.left = `${left}px`;
                this.frameTempEl.style.top = `${top}px`;
                this.frameTempEl.style.width = `${width}px`;
                this.frameTempEl.style.height = `${height}px`;
                return;
            }

            if (!isMouseDown || !this.isSelecting) return;
            
            const moved = Math.abs(e.movementX) > 2 || Math.abs(e.movementY) > 2;
            if (moved) {
                hasMoved = true;
            }
            
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
            // Завершение рисования рамки
            if (this.isDrawingFrame && this.currentTool === 'frame') {
                this.isDrawingFrame = false;
                if (this.frameTempEl) {
                    const width = parseFloat(this.frameTempEl.style.width) || 0;
                    const height = parseFloat(this.frameTempEl.style.height) || 0;
                    const left = parseFloat(this.frameTempEl.style.left) || 0;
                    const top = parseFloat(this.frameTempEl.style.top) || 0;
                    this.frameTempEl.style.display = 'none';
                    if (width > 10 && height > 10) {
                        this.createFrameFromRect(left, top, width, height);
                    }
                }
            }

            // Открытие контекстного меню по клику по пустому месту
            if (this.pendingBoardClick) {
                const candidate = this.pendingBoardClick;
                this.pendingBoardClick = null;
                if (!candidate.moved) {
                    setTimeout(() => {
                        this.openContextMenu({
                            sx: candidate.sx,
                            sy: candidate.sy,
                            worldX: candidate.worldX,
                            worldY: candidate.worldY
                        });
                    }, 0);
                }
            }

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

        // Проверяем все стикеры по их логическим координатам (позиция на холсте),
        // чтобы не зависеть от zoom и scroll.
        Object.values(this.notes).forEach(note => {
            const noteEl = container.querySelector(`[data-note-id="${note.id}"]`);
            if (!noteEl || !note.position) return;

            const elW = note.width || 230;
            const elH = note.height || 150;
            const noteLeft = note.position.x;
            const noteTop = note.position.y;
            const noteRight = noteLeft + elW;
            const noteBottom = noteTop + elH;

            const isIntersecting = !(noteRight < left || noteLeft > right || noteBottom < top || noteTop > bottom);

            if (isIntersecting) {
                this.selectedElements.add(`note_${note.id}`);
                noteEl.classList.add('selected');
            } else if (!noteEl.classList.contains('dragging')) {
                this.selectedElements.delete(`note_${note.id}`);
                noteEl.classList.remove('selected');
            }
        });

        // Проверяем все фигуры по их логическим координатам
        Object.values(this.shapes).forEach(shape => {
            const shapeEl = container.querySelector(`[data-shape-id="${shape.id}"]`);
            if (!shapeEl || !shape.position) return;

            const elW = shape.width || 250;
            const elH = shape.height || 150;
            const shapeLeft = shape.position.x;
            const shapeTop = shape.position.y;
            const shapeRight = shapeLeft + elW;
            const shapeBottom = shapeTop + elH;

            const isIntersecting = !(shapeRight < left || shapeLeft > right || shapeBottom < top || shapeTop > bottom);

            if (isIntersecting) {
                this.selectedElements.add(`shape_${shape.id}`);
                shapeEl.classList.add('selected');
            } else if (!shapeEl.classList.contains('dragging')) {
                this.selectedElements.delete(`shape_${shape.id}`);
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
                const elW = note.width || 230;
                const elH = note.height || 150;
                const maxX = Math.max(0, this.CANVAS_SIZE - elW);
                const maxY = Math.max(0, this.CANVAS_SIZE - elH);
                const x = Math.max(0, Math.min(this.dragStartPosition.x + dx, maxX));
                const y = Math.max(0, Math.min(this.dragStartPosition.y + dy, maxY));
                const noteElement = container.querySelector(`[data-note-id="${note.id}"]`);
                if (noteElement) {
                    noteElement.style.left = x + 'px';
                    noteElement.style.top = y + 'px';
                    noteElement.style.transform = '';
                }
                // Автопрокрутка, чтобы камера следовала за стикером
                const EDGE = 80;
                const SPEED = 30;
                const rect = container.getBoundingClientRect();
                if (e.clientX > rect.right - EDGE) {
                    container.scrollLeft += SPEED;
                } else if (e.clientX < rect.left + EDGE) {
                    container.scrollLeft = Math.max(0, container.scrollLeft - SPEED);
                }
                if (e.clientY > rect.bottom - EDGE) {
                    container.scrollTop += SPEED;
                } else if (e.clientY < rect.top + EDGE) {
                    container.scrollTop = Math.max(0, container.scrollTop - SPEED);
                }
            } else if (this.draggedShape) {
                e.preventDefault();
                const shape = this.shapes[this.draggedShape];
                if (!shape) return;
                const dx = (e.clientX - this.dragStartClient.x) / this.zoomLevel;
                const dy = (e.clientY - this.dragStartClient.y) / this.zoomLevel;
                const elW = shape.width || 250;
                const elH = shape.height || 150;
                const maxX = Math.max(0, this.CANVAS_SIZE - elW);
                const maxY = Math.max(0, this.CANVAS_SIZE - elH);
                const x = Math.max(0, Math.min(this.dragStartPosition.x + dx, maxX));
                const y = Math.max(0, Math.min(this.dragStartPosition.y + dy, maxY));
                const shapeElement = container.querySelector(`[data-shape-id="${shape.id}"]`);
                if (shapeElement) {
                    shapeElement.style.left = x + 'px';
                    shapeElement.style.top = y + 'px';
                    shapeElement.style.transform = '';
                }
                // Автопрокрутка для фигур
                const EDGE = 80;
                const SPEED = 30;
                const rect = container.getBoundingClientRect();
                if (e.clientX > rect.right - EDGE) {
                    container.scrollLeft += SPEED;
                } else if (e.clientX < rect.left + EDGE) {
                    container.scrollLeft = Math.max(0, container.scrollLeft - SPEED);
                }
                if (e.clientY > rect.bottom - EDGE) {
                    container.scrollTop += SPEED;
                } else if (e.clientY < rect.top + EDGE) {
                    container.scrollTop = Math.max(0, container.scrollTop - SPEED);
                }
            } else if (this.isPanning) {
                e.preventDefault();
                const deltaX = e.clientX - this.panStart.x;
                const deltaY = e.clientY - this.panStart.y;
                
                container.scrollLeft = this.panScrollStart.x - deltaX;
                container.scrollTop = this.panScrollStart.y - deltaY;
            }
        });

        const finishDrag = (e) => {
            if (this.draggedNote) {
                const note = this.notes[this.draggedNote];
                const el = container.querySelector(`[data-note-id="${this.draggedNote}"]`);
                if (note && el) {
                    const dx = (e?.clientX ?? this.dragStartClient.x) - this.dragStartClient.x;
                    const dy = (e?.clientY ?? this.dragStartClient.y) - this.dragStartClient.y;
                    const moveX = dx / this.zoomLevel;
                    const moveY = dy / this.zoomLevel;
                    const elW = note.width || 230;
                    const elH = note.height || 150;
                    const maxX = Math.max(0, this.CANVAS_SIZE - elW);
                    const maxY = Math.max(0, this.CANVAS_SIZE - elH);
                    note.position.x = Math.max(0, Math.min(this.dragStartPosition.x + moveX, maxX));
                    note.position.y = Math.max(0, Math.min(this.dragStartPosition.y + moveY, maxY));
                    note.updatedAt = new Date().toISOString();
                    el.style.transform = '';
                    el.style.willChange = '';
                    el.style.left = note.position.x + 'px';
                    el.style.top = note.position.y + 'px';
                    this.saveNotes();
                }
                if (el) {
                    el.classList.remove('dragging');
                    el.style.transform = '';
                    el.style.willChange = '';
                }
                this.draggedNote = null;
            }
            if (this.draggedShape) {
                const shape = this.shapes[this.draggedShape];
                const el = container.querySelector(`[data-shape-id="${this.draggedShape}"]`);
                if (shape && el) {
                    const dx = (e?.clientX ?? this.dragStartClient.x) - this.dragStartClient.x;
                    const dy = (e?.clientY ?? this.dragStartClient.y) - this.dragStartClient.y;
                    const moveX = dx / this.zoomLevel;
                    const moveY = dy / this.zoomLevel;
                    const elW = shape.width || 250;
                    const elH = shape.height || 150;
                    const maxX = Math.max(0, this.CANVAS_SIZE - elW);
                    const maxY = Math.max(0, this.CANVAS_SIZE - elH);
                    shape.position.x = Math.max(0, Math.min(this.dragStartPosition.x + moveX, maxX));
                    shape.position.y = Math.max(0, Math.min(this.dragStartPosition.y + moveY, maxY));
                    shape.updatedAt = new Date().toISOString();
                    el.style.transform = '';
                    el.style.willChange = '';
                    el.style.left = shape.position.x + 'px';
                    el.style.top = shape.position.y + 'px';
                    this.saveShapes();
                }
                if (el) {
                    el.classList.remove('dragging');
                    el.style.transform = '';
                    el.style.willChange = '';
                }
                this.draggedShape = null;
            }
            if (this.isPanning) {
                this.isPanning = false;
                container.style.cursor = '';
            }
        };

        document.addEventListener('mouseup', (e) => finishDrag(e));
        window.addEventListener('blur', () => finishDrag(null));

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
        document.querySelectorAll('.sticky-bg-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bg === bg);
        });
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
        const board = document.createElement('div');
        board.className = 'sticky-notes-board';
        container.appendChild(board);

        // Рендерим стикеры на холст
        Object.values(this.notes).forEach(note => {
            const noteElement = this.createNoteElement(note);
            board.appendChild(noteElement);
        });

        // Рендерим фигуры на холст
        Object.values(this.shapes).forEach(shape => {
            const shapeElement = this.createShapeElement(shape);
            board.appendChild(shapeElement);
        });

        // Убедиться что drag and drop настроен
        this.setupDragAndDrop();
        this.setupSelection();
        this.setupResizeHandles();
        this.applyZoom();
        this.applyGrid();
        
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
            const board = container.querySelector('.sticky-notes-board') || container;
            board.appendChild(div);
            
            this.dragStartClient.x = e.clientX;
            this.dragStartClient.y = e.clientY;
            // Берём текущую сохранённую позицию — как в Miro: клик не двигает, только drag
            this.dragStartPosition.x = note.position.x;
            this.dragStartPosition.y = note.position.y;
            
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
                if (movedDistance > 2) {
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

    createFrameFromRect(x, y, width, height) {
        const id = 'frame_' + Date.now();
        const shape = {
            id,
            type: 'frame',
            text: '',
            width,
            height,
            position: {
                x: Math.max(0, x),
                y: Math.max(0, y)
            },
            color: 'transparent',
            borderColor: '#4caf50',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.shapes[id] = shape;
        this.saveShapes();
        this.renderNotes();
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
        const isFrame = shape.type === 'frame';
        div.className = isFrame ? 'sticky-shape sticky-frame' : 'sticky-shape';
        div.style.left = `${shape.position.x}px`;
        div.style.top = `${shape.position.y}px`;
        div.style.width = `${shape.width}px`;
        div.style.height = `${shape.height}px`;
        div.style.backgroundColor = shape.color || '#ffffff';
        div.style.borderColor = shape.borderColor || '#333333';
        div.dataset.shapeId = shape.id;
        div.dataset.type = 'shape';

        if (isFrame) {
            div.innerHTML = `
            <div class="sticky-shape-header">
                <button class="sticky-shape-btn" onclick="event.stopPropagation(); StickyNotes.deleteShape('${shape.id}')" title="Удалить">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            `;
        } else {
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
        }

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
            const board = container.querySelector('.sticky-notes-board') || container;
            board.appendChild(div);
            
            this.dragStartClient.x = e.clientX;
            this.dragStartClient.y = e.clientY;
            this.dragStartPosition.x = shape.position.x;
            this.dragStartPosition.y = shape.position.y;
            
            e.preventDefault();
        });

        div.addEventListener('mousemove', (e) => {
            if (this.draggedShape === shape.id) {
                const movedDistance = Math.abs(e.clientX - shapeMouseDownX) + Math.abs(e.clientY - shapeMouseDownY);
                if (movedDistance > 2) {
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
