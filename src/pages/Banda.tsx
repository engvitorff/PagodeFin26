import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Icon } from '@/components/ui/Icon';

interface GroupMemberRow {
  user_id: string;
  email: string;
  role: string;
  musico_id: string | null;
  musico_name: string | null;
}

// Configurações da banda (grupo): nome, login por senha, integrações e
// membros. Edição só para Admin; membros "View" veem o nome em modo leitura.
export function Banda() {
  const { group, updateGroup, setGroupPassword } = useAuth();
  const { brand } = useTheme();
  const isAdmin = group?.role === 'Admin';

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
    if (isAdmin) {
      fetchMembers();
    }
  }, [isAdmin, group?.id, fetchMembers]);

  async function handleSave() {
    setSaving(true);
    // brand vem do tema (parâmetro do app) — passado aqui só para não
    // sobrescrever a cor do grupo ao salvar o nome.
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

  if (!isAdmin) {
    return (
      <div>
        <div className="card">
          <div className="sect">Banda</div>
          <div className="field">
            <label>Nome da banda</label>
            <input value={group?.name ?? ''} disabled />
          </div>
          <div className="faint">Apenas administradores podem editar as configurações da banda.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card mb18">
        <div className="sect">Dados da banda</div>
        <div className="field">
          <label>Nome da banda</label>
          <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder={group?.name} />
        </div>
        <button className="btn btn-brand" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</button>
      </div>

      <div className="card mb18">
        <div className="sect">Login da banda</div>
        <div className="faint" style={{ marginBottom: 12 }}>
          Defina uma senha para que outras pessoas entrem nesta banda pelo nome "{group?.name}" + senha, em vez de criar uma banda nova.
        </div>
        {pwError && (
          <div className="mb14" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 10, padding: '10px 13px', fontSize: 13 }}>
            {pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="mb14" style={{ background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 10, padding: '10px 13px', fontSize: 13 }}>
            Senha da banda atualizada.
          </div>
        )}
        <div className="field">
          <label>Nova senha da banda</label>
          <input type="password" minLength={4} placeholder="••••••••" value={groupPassword} onChange={(e) => setGroupPasswordInput(e.target.value)} />
        </div>
        <button className="btn btn-brand" onClick={handleSavePassword} disabled={pwSaving || groupPassword.length < 4}>
          {pwSaving ? 'Salvando...' : 'Salvar senha da banda'}
        </button>
      </div>

      <div className="card mb18">
        <div className="sect">Integrações</div>
        <div className="row between gap12">
          <div className="row gap12">
            <div className="thumb"><Icon name="link" size={16} /></div>
            <div>
              <div className="row-name">Mercado Pago</div>
              <div className="row-sub">Importe transações automaticamente para o Caixa.</div>
            </div>
          </div>
          <button className="btn btn-sm btn-brand" onClick={() => alert('Integração Mercado Pago (mock)')}>Vincular conta</button>
        </div>
      </div>

      <div className="card">
        <div className="sect">Membros da banda</div>
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
    </div>
  );
}
