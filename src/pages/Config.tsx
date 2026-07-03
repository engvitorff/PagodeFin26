import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { BRAND_PRESETS } from '@/lib/calc';

export function Config() {
  const { mode, brand, setMode, setBrand } = useTheme();
  const { group, updateGroup } = useAuth();
  const [groupName, setGroupName] = useState(group?.name ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateGroup(groupName || group?.name || '', brand);
    setSaving(false);
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

      <div className="card">
        <div className="sect">Grupo</div>
        <div className="field">
          <label>Nome do grupo</label>
          <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder={group?.name} />
        </div>
        <button className="btn btn-brand" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</button>
      </div>
    </div>
  );
}
