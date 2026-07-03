import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useAppData } from '@/context/AppDataContext';
import { avatarColor, initials } from '@/lib/calc';
import type { Musico, Role } from '@/types';

export function Musicos() {
  const { musicos, addMusico, updateMusico, deleteMusico } = useAppData();
  const [editing, setEditing] = useState<Musico | 'new' | null>(null);

  const sorted = [...musicos].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="row between mb16">
        <div className="muted">Sócios e freelancers</div>
        <button className="btn btn-brand btn-sm" onClick={() => setEditing('new')}><Icon name="plus" size={14} />Novo músico</button>
      </div>

      <div>
        {sorted.map((m, i) => (
          <div key={m.id} className="mcard" onClick={() => setEditing(m)}>
            <div className="mav" style={{ background: avatarColor(i) }}>{initials(m.name)}</div>
            <div className="grow">
              <div className="row-name">{m.name}</div>
              <div className="row-sub" style={{ color: m.role === 'Sócio' ? '#7C5CFF' : '#F5A524' }}>{m.instrument} · {m.role}</div>
            </div>
            {m.pix && (
              <div className="row gap6 faint">
                <Icon name="pix" size={14} />
                <span>{m.pix}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <MusicoModal
          musico={editing === 'new' ? null : editing}
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

function MusicoModal({ musico, onClose, onSave, onDelete }: {
  musico: Musico | null;
  onClose: () => void;
  onSave: (data: Omit<Musico, 'id'>) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(musico?.name ?? '');
  const [instrument, setInstrument] = useState(musico?.instrument ?? '');
  const [role, setRole] = useState<Role>(musico?.role ?? 'Freelancer');
  const [phone, setPhone] = useState(musico?.phone ?? '');
  const [pix, setPix] = useState(musico?.pix ?? '');

  function handleSave() {
    if (!name || !instrument) return;
    onSave({ name, instrument, role, phone, pix });
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
      <button className="btn btn-brand btn-full mb8" onClick={handleSave}>Salvar</button>
      {onDelete && <button className="btn btn-danger btn-full" onClick={onDelete}>Excluir músico</button>}
    </Modal>
  );
}
