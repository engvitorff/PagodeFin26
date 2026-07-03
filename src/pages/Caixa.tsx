import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useAppData } from '@/context/AppDataContext';
import { TX_CATEGORIES } from '@/data/mocks';
import { fmt, fmtDate, mesLabel, parseCents, parseDateLocal, todayStr } from '@/lib/format';
import type { TxType } from '@/types';

export function Caixa() {
  const { transacoes, addTransacao, deleteTransacao } = useAppData();
  const [filterAno, setFilterAno] = useState('all');
  const [filterMes, setFilterMes] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [mpBannerOpen, setMpBannerOpen] = useState(true);

  const saldoTotal = transacoes.reduce((s, t) => s + (t.type === 'IN' ? t.amountCents : -t.amountCents), 0);
  const entradasTotal = transacoes.filter((t) => t.type === 'IN').reduce((s, t) => s + t.amountCents, 0);
  const saidasTotal = transacoes.filter((t) => t.type === 'OUT').reduce((s, t) => s + t.amountCents, 0);

  const anos = useMemo(() => {
    const s = new Set<string>();
    transacoes.forEach((t) => s.add(String(parseDateLocal(t.date).getFullYear())));
    return Array.from(s).sort();
  }, [transacoes]);

  const filtered = transacoes
    .filter((t) => {
      const d = parseDateLocal(t.date);
      if (filterAno !== 'all' && String(d.getFullYear()) !== filterAno) return false;
      if (filterMes !== 'all' && String(d.getMonth() + 1).padStart(2, '0') !== filterMes) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="card mb18" style={{ background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)' }}>
        <div className="faint mb8">Saldo consolidado</div>
        <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 14 }}>{fmt(saldoTotal)}</div>
        <div className="row gap12">
          <div className="row gap6"><Icon name="in" size={14} style={{ color: 'var(--success)' }} /><span className="pos">{fmt(entradasTotal)}</span></div>
          <div className="row gap6"><Icon name="out" size={14} style={{ color: 'var(--danger)' }} /><span className="neg">{fmt(saidasTotal)}</span></div>
        </div>
      </div>

      {mpBannerOpen && (
        <div className="card mb18 row between gap12">
          <div className="row gap12">
            <div className="thumb"><Icon name="link" size={16} /></div>
            <div>
              <div className="row-name">Vincule sua conta Mercado Pago</div>
              <div className="row-sub">Importe transações automaticamente.</div>
            </div>
          </div>
          <div className="row gap8">
            <button className="btn btn-sm btn-brand" onClick={() => alert('Integração Mercado Pago (mock)')}>Vincular conta</button>
            <button className="iconbtn" onClick={() => setMpBannerOpen(false)}><Icon name="x" size={14} /></button>
          </div>
        </div>
      )}

      <div className="row between mb16">
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filterAno} onChange={(e) => setFilterAno(e.target.value)} style={selStyle}>
            <option value="all">Todos os anos</option>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterMes} onChange={(e) => setFilterMes(e.target.value)} style={selStyle}>
            <option value="all">Todos os meses</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={String(i + 1).padStart(2, '0')}>{mesLabel(i)}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-brand btn-sm" onClick={() => setShowModal(true)}><Icon name="plus" size={14} />Nova transação</button>
      </div>

      <div>
        {filtered.length === 0 && <div className="faint">Nenhuma transação encontrada.</div>}
        {filtered.map((t) => (
          <div key={t.id} className="tx-card">
            <div className="thumb" style={{ color: t.type === 'IN' ? 'var(--success)' : 'var(--danger)', background: t.type === 'IN' ? 'var(--success-bg)' : 'var(--danger-bg)' }}>
              <Icon name={t.type === 'IN' ? 'in' : 'out'} size={16} />
            </div>
            <div className="grow">
              <div className="row-name">{t.description}</div>
              <div className="row-sub">{fmtDate(t.date)} · {t.category}</div>
            </div>
            <div className={t.type === 'IN' ? 'pos' : 'neg'} style={{ fontSize: 14 }}>
              {t.type === 'IN' ? '+ ' : '- '}{fmt(t.amountCents)}
            </div>
            <button className="iconbtn tx-del" onClick={() => deleteTransacao(t.id)}><Icon name="trash" size={14} /></button>
          </div>
        ))}
      </div>

      {showModal && <NovaTransacaoModal onClose={() => setShowModal(false)} onSave={(t) => { addTransacao(t); setShowModal(false); }} />}
    </div>
  );
}

const selStyle: React.CSSProperties = {
  height: 34, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '0 10px', color: 'var(--text)', fontSize: 12,
};

function NovaTransacaoModal({ onClose, onSave }: { onClose: () => void; onSave: (t: { description: string; amountCents: number; type: TxType; category: string; date: string }) => void }) {
  const [type, setType] = useState<TxType>('IN');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayStr());
  const [valor, setValor] = useState('');
  const [category, setCategory] = useState(TX_CATEGORIES.IN[0]);

  function handleTypeChange(t: TxType) {
    setType(t);
    setCategory(TX_CATEGORIES[t][0]);
  }

  return (
    <Modal title="Nova Transação" onClose={onClose}>
      <div className="type-seg">
        <button className={type === 'IN' ? 'on-in' : ''} onClick={() => handleTypeChange('IN')}>Entrada</button>
        <button className={type === 'OUT' ? 'on-out' : ''} onClick={() => handleTypeChange('OUT')}>Saída</button>
      </div>
      <div className="field"><label>Descrição</label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Cachê Diego" /></div>
      <div className="grid2">
        <div className="field"><label>Data</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="field"><label>Valor (R$)</label><input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" /></div>
      </div>
      <div className="field">
        <label>Categoria</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {TX_CATEGORIES[type].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <button
        className={`btn btn-full ${type === 'IN' ? 'btn-success' : 'btn-danger'}`}
        onClick={() => onSave({ description: description || category, amountCents: parseCents(valor), type, category, date })}
      >
        {type === 'IN' ? 'Registrar Entrada' : 'Registrar Saída'}
      </button>
    </Modal>
  );
}
