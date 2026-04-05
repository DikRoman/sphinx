/**
 * Ascension — RPG UI самообучения
 */
const RPGApp = {
    state: null,

    init() {
        this.state = RPGData.load();
        window.addEventListener('hashchange', () => this.route());
        document.getElementById('rpgModalClose')?.addEventListener('click', () => this.closeModal());
        document.getElementById('rpgModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'rpgModal') this.closeModal();
        });
        this.route();
    },

    route() {
        const h = (location.hash || '#/').replace(/^#\/?/, '') || '';
        const [page, id] = h.split('/');
        const p = page || 'sanctum';
        document.querySelectorAll('.rpg-nav a').forEach(a => {
            a.classList.toggle('active', (a.dataset.page || '') === p);
        });
        const main = document.getElementById('rpgMain');
        if (!main) return;
        if (p === 'sanctum') main.innerHTML = this.viewSanctum();
        else if (p === 'skills') main.innerHTML = this.viewSkills();
        else if (p === 'courses') main.innerHTML = this.viewCourses(id);
        else if (p === 'books') main.innerHTML = this.viewBooks();
        else if (p === 'charts') main.innerHTML = this.viewCharts();
        else main.innerHTML = this.viewSanctum();
        this.bindPage(p, id);
    },

    go(hash) {
        location.hash = hash.startsWith('#') ? hash : '#' + hash;
    },

    esc(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    },

    viewSanctum() {
        const h = this.state.hero;
        const pct = Math.min(100, Math.round((h.xpCurrent / Math.max(1, h.xpToNext)) * 100));
        const skillsTop = [...this.state.skills].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 4);
        const recent = this.state.log.slice(0, 8);
        const activeCourses = this.state.courses.filter(c => c.lessons.some(l => !l.done)).length;
        const booksReading = this.state.books.filter(b => b.progress > 0 && b.progress < 100).length;

        return `
            <div class="rpg-hero-grid">
                <section class="rpg-panel rpg-hero-card">
                    <div class="rpg-hero-portrait">${this.esc(h.portrait)}</div>
                    <div class="rpg-hero-info">
                        <h1 class="rpg-hero-name">${this.esc(h.name)}</h1>
                        <p class="rpg-hero-epithet">${this.esc(h.epithet)}</p>
                        <div class="rpg-level-row">
                            <span class="rpg-level-badge">Ур. ${h.level}</span>
                            <div class="rpg-xp-bar-wrap">
                                <div class="rpg-xp-bar" style="width:${pct}%"></div>
                            </div>
                            <span class="rpg-xp-text">${h.xpCurrent} / ${h.xpToNext} XP</span>
                        </div>
                        <button type="button" class="rpg-btn rpg-btn-ghost" data-edit-hero><i class="fas fa-pen"></i> Профиль героя</button>
                    </div>
                </section>
                <section class="rpg-panel rpg-stats-quick">
                    <h2 class="rpg-panel-title"><i class="fas fa-bolt"></i> Сводка</h2>
                    <div class="rpg-stat-pills">
                        <div class="rpg-pill"><span>${this.state.courses.length}</span> курсов</div>
                        <div class="rpg-pill rpg-pill-gold"><span>${activeCourses}</span> в работе</div>
                        <div class="rpg-pill"><span>${this.state.books.length}</span> книг</div>
                        <div class="rpg-pill"><span>${booksReading}</span> читаю</div>
                    </div>
                    <h3 class="rpg-subtitle">Топ навыков</h3>
                    <ul class="rpg-mini-skills">
                        ${skillsTop.map(s => `
                            <li><i class="fas ${this.esc(s.icon)}"></i> ${this.esc(s.name)}
                                <em>${RPGData.skillLevel(s.xp)} ур.</em></li>`).join('')}
                    </ul>
                    <a href="#/charts" class="rpg-link-cta">Графики прогресса →</a>
                </section>
            </div>
            <section class="rpg-panel rpg-log-panel">
                <h2 class="rpg-panel-title"><i class="fas fa-scroll"></i> Хроника</h2>
                <ul class="rpg-log-list">
                    ${recent.length ? recent.map(e => `
                        <li><time>${new Date(e.at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
                            <span>${this.esc(e.message)}</span>
                            ${e.xp ? `<b>+${e.xp} XP</b>` : ''}</li>`).join('')
                        : '<li class="rpg-empty-inline">Пока тихо. Завершите урок или отметьте прогресс по книге.</li>'}
                </ul>
            </section>`;
    },

    viewSkills() {
        return `
            <section class="rpg-panel">
                <h2 class="rpg-panel-title"><i class="fas fa-dragon"></i> Древо умений</h2>
                <p class="rpg-lead">Каждый завершённый урок и глава качают связанные навыки. Уровень навыка растёт от накопленного XP.</p>
                <div class="rpg-skills-grid">
                    ${this.state.skills.map(s => {
                        const lv = RPGData.skillLevel(s.xp);
                        const inLv = RPGData.xpInCurrentSkillLevel(s.xp);
                        const need = RPGData.xpForNextSkillLevel(s.xp);
                        const bar = Math.min(100, Math.round((inLv / (inLv + need)) * 100));
                        return `
                        <article class="rpg-skill-card" style="--skill:${s.color}">
                            <header><i class="fas ${this.esc(s.icon)}"></i><h3>${this.esc(s.name)}</h3></header>
                            <div class="rpg-skill-lv">Уровень ${lv}</div>
                            <div class="rpg-skill-xp-bar"><div style="width:${bar}%"></div></div>
                            <footer>${inLv} / ${inLv + need} XP в уровне</footer>
                        </article>`;
                    }).join('')}
                </div>
            </section>`;
    },

    viewCourses(detailId) {
        if (detailId) {
            const c = this.state.courses.find(x => x.id === detailId);
            if (!c) return `<p class="rpg-lead">Курс не найден. <a href="#/courses">← назад</a></p>`;
            const skillNames = c.skillIds.map(id => this.state.skills.find(s => s.id === id)?.name).filter(Boolean).join(', ');
            return `
                <div class="rpg-breadcrumb"><a href="#/courses">Курсы</a> <span>/</span> ${this.esc(c.title)}</div>
                <section class="rpg-panel">
                    <h2 class="rpg-panel-title">${this.esc(c.title)}</h2>
                    ${c.provider ? `<p class="rpg-meta">${this.esc(c.provider)}</p>` : ''}
                    ${skillNames ? `<p class="rpg-tags">Навыки: ${this.esc(skillNames)}</p>` : ''}
                    <div class="rpg-actions-row">
                        <button type="button" class="rpg-btn rpg-btn-primary" data-add-lesson="${this.esc(c.id)}"><i class="fas fa-plus"></i> Урок</button>
                        <button type="button" class="rpg-btn rpg-btn-danger" data-del-course="${this.esc(c.id)}"><i class="fas fa-trash"></i></button>
                    </div>
                    <ul class="rpg-lesson-list">
                        ${c.lessons.length ? c.lessons.map(l => `
                            <li class="${l.done ? 'done' : ''}">
                                <button type="button" class="rpg-lesson-check" data-complete="${this.esc(c.id)}" data-lesson="${this.esc(l.id)}"
                                    ${l.done ? 'disabled' : ''} title="Засчитать урок">
                                    <i class="fas fa-check"></i>
                                </button>
                                <span>${this.esc(l.title)}</span>
                                <span class="rpg-lesson-xp">+${l.xpReward || 25} XP</span>
                            </li>`).join('')
                            : '<li class="rpg-empty-inline">Добавьте уроки — они станут вашим квест-логом.</li>'}
                    </ul>
                </section>`;
        }
        return `
            <section class="rpg-panel">
                <div class="rpg-panel-head">
                    <h2 class="rpg-panel-title"><i class="fas fa-graduation-cap"></i> Курсы и треки</h2>
                    <button type="button" class="rpg-btn rpg-btn-primary" data-open-modal="course"><i class="fas fa-plus"></i> Новый курс</button>
                </div>
                <div class="rpg-course-cards">
                    ${this.state.courses.length ? this.state.courses.map(c => {
                        const done = c.lessons.filter(l => l.done).length;
                        const total = c.lessons.length;
                        const pct = total ? Math.round(done / total * 100) : 0;
                        return `
                        <a href="#/courses/${c.id}" class="rpg-course-card">
                            <h3>${this.esc(c.title)}</h3>
                            ${c.provider ? `<p>${this.esc(c.provider)}</p>` : ''}
                            <div class="rpg-course-progress"><div style="width:${pct}%"></div></div>
                            <footer>${done} / ${total} уроков</footer>
                        </a>`;
                    }).join('') : '<p class="rpg-lead">Пока нет курсов. Создайте трек: книга, онлайн-курс, свой план.</p>'}
                </div>
            </section>`;
    },

    viewBooks() {
        return `
            <section class="rpg-panel">
                <div class="rpg-panel-head">
                    <h2 class="rpg-panel-title"><i class="fas fa-book-skull"></i> Библиотека</h2>
                    <button type="button" class="rpg-btn rpg-btn-primary" data-open-modal="book"><i class="fas fa-plus"></i> Книга</button>
                </div>
                <div class="rpg-book-list">
                    ${this.state.books.length ? this.state.books.map(b => `
                        <article class="rpg-book-card">
                            <div>
                                <h3>${this.esc(b.title)}</h3>
                                ${b.author ? `<p class="rpg-meta">${this.esc(b.author)}</p>` : ''}
                            </div>
                            <label class="rpg-book-progress-label">
                                <span>${b.progress}%</span>
                                <input type="range" min="0" max="100" value="${b.progress}" data-book-progress="${this.esc(b.id)}">
                            </label>
                            <button type="button" class="rpg-btn rpg-btn-danger rpg-btn-icon" data-del-book="${this.esc(b.id)}" title="Удалить"><i class="fas fa-times"></i></button>
                        </article>`).join('')
                        : '<p class="rpg-lead">Добавьте книгу и двигайте ползунок — герой и навыки получают XP за прогресс.</p>'}
                </div>
            </section>`;
    },

    viewCharts() {
        const week = RPGData.weeklyXp(this.state);
        const maxW = Math.max(1, ...week.map(([, v]) => v));
        const skills = this.state.skills;
        const n = skills.length;
        const cx = 160, cy = 160, r = 110;
        const pts = skills.map((s, i) => {
            const v = Math.min(1, (s.xp || 0) / 600);
            const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
            return [cx + r * v * Math.cos(ang), cy + r * v * Math.sin(ang)];
        });
        const poly = pts.map(p => p.join(',')).join(' ');

        return `
            <div class="rpg-charts-grid">
                <section class="rpg-panel">
                    <h2 class="rpg-panel-title"><i class="fas fa-chart-column"></i> XP за 7 дней</h2>
                    <div class="rpg-bar-chart">
                        ${week.map(([day, val]) => `
                            <div class="rpg-bar-col" title="${day}: ${val} XP">
                                <div class="rpg-bar-fill" style="height:${Math.round(val / maxW * 100)}%"></div>
                                <span>${day.slice(8)}</span>
                            </div>`).join('')}
                    </div>
                </section>
                <section class="rpg-panel rpg-radar-panel">
                    <h2 class="rpg-panel-title"><i class="fas fa-chess-rook"></i> Профиль навыков</h2>
                    <div class="rpg-radar-wrap">
                        <svg class="rpg-radar" viewBox="0 0 320 320" aria-hidden="true">
                            <polygon class="rpg-radar-grid" points="${skills.map((_, i) => {
                                const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
                                return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)].join(',');
                            }).join(' ')}" />
                            <polygon class="rpg-radar-fill" points="${poly}" />
                            ${skills.map((s, i) => {
                                const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
                                const lx = cx + (r + 28) * Math.cos(ang);
                                const ly = cy + (r + 28) * Math.sin(ang);
                                return `<text x="${lx}" y="${ly}" class="rpg-radar-label" text-anchor="middle">${this.esc(s.name.split(' ')[0])}</text>`;
                            }).join('')}
                        </svg>
                    </div>
                    <p class="rpg-hint">Чем больше XP в навыке, тем дальше вершина от центра (макс. норма ~600 XP).</p>
                </section>
            </div>`;
    },

    bindPage(page, id) {
        document.querySelector('[data-edit-hero]')?.addEventListener('click', () => this.openHeroModal());
        document.querySelector('[data-open-modal="course"]')?.addEventListener('click', () => this.openCourseModal());
        document.querySelector('[data-open-modal="book"]')?.addEventListener('click', () => this.openBookModal());
        document.querySelectorAll('[data-add-lesson]').forEach(btn => {
            btn.addEventListener('click', () => this.openLessonModal(btn.dataset.addLesson));
        });
        document.querySelectorAll('[data-complete]').forEach(btn => {
            btn.addEventListener('click', () => {
                RPGData.completeLesson(this.state, btn.dataset.complete, btn.dataset.lesson);
                this.route();
            });
        });
        document.querySelectorAll('[data-del-course]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Удалить курс и все уроки?')) {
                    RPGData.deleteCourse(this.state, btn.dataset.delCourse);
                    this.go('#/courses');
                }
            });
        });
        document.querySelectorAll('[data-book-progress]').forEach(inp => {
            inp.addEventListener('change', () => {
                RPGData.setBookProgress(this.state, inp.dataset.bookProgress, parseInt(inp.value, 10));
                this.route();
            });
        });
        document.querySelectorAll('[data-del-book]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Убрать книгу из списка?')) {
                    RPGData.deleteBook(this.state, btn.dataset.delBook);
                    this.route();
                }
            });
        });
    },

    openModal(title, bodyHtml) {
        const m = document.getElementById('rpgModal');
        document.getElementById('rpgModalTitle').textContent = title;
        document.getElementById('rpgModalBody').innerHTML = bodyHtml;
        m.classList.add('active');
    },

    closeModal() {
        document.getElementById('rpgModal')?.classList.remove('active');
    },

    openHeroModal() {
        const h = this.state.hero;
        this.openModal('Герой', `
            <form class="rpg-form" id="rpgHeroForm">
                <label>Портрет (эмодзи)</label>
                <input name="portrait" class="rpg-input" value="${this.esc(h.portrait)}" maxlength="8">
                <label>Имя</label>
                <input name="name" class="rpg-input" value="${this.esc(h.name)}" required>
                <label>Эпитет</label>
                <input name="epithet" class="rpg-input" value="${this.esc(h.epithet)}">
                <button type="submit" class="rpg-btn rpg-btn-primary">Сохранить</button>
            </form>`);
        document.getElementById('rpgHeroForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            RPGData.updateHero(this.state, {
                portrait: (fd.get('portrait') || '⚔️').trim(),
                name: (fd.get('name') || '').trim(),
                epithet: (fd.get('epithet') || '').trim()
            });
            this.closeModal();
            this.route();
        });
    },

    openCourseModal() {
        const opts = this.state.skills.map(s =>
            `<label class="rpg-check"><input type="checkbox" name="sk" value="${this.esc(s.id)}"> ${this.esc(s.name)}</label>`).join('');
        this.openModal('Новый курс', `
            <form class="rpg-form" id="rpgCourseForm">
                <label>Название</label>
                <input name="title" class="rpg-input" required placeholder="Напр. CS50, Kubernetes…">
                <label>Платформа / автор</label>
                <input name="provider" class="rpg-input" placeholder="Coursera, YouTube…">
                <label>Качаем навыки</label>
                <div class="rpg-check-group">${opts}</div>
                <button type="submit" class="rpg-btn rpg-btn-primary">Создать</button>
            </form>`);
        document.getElementById('rpgCourseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const ids = [...e.target.querySelectorAll('input[name="sk"]:checked')].map(x => x.value);
            RPGData.addCourse(this.state, {
                title: fd.get('title'),
                provider: fd.get('provider'),
                skillIds: ids
            });
            this.closeModal();
            this.route();
        });
    },

    openLessonModal(courseId) {
        this.openModal('Новый урок', `
            <form class="rpg-form" id="rpgLessonForm">
                <label>Название урока / модуля</label>
                <input name="title" class="rpg-input" required>
                <label>Награда XP</label>
                <input name="xp" type="number" class="rpg-input" value="25" min="5" max="500">
                <button type="submit" class="rpg-btn rpg-btn-primary">Добавить</button>
            </form>`);
        document.getElementById('rpgLessonForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            RPGData.addLesson(this.state, courseId, fd.get('title'), fd.get('xp'));
            this.closeModal();
            this.go('#/courses/' + courseId);
        });
    },

    openBookModal() {
        const opts = this.state.skills.map(s =>
            `<label class="rpg-check"><input type="checkbox" name="sk" value="${this.esc(s.id)}"> ${this.esc(s.name)}</label>`).join('');
        this.openModal('Новая книга', `
            <form class="rpg-form" id="rpgBookForm">
                <label>Название</label>
                <input name="title" class="rpg-input" required>
                <label>Автор</label>
                <input name="author" class="rpg-input">
                <label>Связанные навыки</label>
                <div class="rpg-check-group">${opts}</div>
                <button type="submit" class="rpg-btn rpg-btn-primary">В библиотеку</button>
            </form>`);
        document.getElementById('rpgBookForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const ids = [...e.target.querySelectorAll('input[name="sk"]:checked')].map(x => x.value);
            RPGData.addBook(this.state, {
                title: fd.get('title'),
                author: fd.get('author'),
                skillIds: ids
            });
            this.closeModal();
            this.route();
        });
    }
};

document.addEventListener('DOMContentLoaded', () => RPGApp.init());
