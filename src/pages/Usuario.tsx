import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type Msg = { type: 'ok' | 'err'; text: string } | null;

function MsgBox({ msg }: { msg: Msg }) {
  if (!msg) return null;
  const isOk = msg.type === 'ok';
  return (
    <div
      className="mb14"
      style={{
        background: isOk ? 'var(--success-bg)' : 'var(--danger-bg)',
        color: isOk ? 'var(--success)' : 'var(--danger)',
        borderRadius: 10,
        padding: '10px 13px',
        fontSize: 13,
      }}
    >
      {msg.text}
    </div>
  );
}

// Configurações da conta do usuário logado (independe de banda/grupo):
// nome de exibição e senha. Disponível para qualquer papel.
export function Usuario() {
  const { user } = useAuth();

  const [name, setName] = useState((user?.user_metadata?.full_name as string | undefined) ?? '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<Msg>(null);

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  async function handleSaveName() {
    setNameSaving(true);
    setNameMsg(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    setNameSaving(false);
    setNameMsg(error ? { type: 'err', text: error.message } : { type: 'ok', text: 'Nome atualizado.' });
  }

  async function handleSavePassword() {
    if (password !== password2) {
      setPwMsg({ type: 'err', text: 'As senhas não coincidem.' });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    const { error } = await supabase.auth.updateUser({ password });
    setPwSaving(false);
    if (error) {
      setPwMsg({ type: 'err', text: error.message });
      return;
    }
    setPwMsg({ type: 'ok', text: 'Senha alterada.' });
    setPassword('');
    setPassword2('');
  }

  return (
    <div>
      <div className="card mb18">
        <div className="sect">Conta</div>
        <div className="field">
          <label>E-mail</label>
          <input value={user?.email ?? ''} disabled />
        </div>
        <div className="field">
          <label>Nome de exibição</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
        </div>
        <MsgBox msg={nameMsg} />
        <button className="btn btn-brand" onClick={handleSaveName} disabled={nameSaving}>
          {nameSaving ? 'Salvando...' : 'Salvar nome'}
        </button>
      </div>

      <div className="card">
        <div className="sect">Senha</div>
        <div className="faint" style={{ marginBottom: 12 }}>
          Altere a senha de acesso da sua conta ({user?.email}).
        </div>
        <div className="field">
          <label>Nova senha</label>
          <input type="password" minLength={6} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="field">
          <label>Confirmar nova senha</label>
          <input type="password" minLength={6} placeholder="••••••••" value={password2} onChange={(e) => setPassword2(e.target.value)} />
        </div>
        <MsgBox msg={pwMsg} />
        <button className="btn btn-brand" onClick={handleSavePassword} disabled={pwSaving || password.length < 6}>
          {pwSaving ? 'Salvando...' : 'Alterar senha'}
        </button>
      </div>
    </div>
  );
}
