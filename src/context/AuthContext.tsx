import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface GroupInfo {
  id: string;
  name: string;
  brand: string;
}

interface AuthResult {
  error: string | null;
  needsEmailConfirmation?: boolean;
}

interface AuthContextValue {
  loading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  userInitials: string;
  group: GroupInfo | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  createGroup: (name: string, brand: string) => Promise<AuthResult>;
  updateGroup: (name: string, brand: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function computeInitials(name: string): string {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return initials || '6T';
}

async function fetchGroupForUser(userId: string): Promise<GroupInfo | null> {
  const { data, error } = await supabase
    .from('group_members')
    .select('group:groups(id, name, brand)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (error || !data?.group) return null;
  const g = data.group as unknown as { id: string; name: string; brand: string };
  return { id: g.id, name: g.name, brand: g.brand };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [group, setGroup] = useState<GroupInfo | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        const g = await fetchGroupForUser(data.session.user.id);
        if (active) setGroup(g);
      }
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        const g = await fetchGroupForUser(newSession.user.id);
        setGroup(g);
      } else {
        setGroup(null);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function login(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signUp(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.session) return { error: null, needsEmailConfirmation: true };
    return { error: null };
  }

  async function logout() {
    await supabase.auth.signOut();
    setGroup(null);
  }

  async function createGroup(name: string, brand: string): Promise<AuthResult> {
    // Lê a sessão diretamente do cliente Supabase (em vez do estado do React)
    // para evitar usar uma sessão desatualizada logo após signUp/login.
    const { data: sessionData } = await supabase.auth.getSession();
    const currentSession = sessionData.session;
    if (!currentSession) return { error: 'Você precisa estar logado para criar um grupo.' };

    // Gera o id no cliente e insere sem `.select()`: o usuário ainda não é
    // group_member no momento do insert, então um `RETURNING` esbarraria na
    // policy de SELECT (que exige ser membro) e o Postgres rejeitaria a
    // linha inteira com "violates row-level security policy".
    const newGroupId = crypto.randomUUID();
    const { error: groupError } = await supabase.from('groups').insert({ id: newGroupId, name, brand });
    if (groupError) return { error: groupError.message };

    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: newGroupId, user_id: currentSession.user.id, role: 'Admin' });
    if (memberError) return { error: memberError.message };

    setSession(currentSession);
    setGroup({ id: newGroupId, name, brand });
    return { error: null };
  }

  async function updateGroup(name: string, brand: string): Promise<AuthResult> {
    if (!group) return { error: 'Nenhum grupo ativo.' };
    const { error } = await supabase.from('groups').update({ name, brand }).eq('id', group.id);
    if (error) return { error: error.message };
    setGroup({ ...group, name, brand });
    return { error: null };
  }

  const userInitials = group ? computeInitials(group.name) : '6T';

  return (
    <AuthContext.Provider
      value={{
        loading,
        isAuthenticated: !!session,
        user: session?.user ?? null,
        userInitials,
        group,
        login,
        signUp,
        logout,
        createGroup,
        updateGroup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
