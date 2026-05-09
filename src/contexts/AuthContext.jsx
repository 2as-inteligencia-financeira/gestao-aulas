/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// ALTO-02: origens autorizadas a enviar token via postMessage
const TRUSTED_HUB_ORIGINS = [
  'https://app.2asfinancas.com',
  'https://hub.2asfinancas.com',
  ...(import.meta.env.DEV ? ['http://localhost:5173', 'http://localhost:3000'] : []),
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined);
  const [profile, setProfile]   = useState(null);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data ?? null);
  }

  useEffect(() => {
    const initSession = async () => {
      // ALTO-02: recebe token do hub via postMessage (nunca via URL)
      if (window.opener && !window.opener.closed) {
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 10_000);

          const handler = async (event) => {
            if (!TRUSTED_HUB_ORIGINS.includes(event.origin)) return;
            if (event.data?.type !== 'painel:token') return;
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            const { access_token, refresh_token } = event.data;
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
            resolve();
          };

          window.addEventListener('message', handler);

          try {
            window.opener.postMessage({ type: 'painel:ready' }, '*');
          } catch {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            resolve();
          }
        });
      }

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const loading = session === undefined;
  const user    = session?.user ?? null;

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

export function useIsAdmin()   { return useAuth().profile?.perfil === 'admin'; }
export function useIsGestor()  {
  const { profile } = useAuth();
  return ['admin', 'financeiro', 'gestor'].includes(profile?.perfil);
}
