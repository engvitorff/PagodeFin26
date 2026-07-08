import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useAppData } from '@/context/AppDataContext';
import { avatarColor, initials } from '@/lib/calc';
import { supabase } from '@/lib/supabase';
import type { Musico, Role } from '@/types';

interface GroupMember {
  user_id: string;
  email: string;
  role: string;
  musico_id: string | null;
  musico_name: string | null;
}

/** Busca os membros do grupo (só funciona para Admin). Em caso de erro (ex.: chamador
 * não é Admin), devolve null e a tela simplesmente não mostra a seção de vínculo. */
async function fetchGroupMembers(): Promise<GroupMember[] | null> {
  const { data, error } = await supabase.rpc('list_group_members');
  if (error) return null;
  return (data as GroupMember[] | null) ?? [];
}

export function Musicos() {
  const { musicos, addMusico, updateMusico, deleteMusico } = useAppData();
  const [editing, setEditing] = useState<Musico | 'new' | null>(null);
  const [members, setMembers] = useState<GroupMember[] | null>(null);

  const sorted = [...musicos].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    let cancelled = false;
    fetchGroupMembers().then((list) => { if (!cancelled) setMembers(list); });
    return () => { cancelled = true; };
  }, []);

  async function refreshMembers() {
    const list = await fetchGroupMembers();
    setMembers(list);
  }

  return (
    <div>
      <div className="row between mb16">
        <div className="muted">Sócios e freelancers</div>
        <button className="btn btn-brand btn-sm" onClick={() => setEditing('new')}><Icon name="plus" size={14} />Novo músico</button>
      </div>

      <div>
        {sorted.map((m, i) => {
          const linkedMember = members?.find((mm) => mm.musico_id === m.id);
          return (
            <div key={m.id} className="mcard" onClick={() => setEditing(m)}>
              <div className="mav" style={{ background: avatarColor(i) }}>{initials(m.name)}</div>
              <div className="grow">
                <div className="row-name">{m.name}</div>
                <div className="row-sub" style={{ color: m.role === 'Sócio' ? '#7C5CFF' : '#F5A524' }}>{m.instrument} · {m.role}</div>
                {members && (
                  <div className="faint">{linkedMember ? `Vinculado: ${linkedMember.email}` : 'Sem vínculo'}</div>
                )}
              </div>
              {m.pix && (
                <div className="row gap6 faint">
                  <Icon name="pix" size={14} />
                  <span>{m.pix}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <MusicoModal
          musico={editing === 'new' ? null : editing}
          members={members}
          onMembersChange={refreshMembers}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            if (editing === 'new') addMusico(data);
            else updateMusico(editing.id, data);
            setEditing(null);
          }}
          onDelete={editing !== 'new' ? () => { deleteMusico(editing.id); setEditing(null); } : undefined}
        />
      )}
    </div>
  );
}

function MusicoModal({ musico, members, onMembersChange, onClose, onSave, onDelete }: {
  musico: Musico | null;
  members: GroupMember[] | null;
  onMembersChange: () => Promise<void>;
  onClose: () => void;
  onSave: (data: Omit<Musico, 'id'>) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(musico?.name ?? '');
  const [instrument, setInstrument] = useState(musico?.instrument ?? '');
  const [role, setRole] = useState<Role>(musico?.role ?? 'Freelancer');
  const [phone, setPhone] = useState(musico?.phone ?? '');
  const [pix, setPix] = useState(musico?.pix ?? '');

  const [selectedUserId, setSelectedUserId] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const linkedMember = musico ? members?.find((mm) => mm.musico_id === musico.id) : undefined;
  const unlinkedMembers = members?.filter((mm) => !mm.musico_id) ?? [];

  function handleSave() {
    if (!name || !instrument) return;
    onSave({ name, instrument, role, phone, pix });
  }

  async function handleLink() {
    if (!musico || !selectedUserId) return;
    setLinkBusy(true);
    setLinkError(null);
    const { error } = await supabase.rpc('link_musico', { p_musico_id: musico.id, p_user_id: selectedUserId });
    setLinkBusy(false);
    if (error) { setLinkError(error.message); return; }
    setSelectedUserId('');
    await onMembersChange();
  }

  async function handleUnlink() {
    if (!musico) return;
    setLinkBusy(true);
    setLinkError(null);
    const { error } = await supabase.rpc('unlink_musico', { p_musico_id: musico.id });
    setLinkBusy(false);
    if (error) { setLinkError(error.message); return; }
    await onMembersChange();
  }

  return (
    <Modal title={musico ? 'Editar Músico' : 'Novo Músico'} onClose={onClose}>
      <div className="grid2">
        <div className="field"><label>Nome</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label>Instrumento</label><input value={instrument} onChange={(e) => setInstrument(e.target.value)} /></div>
      </div>
      <div className="field">
        <label>Tipo</label>
        <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="Freelancer">Freelancer</option>
          <option value="Sócio">Sócio</option>
        </select>
      </div>
      <div className="field"><label>Telefone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      <div className="field"><label>PIX</label><input value={pix} onChange={(e) => setPix(e.target.value)} /></div>

      {musico && members && (
        <div className="field">
          <label>Conta de acesso</label>
          {linkedMember ? (
            <div>
              <div className="faint mb8">Vinculado: {linkedMember.email}</div>
              <button className="btn btn-sm btn-danger" onClick={handleUnlink} disabled={linkBusy}>Remover vínculo</button>
            </div>
          ) : unlinkedMembers.length > 0 ? (
            <div className="row gap8">
              <select style={{ flex: 1 }} value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                <option value="">Selecione um membro do grupo...</option>
                {unlinkedMembers.map((mem) => (
                  <option key={mem.user_id} value={mem.user_id}>{mem.email}</option>
                ))}
              </select>
              <button className="btn btn-sm btn-brand" onClick={handleLink} disabled={linkBusy || !selectedUserId}>Vincular</button>
            </div>
          ) : (
            <div className="faint">Nenhum membro do grupo disponível para vincular.</div>
          )}
          {linkError && <div className="faint" style={{ color: 'var(--danger)', marginTop: 8 }}>{linkError}</div>}
        </div>
      )}

      <button className="btn btn-brand btn-full mb8" onClick={handleSave}>Salvar</button>
      {onDelete && <button className="btn btn-danger btn-full" onClick={onDelete}>Excluir músico</button>}
    </Modal>
  );
}
