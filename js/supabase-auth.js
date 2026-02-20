/**
 * Supabase Auth — логин через Google/GitHub
 */
const SupabaseAuth = {
    client: null,
    onAuthChange: null,
    _session: null,

    init(onChange) {
        this.onAuthChange = onChange;
        if (typeof supabase === 'undefined') return;
        try {
            this.client = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            this.client.auth.onAuthStateChange((event, session) => {
                this._session = session;
                if (this.onAuthChange) this.onAuthChange(session);
            });
            this.client.auth.getSession().then(({ data: { session } }) => {
                this._session = session;
                if (this.onAuthChange) this.onAuthChange(session);
            });
        } catch (e) {
            console.warn('Supabase Auth: config missing or invalid', e);
        }
    },

    isConfigured() {
        return SUPABASE_CONFIG.url && SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL';
    },

    isLoggedIn() {
        return !!this._session;
    },

    getSession() {
        return this._session ?? null;
    },

    getUserId() {
        return this._session?.user?.id ?? null;
    },

    async signInWithGoogle() {
        if (!this.client) return;
        await this.client.auth.signInWithOAuth({ provider: 'google' });
    },

    async signInWithGithub() {
        if (!this.client) return;
        await this.client.auth.signInWithOAuth({ provider: 'github' });
    },

    async signOut() {
        if (!this.client) return;
        await this.client.auth.signOut();
    },

    async signUp(email, password) {
        if (!this.client) return { error: { message: 'Supabase не настроен' } };
        return this.client.auth.signUp({ email, password });
    },

    async signInWithPassword(email, password) {
        if (!this.client) return { error: { message: 'Supabase не настроен' } };
        return this.client.auth.signInWithPassword({ email, password });
    }
};
