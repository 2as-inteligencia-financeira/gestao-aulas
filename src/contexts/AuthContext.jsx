/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined); // undefined = carregando
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
    // Trata tokens vindos do hub via URL
    const params = new URLSearchParams(window.location.search);
    const access = params.get('sb_access_token');
    const refresh = params.get('sb_refresh_token');
    const initSession = access && refresh
      ? supabase.auth.setSession({ access_token: access, refresh_token: refresh }).then(() => {
          params.delete('sb_access_token');
          params.delete('sb_refresh_token');
          window.history.replaceState({}, '', [window.location.pathname, params.toString()].filter(Boolean).join('?'));
        })
      : Promise.resolve();

    initSession.then(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) fetchProfile(session.user.id);
      });
    });

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
