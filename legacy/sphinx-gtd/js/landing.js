/**
 * Landing auth page — регистрация и вход в одном экране
 */
(function() {
    const formRegister = document.getElementById('formRegister');
    const formLogin = document.getElementById('formLogin');
    const regError = document.getElementById('regError');
    const loginError = document.getElementById('loginError');
    const toLogin = document.getElementById('toLogin');
    const toRegister = document.getElementById('toRegister');
    const googleBtn = document.getElementById('landingGoogle');
    const githubBtn = document.getElementById('landingGithub');

    function showError(el, msg) {
        if (el) el.textContent = msg || '';
    }

    function redirectToApp() {
        window.location.href = 'index.html';
    }

    function switchMode(mode) {
        const forms = document.querySelector('.landing-auth-forms');
        if (!forms) return;
        forms.dataset.mode = mode;
        if (mode === 'login') {
            formRegister?.classList.add('landing-form-hidden');
            formRegister?.classList.remove('landing-form-active');
            formLogin?.classList.remove('landing-form-hidden');
            formLogin?.classList.add('landing-form-active');
        } else {
            formLogin?.classList.add('landing-form-hidden');
            formLogin?.classList.remove('landing-form-active');
            formRegister?.classList.remove('landing-form-hidden');
            formRegister?.classList.add('landing-form-active');
        }
        showError(regError, '');
        showError(loginError, '');
    }

    function initAuth() {
        if (typeof SupabaseAuth === 'undefined' || !SupabaseAuth.isConfigured()) return false;
        try {
            SupabaseAuth.init((session) => {
                if (session) redirectToApp();
            });
            return true;
        } catch (e) {
            console.warn('Supabase init failed', e);
            return false;
        }
    }

    toLogin?.addEventListener('click', () => switchMode('login'));
    toRegister?.addEventListener('click', () => switchMode('register'));

    googleBtn?.addEventListener('click', async () => {
        if (!SupabaseAuth.isConfigured()) return;
        await SupabaseAuth.signInWithGoogle();
    });

    githubBtn?.addEventListener('click', async () => {
        if (!SupabaseAuth.isConfigured()) return;
        await SupabaseAuth.signInWithGithub();
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
            switchMode('login');
            document.getElementById('loginEmail').value = email;
            return;
        }
        redirectToApp();
    });

    // Вход
    formLogin?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showError(loginError, '');
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        if (!email || !password) return;

        const { error } = await SupabaseAuth.signInWithPassword(email, password);
        if (error) {
            const msg = error.message || '';
            if (msg.toLowerCase().includes('invalid')) {
                showError(loginError, 'Нет такого аккаунта или неверный пароль.');
            } else {
                showError(loginError, msg);
            }
            return;
        }
        redirectToApp();
    });

    if (!initAuth()) {
        // Если Supabase не настроен — просто оставляем форму, но соц-кнопки не работают
        console.warn('Supabase is not configured on landing page');
    }
})();
