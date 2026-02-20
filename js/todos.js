// Todos Management
const Todos = {
    init() {
        this.renderTodos();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const newTodoListBtn = document.getElementById('newTodoList');
        newTodoListBtn.addEventListener('click', () => {
            this.createNewTodoList();
        });
    },

    createNewTodoList() {
        const id = 'todo_' + Date.now();
        const todoList = {
            title: 'Новый список',
            items: [],
            createdAt: new Date().toISOString(),
        };

        Storage.saveTodoList(id, todoList);
        this.renderTodos();
    },

    renderTodos() {
        const todosList = document.getElementById('todosList');
        const todos = Storage.getTodos();
        const todoEntries = Object.entries(todos).sort((a, b) => {
            const dateA = new Date(b[1].updatedAt || b[1].createdAt || 0);
            const dateB = new Date(a[1].updatedAt || a[1].createdAt || 0);
            return dateA - dateB;
        });

        if (todoEntries.length === 0) {
            todosList.innerHTML = '<div class="empty-state">Нет todo листов. Создайте новый!</div>';
            return;
        }

        todosList.innerHTML = todoEntries.map(([id, todoList]) => `
            <div class="todo-list-card">
                <div class="todo-list-header">
                    <input type="text" class="todo-list-title" value="${this.escapeHtml(todoList.title)}" 
                           onchange="Todos.updateTodoListTitle('${id}', this.value)">
                    <button class="btn-icon" onclick="Todos.deleteTodoList('${id}')" title="Удалить список">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="todo-items" id="todoItems_${id}">
                    ${this.renderTodoItems(id, todoList.items)}
                </div>
                <input type="text" class="add-todo-input" placeholder="Добавить задачу..." 
                       onkeypress="Todos.handleAddTodo(event, '${id}')">
            </div>
        `).join('');
    },

    renderTodoItems(listId, items) {
        if (items.length === 0) {
            return '<div class="empty-state" style="padding: 1rem; font-size: 0.9rem;">Нет задач</div>';
        }

        return items.map((item, index) => `
            <div class="todo-item ${item.completed ? 'completed' : ''}">
                <input type="checkbox" ${item.completed ? 'checked' : ''} 
                       onchange="Todos.toggleTodo('${listId}', ${index})">
                <span class="todo-item-text">${this.escapeHtml(item.text)}</span>
                <button class="btn-icon" onclick="Todos.deleteTodo('${listId}', ${index})" title="Удалить">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    },

    updateTodoListTitle(id, title) {
        const todoList = Storage.getTodoList(id);
        if (todoList) {
            Storage.saveTodoList(id, {
                ...todoList,
                title: title.trim() || 'Без названия',
            });
        }
    },

    handleAddTodo(event, listId) {
        if (event.key === 'Enter' && event.target.value.trim()) {
            const todoList = Storage.getTodoList(listId);
            if (todoList) {
                todoList.items.push({
                    text: event.target.value.trim(),
                    completed: false,
                });
                Storage.saveTodoList(listId, todoList);
                this.renderTodos();
                event.target.value = '';
            }
        }
    },

    toggleTodo(listId, index) {
        const todoList = Storage.getTodoList(listId);
        if (todoList && todoList.items[index]) {
            todoList.items[index].completed = !todoList.items[index].completed;
            Storage.saveTodoList(listId, todoList);
            this.renderTodos();
        }
    },

    deleteTodo(listId, index) {
        const todoList = Storage.getTodoList(listId);
        if (todoList && todoList.items[index]) {
            todoList.items.splice(index, 1);
            Storage.saveTodoList(listId, todoList);
            this.renderTodos();
        }
    },

    deleteTodoList(id) {
        if (confirm('Удалить этот todo список?')) {
            Storage.deleteTodoList(id);
            this.renderTodos();
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
