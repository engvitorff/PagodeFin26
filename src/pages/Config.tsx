import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { BRAND_PRESETS } from '@/lib/calc';
import { supabase } from '@/lib/supabase';

interface GroupMemberRow {
  user_id: string;
  email: string;
  role: string;
  musico_id: string | null;
  musico_name: string | null;
}

export function Config() {
  const { mode, brand, setMode, setBrand } = useTheme();
  const { group, updateGroup, setGroupPassword } = useAuth();
  const [groupName, setGroupName] = useState(group?.name ?? '');
  const [saving, setSaving] = useState(false);

  const [groupPassword, setGroupPasswordInput] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const [members, setMembers] = useState<GroupMemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError(null);
    const { data, error } = await supabase.rpc('list_group_members');
    setMembersLoading(false);
    if (error) {
      setMembersError(error.message);
      return;
    }
    setMembers((data as GroupMemberRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (group?.role === 'Admin') {
      fetchMembers();
    }
  }, [group?.role, group?.id, fetchMembers]);

  async function handleSave() {
    setSaving(true);
    await updateGroup(groupName || group?.name || '', brand);
    setSaving(false);
  }

  async function handleSavePassword() {
    setPwSaving(true);
    setPwError(null);
    setPwSuccess(false);
    const res = await setGroupPassword(groupPassword);
    setPwSaving(false);
    if (res.error) {
      setPwError(res.error);
      return;
    }
    setPwSuccess(true);
    setGroupPasswordInput('');
  }

  async function handlePromote(userId: string) {
    setPromotingId(userId);
    setMembersError(null);
    const { error } = await supabase.rpc('promote_to_admin', { p_target_user_id: userId });
    setPromotingId(null);
    if (error) {
      setMembersError(error.message);
      return;
    }
    await fetchMembers();
  }

  return (
    <div>
      <div className="card mb18">
        <div className="sect">Aparência</div>
        <div className="field">
          <label>Modo de fundo</label>
          <div className="row gap8">
            <button className={`btn${mode === 'dark' ? ' btn-brand' : ''}`} onClick={() => setMode('dark')}>Escuro</button>
            <button className={`btn${mode === 'light' ? ' btn-brand' : ''}`} onClick={() => setMode('light')}>Claro</button>
          </div>
        </div>
        <div className="field">
          <label>Cor da marca</label>
          <div className="swatches">
            {BRAND_PRESETS.map((c) => (
              <div key={c} className={`swatch${brand === c ? ' sel' : ''}`} style={{ background: c }} onClick={() => setBrand(c)} />
            ))}
          </div>
        </div>
        <div className="card" style={{ background: 'var(--brand-soft)', border: 'none' }}>
          <div style={{ color: 'var(--brand-ink)', fontWeight: 600, fontSize: 13 }}>Pré-visualização da marca</div>
          <div className="faint">Esta é a cor usada em botões, links e destaques.</div>
        </div>
      </div>

      {group?.role === 'Admin' && (
        <div className="card mb18">
          <div className="sect">Grupo</div>
          <div className="field">
            <label>Nome do grupo</label>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder={group?.name} />
          </div>
          <button className="btn btn-brand" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</button>
        </div>
      )}

      {group?.role === 'Admin' && (
        <div className="card mb18">
          <div className="sect">Login do grupo</div>
          <div className="faint" style={{ marginBottom: 12 }}>
            Defina uma senha para que outras pessoas entrem neste grupo pelo nome "{group.name}" + senha, em vez de criar um grupo novo.
          </div>
          {pwError && (
            <div className="mb14" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 10, padding: '10px 13px', fontSize: 13 }}>
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="mb14" style={{ background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 10, padding: '10px 13px', fontSize: 13 }}>
              Senha do grupo atualizada.
            </div>
          )}
          <div className="field">
            <label>Nova senha do grupo</label>
            <input type="password" minLength={4} placeholder="••••••••" value={groupPassword} onChange={(e) => setGroupPasswordInput(e.target.value)} />
          </div>
          <button className="btn btn-brand" onClick={handleSavePassword} disabled={pwSaving || groupPassword.length < 4}>
            {pwSaving ? 'Salvando...' : 'Salvar senha do grupo'}
          </button>
        </div>
      )}

      {group?.role === 'Admin' && (
        <div className="card">
          <div className="sect">Membros do grupo</div>
          <div className="faint mb14">
            Membros com papel "View" só visualizam a própria agenda. Promova a Admin para dar acesso total de edição.
          </div>
          {membersError && (
            <div className="mb14" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 10, padding: '10px 13px', fontSize: 13 }}>
              {membersError}
            </div>
          )}
          {membersLoading && <div className="faint">Carregando membros...</div>}
          {!membersLoading && members.length === 0 && !membersError && (
            <div className="faint">Nenhum membro encontrado.</div>
          )}
          {!membersLoading && members.map((m) => (
            <div key={m.user_id} className="row gap8 mb14" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div>{m.email}</div>
                <div className="faint">
                  {m.role === 'Admin' ? 'Admin' : 'View'}
                  {m.musico_name ? ` · vinculado a ${m.musico_name}` : ''}
                </div>
              </div>
              {m.role !== 'Admin' && (
                <button
                  className="btn btn-sm btn-brand"
                  onClick={() => handlePromote(m.user_id)}
                  disabled={promotingId === m.user_id}
                >
                  {promotingId === m.user_id ? 'Promovendo...' : 'Promover a Admin'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
