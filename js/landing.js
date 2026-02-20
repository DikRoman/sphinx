/**
 * Landing page — Вход и Регистрация
 */
(function() {
    const modalRegister = document.getElementById('modalRegister');
    const modalLogin = document.getElementById('modalLogin');
    const btnRegister = document.getElementById('btnRegister');
    const btnLogin = document.getElementById('btnLogin');
    const formRegister = document.getElementById('formRegister');
    const formLogin = document.getElementById('formLogin');
    const regError = document.getElementById('regError');
    const loginError = document.getElementById('loginError');

    function openModal(id) {
        document.getElementById(id)?.classList.add('active');
    }

    function closeModal(id) {
        document.getElementById(id)?.classList.remove('active');
    }

    function showError(el, msg) {
        if (el) { el.textContent = msg || ''; }
    }

    function redirectToApp() {
        window.location.href = 'index.html';
    }

    function initAuth() {
        if (typeof SupabaseAuth === 'undefined' || !SupabaseAuth.isConfigured()) return false;
        try {
            SupabaseAuth.init((session) => {
                if (session) redirectToApp();
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    // Кнопки
    btnRegister?.addEventListener('click', () => {
        showError(regError, '');
        openModal('modalRegister');
    });
    btnLogin?.addEventListener('click', () => {
        showError(loginError, '');
        openModal('modalLogin');
    });

    // Закрытие модалок
    document.querySelectorAll('.modal-close[data-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.modal));
    });
    document.querySelectorAll('.landing-modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });

    // Регистрация
    formRegister?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showError(regError, '');
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        if (!email || !password) return;

        const { data, error } = await SupabaseAuth.signUp(email, password);
        if (error) {
            showError(regError, error.message || 'Ошибка регистрации');
            return;
        }
        if (data?.user?.identities?.length === 0) {
            showError(regError, 'Аккаунт с таким email уже существует. Войдите.');
            return;
        }
        closeModal('modalRegister');
        redirectToApp();
    });

    // Вход — только для зарегистрированных
    formLogin?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showError(loginError, '');
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        if (!email || !password) return;

        const { error } = await SupabaseAuth.signInWithPassword(email, password);
        if (error) {
            const msg = error.message || '';
            if (msg.includes('Invalid') || msg.includes('invalid') || msg.includes('Invalid login')) {
                showError(loginError, 'Нет такого аккаунта. Сначала зарегистрируйтесь.');
            } else {
                showError(loginError, msg);
            }
            return;
        }
        closeModal('modalLogin');
        redirectToApp();
    });

    // Инициализация
    if (!initAuth()) {
        // Supabase не настроен — скрываем кнопки, показываем подсказку
        const cta = document.querySelector('.landing-cta');
        if (cta) {
            cta.style.display = 'none';
        }
    }
})();
