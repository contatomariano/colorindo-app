import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    async function loadProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Erro ao carregar perfil:', error.message);
            }
            setProfile(data || null);
        } catch (err) {
            console.error('Exceção ao carregar perfil:', err);
        }
        setLoading(false);
    }

    useEffect(() => {
        let mounted = true;

        // Inicialização com tratamento de erro e timeout
        supabase.auth.getSession()
            .then(({ data: { session }, error }) => {
                if (!mounted) return;
                if (error) {
                    console.warn('Erro ao obter sessão:', error.message);
                    setLoading(false);
                    return;
                }
                setUser(session?.user ?? null);
                if (session?.user) {
                    loadProfile(session.user.id);
                } else {
                    setLoading(false);
                }
            })
            .catch((err) => {
                console.warn('Falha na inicialização auth:', err?.message);
                if (mounted) setLoading(false);
            });

        // Timeout de segurança: desbloqueia após 4s se travado
        const timeout = setTimeout(() => {
            setLoading((prev) => {
                if (prev) console.warn('Auth timeout - desbloqueando app');
                return false;
            });
        }, 4000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!mounted) return;
                setUser(session?.user ?? null);
                if (session?.user) {
                    loadProfile(session.user.id);
                } else {
                    setProfile(null);
                    setLoading(false);
                }
            }
        );

        return () => {
            mounted = false;
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, []);

    async function signIn(email, password) {
        const result = await supabase.auth.signInWithPassword({ email, password });
        // Se login ok, carrega o perfil imediatamente
        if (result.data?.user && !result.error) {
            setUser(result.data.user);
            await loadProfile(result.data.user.id);
        }
        return result;
    }

    async function signUp(email, password, name) {
        return await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } }
        });
    }

    async function signOut() {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    }

    const isAdmin = profile?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, profile, loading, isAdmin, signIn, signUp, signOut, loadProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
