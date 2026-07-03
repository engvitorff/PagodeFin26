import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BRAND_PRESETS } from '@/lib/calc';

export function Onboarding() {
  const navigate = useNavigate();
  const { isAuthenticated, signUp, createGroup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState(BRAND_PRESETS[0]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    if (!isAuthenticated) {
      const res = await signUp(email, password);
      if (res.error) {
        setSubmitting(false);
        setError(res.error);
        return;
      }
      if (res.needsEmailConfirmation) {
        setSubmitting(false);
        setInfo('Conta criada! Confirme seu e-mail e depois faça login para criar o grupo.');
        return;
      }
    }

    const res = await createGroup(name || 'Meu grupo', brand);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    navigate('/painel');
  }

  return (
    <div className="authwrap">
      <div className="authcard-wide">
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Criar grupo</div>
          <div className="faint">Cada grupo tem seu próprio caixa, equipe e marca.</div>
        </div>
        <form className="card card-form" onSubmit={handleCreate}>
          {error && (
            <div className="mb14" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 10, padding: '10px 13px', fontSize: 13 }}>
              {error}
            </div>
          )}
          {info && (
            <div className="mb14" style={{ background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 10, padding: '10px 13px', fontSize: 13 }}>
              {info}
            </div>
          )}

          {!isAuthenticated && (
            <>
              <div className="field"><label>Seu e-mail</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" /></div>
              <div className="field"><label>Senha</label><input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
            </>
          )}

          <div className="field">
            <label>Nome do grupo</label>
            <input placeholder="Ex.: Grupo 6 Tabom" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Cor da marca</label>
            <div className="swatches" style={{ marginTop: 4 }}>
              {BRAND_PRESETS.map((c) => (
                <div
                  key={c}
                  className={`swatch${brand === c ? ' sel' : ''}`}
                  style={{ background: c }}
                  onClick={() => setBrand(c)}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-brand btn-full" disabled={submitting}>
            {submitting ? 'Criando...' : 'Criar grupo e entrar'}
          </button>
          <p style={{ textAlign: 'center', marginTop: 14, fontSize: 13 }}>
            <span className="link-brand" onClick={() => navigate('/login')}>← Voltar ao login</span>
          </p>
        </form>
      </div>
    </div>
  );
}
