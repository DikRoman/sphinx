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
        else if (p === 'inspire') main.innerHTML = this.viewInspire();
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

    /** Безопасная подстановка URL в атрибут src */
    safeUrlAttr(u) {
        return String(u || '').replace(/[\s"'<>`]/g, '');
    },

    /** Радар навыков (компактный, стиль Solo Leveling) */
    radarSvgHTML(skills) {
        const list = skills && skills.length ? skills : [{ name: '—', xp: 0 }];
        const n = list.length;
        const cx = 100;
        const cy = 100;
        const r = 76;
        const ringPoly = ratio => list.map((_, i) => {
            const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
            return `${cx + r * ratio * Math.cos(ang)},${cy + r * ratio * Math.sin(ang)}`;
        }).join(' ');
        const rings = [0.35, 0.65]
            .map(ratio => `<polygon class="sl-radar-ring" fill="none" points="${ringPoly(ratio)}" />`)
            .join('');
        const outerPts = ringPoly(1);
        const pts = list.map((s, i) => {
            const v = Math.min(1, (s.xp || 0) / 600);
            const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
            return [cx + r * v * Math.cos(ang), cy + r * v * Math.sin(ang)];
        });
        const poly = pts.map(p => p.join(',')).join(' ');
        const axes = list.map((_, i) => {
            const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
            const x2 = cx + r * Math.cos(ang);
            const y2 = cy + r * Math.sin(ang);
            return `<line class="sl-radar-axis" x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" />`;
        }).join('');
        const labels = list.map((s, i) => {
            const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
            const lx = cx + (r + 16) * Math.cos(ang);
            const ly = cy + (r + 16) * Math.sin(ang);
            const short = (s.name || '—').split(/\s+/)[0].slice(0, 5);
            return `<text x="${lx}" y="${ly}" class="sl-radar-lbl" text-anchor="middle" dominant-baseline="middle">${this.esc(short)}</text>`;
        }).join('');
        return `<svg class="sl-radar-svg" viewBox="0 0 200 200" aria-hidden="true">${rings}${axes}<polygon class="sl-radar-outer" fill="none" points="${outerPts}" /><polygon class="sl-radar-poly" points="${poly}" />${labels}</svg>`;
    },

    viewSanctum() {
        const h = this.state.hero;
        const pct = Math.min(100, Math.round((h.xpCurrent / Math.max(1, h.xpToNext)) * 100));
        const skills = this.state.skills;
        const recent = this.state.log.slice(0, 7);
        const activeCourses = this.state.courses.filter(c => c.lessons.some(l => !l.done)).length;
        const booksReading = this.state.books.filter(b => b.progress > 0 && b.progress < 100).length;
        const cal = RPGData.calendarActivityCells(this.state, 35);
        const coins = RPGData.metaCurrency(this.state);
        const potions = [...skills].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 6);
        const monthName = new Date().toLocaleString('ru-RU', { month: 'long' });

        return `
            <div class="sl-dashboard">
                <header class="sl-system-banner">
                    <div class="sl-banner-glyph" aria-hidden="true">⬡</div>
                    <div class="sl-banner-center">
                        <span class="sl-oct-label">HABIT TRACKER</span>
                        <h2 class="sl-system-title">ASCENSION <span class="sl-system-word">SYSTEM</span></h2>
                        <p class="sl-system-tagline">${this.esc(h.epithet)}</p>
                    </div>
                    <div class="sl-banner-glyph sl-flip" aria-hidden="true">⬡</div>
                </header>

                <div class="sl-grid">
                    <section class="rpg-panel sl-card sl-profile">
                        <div class="sl-profile-row">
                            <div class="sl-avatar-wrap">
                                <div class="sl-avatar-spikes" aria-hidden="true"></div>
                                <div class="sl-avatar-inner">${this.esc(h.portrait)}</div>
                            </div>
                            <div class="sl-profile-data">
                                <div class="sl-datum"><span class="sl-datum-k">Имя</span><span class="sl-datum-v">${this.esc(h.name)}</span></div>
                                <div class="sl-datum"><span class="sl-datum-k">Уровень</span><span class="sl-datum-v sl-glow-num">${h.level}</span></div>
                                <div class="sl-datum"><span class="sl-datum-k">Очки роста</span><span class="sl-datum-v sl-glow-num">${coins}</span></div>
                                <button type="button" class="rpg-btn rpg-btn-ghost sl-edit-hero" data-edit-hero><i class="fas fa-user-cog"></i> Профиль</button>
                            </div>
                        </div>
                        <div class="sl-bar-block">
                            <span class="sl-bar-label">ОПЫТ</span>
                            <div class="sl-bar-track sl-bar-xp"><div class="sl-bar-fill" style="width:${pct}%"></div></div>
                            <span class="sl-bar-meta">${h.xpCurrent} / ${h.xpToNext} XP</span>
                        </div>
                    </section>

                    <section class="rpg-panel sl-card sl-sync-col">
                        <span class="sl-card-title-sm">СИНХРО</span>
                        <div class="sl-vtrack">
                            <div class="sl-vfill" style="height:${pct}%"></div>
                        </div>
                        <span class="sl-vpct">${pct}%</span>
                    </section>

                    <section class="rpg-panel sl-card sl-radar-block">
                        <h3 class="sl-card-title-sm">ОЧКИ НАВЫКОВ</h3>
                        <div class="sl-radar-host">${this.radarSvgHTML(skills)}</div>
                        <a href="#/charts" class="sl-micro-link">Подробнее →</a>
                    </section>

                    <section class="rpg-panel sl-card sl-status-block">
                        <h3 class="sl-card-title-sm">СТАТУС</h3>
                        <div class="sl-status-list">
                            ${skills.map(s => {
                                const bar = Math.min(100, Math.round(((s.xp || 0) / 600) * 100));
                                const lv = RPGData.skillLevel(s.xp);
                                return `<div class="sl-status-line">
                                    <i class="fas ${this.esc(s.icon)}" style="color:${this.esc(s.color)}"></i>
                                    <span class="sl-st-name">${this.esc(s.name)}</span>
                                    <div class="sl-bar-track sl-bar-fat"><div class="sl-bar-fill" style="width:${bar}%"></div></div>
                                    <span class="sl-st-lv">LV ${lv}</span>
                                </div>`;
                            }).join('')}
                        </div>
                    </section>

                    <section class="rpg-panel sl-card sl-goals-block">
                        <h3 class="sl-card-title-sm">ЦЕЛИ</h3>
                        <div class="sl-goal-pills">
                            <div class="sl-goal-pill"><span>${this.state.courses.length}</span> курсов</div>
                            <div class="sl-goal-pill sl-hot"><span>${activeCourses}</span> в работе</div>
                            <div class="sl-goal-pill"><span>${this.state.books.length}</span> книг</div>
                            <div class="sl-goal-pill"><span>${booksReading}</span> читаю</div>
                        </div>
                    </section>

                    <section class="rpg-panel sl-card sl-cal-block">
                        <h3 class="sl-card-title-sm">${monthName} · активность</h3>
                        <div class="sl-cal-grid">
                            ${cal.map(c => `<div class="sl-cal-cell${c.active ? ' sl-cal-hot' : ''}" title="${this.esc(c.key)}">${c.day}</div>`).join('')}
                        </div>
                    </section>

                    <section class="rpg-panel sl-card sl-log-block">
                        <h3 class="sl-card-title-sm">ЖУРНАЛ СИСТЕМЫ</h3>
                        <ul class="sl-log-compact">
                            ${recent.length ? recent.map(e => `
                                <li><time>${new Date(e.at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
                                <span>${this.esc(e.message)}</span>${e.xp ? `<b>+${e.xp}</b>` : ''}</li>`).join('')
                                : '<li class="sl-log-empty">Завершите урок или сдвиньте прогресс книги — появится запись.</li>'}
                        </ul>
                    </section>
                </div>

                <footer class="sl-inventory">
                    <span class="sl-inv-title">ИНВЕНТАРЬ УСИЛЕНИЙ</span>
                    <div class="sl-potion-row">
                        ${potions.map(s => {
                            const lv = RPGData.skillLevel(s.xp);
                            return `<div class="sl-potion" style="--liq:${this.esc(s.color)}">
                                <div class="sl-potion-glass"><div class="sl-potion-liquid"></div></div>
                                <span class="sl-potion-name">${this.esc(s.name.split(/\s+/)[0])}</span>
                                <span class="sl-potion-lv">LV ${lv}</span>
                            </div>`;
                        }).join('')}
                    </div>
                </footer>
            </div>`;
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

    viewInspire() {
        const items = this.state.inspiration || [];
        return `
            <section class="rpg-panel sl-card insp-board">
                <div class="insp-head">
                    <div>
                        <h2 class="rpg-panel-title"><i class="fas fa-images"></i> Доска вдохновения</h2>
                        <p class="rpg-lead insp-lead">Вставьте ссылку на картинку (jpg, png, webp…) — она появится в рамке «как фото». До 48 снимков, всё хранится локально.</p>
                    </div>
                    <button type="button" class="rpg-btn rpg-btn-primary" data-open-inspire><i class="fas fa-plus"></i> Добавить фото</button>
                </div>
                <div class="insp-cork" aria-hidden="true"></div>
                <div class="insp-grid">
                    ${items.length ? items.map(it => {
                        const tilt = typeof it.tilt === 'number' ? it.tilt : 0;
                        return `
                        <figure class="insp-polaroid" style="--tilt:${tilt}deg">
                            <div class="insp-frame">
                                <img src="${this.safeUrlAttr(it.url)}" alt="" loading="lazy" decoding="async"
                                    onerror="var p=this.closest('.insp-polaroid');if(p)p.classList.add('insp-broken');">
                                <div class="insp-broken-msg"><i class="fas fa-unlink"></i><span>Не удалось загрузить</span></div>
                            </div>
                            ${it.caption ? `<figcaption class="insp-caption">${this.esc(it.caption)}</figcaption>` : '<figcaption class="insp-caption insp-caption-empty"> </figcaption>'}
                            <button type="button" class="insp-remove" data-del-inspire="${this.esc(it.id)}" title="Убрать с доски"><i class="fas fa-times"></i></button>
                        </figure>`;
                    }).join('') : `
                        <div class="insp-empty">
                            <i class="fas fa-camera-retro"></i>
                            <p>Пока пусто. Нажмите «Добавить фото» и вставьте URL картинки (например с Unsplash или Pinterest).</p>
                        </div>`}
                </div>
            </section>`;
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
        document.querySelector('[data-open-inspire]')?.addEventListener('click', () => this.openInspireModal());
        document.querySelectorAll('[data-del-inspire]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Убрать это фото с доски?')) {
                    RPGData.deleteInspiration(this.state, btn.dataset.delInspire);
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
    },

    openInspireModal() {
        this.openModal('Новое фото на доску', `
            <form class="rpg-form" id="rpgInspireForm">
                <label>Ссылка на изображение</label>
                <input name="url" type="text" class="rpg-input" required placeholder="https://… или data:image/…" autocomplete="off">
                <p class="modal-hint insp-hint">Нужен прямой URL к файлу картинки (<code>https://…jpg</code>). Или вставьте data:image/… если сохраняли в base64.</p>
                <label>Подпись под фото (необязательно)</label>
                <input name="caption" type="text" class="rpg-input" maxlength="120" placeholder="Мечта, цитата, напоминание…">
                <button type="submit" class="rpg-btn rpg-btn-primary">На доску</button>
            </form>`);
        document.getElementById('rpgInspireForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const url = fd.get('url');
            if (!RPGData.normalizeImageUrl(url)) {
                alert('Нужна ссылка, начинающаяся с http://, https:// или data:image/…');
                return;
            }
            RPGData.addInspiration(this.state, { url, caption: fd.get('caption') });
            this.closeModal();
            this.go('#/inspire');
        });
    }
};

document.addEventListener('DOMContentLoaded', () => RPGApp.init());
