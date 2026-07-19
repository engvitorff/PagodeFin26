import { useTheme } from '@/context/ThemeContext';
import { BRAND_PRESETS } from '@/lib/calc';

// Configurações = parâmetros do app apenas (aparência). Dados da banda ficam
// em /banda e dados da conta em /usuario.
export function Config() {
  const { mode, brand, setMode, setBrand } = useTheme();

  return (
    <div>
      <div className="card">
        <div className="row between" style={{ alignItems: 'center', marginBottom: 14 }}>
          <div className="sect" style={{ margin: 0 }}>Aparência</div>
          <div className="row gap6">
            <button className={`btn btn-sm${mode === 'dark' ? ' btn-brand' : ''}`} onClick={() => setMode('dark')}>Escuro</button>
            <button className={`btn btn-sm${mode === 'light' ? ' btn-brand' : ''}`} onClick={() => setMode('light')}>Claro</button>
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
    </div>
  );
}
