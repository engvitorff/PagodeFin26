import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await login(email, pass);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    navigate('/painel');
  }

  return (
    <div className="authwrap">
      <div className="authcard">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="logo-box">6T</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.5px' }}>PagodeFin</div>
          <div className="faint" style={{ marginTop: 5 }}>Gestão financeira do seu grupo</div>
        </div>
        <form className="card card-form" onSubmit={handleSubmit}>
          {error && (
            <div className="mb14" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 10, padding: '10px 13px', fontSize: 13 }}>
              {error}
            </div>
          )}
          <div className="field">
            <label>E-mail</label>
            <div className="field-icon">
              <Icon name="mail" size={16} />
              <input type="email" required placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="field" style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              Senha
              <span className="link-brand" style={{ fontWeight: 400 }}>Esqueci a senha</span>
            </label>
            <div className="field-icon">
              <Icon name="lock" size={16} />
              <input type="password" required placeholder="••••••••" value={pass} onChange={(e) => setPass(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="btn btn-brand btn-full" disabled={submitting}>
            <Icon name="check" size={16} /> {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-faint)' }}>
          Não tem grupo?{' '}
          <span className="link-brand" onClick={() => navigate('/onboarding')}>Criar grupo</span>
        </p>
      </div>
    </div>
  );
}
