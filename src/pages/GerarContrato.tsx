import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useAppData } from '@/context/AppDataContext';
import { parseCents, todayStr } from '@/lib/format';

export function GerarContrato() {
  const navigate = useNavigate();
  const { eventos, addContrato, clausulas, setClausulas } = useAppData();
  const [contractorName, setContractorName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [eventId, setEventId] = useState(eventos[0]?.id ?? '');
  const [valor, setValor] = useState('');

  function toggleClausula(idx: number) {
    setClausulas(clausulas.map((c, i) => (i === idx ? { ...c, on: !c.on } : c)));
  }

  async function handleGerar() {
    const ev = eventos.find((e) => e.id === eventId);
    const created = await addContrato({
      eventId: eventId || null,
      contractorName: contractorName || ev?.contractorName || 'Contratante',
      eventDate: ev?.date ?? todayStr(),
      totalValueCents: parseCents(valor) || ev?.totalValueCents || 0,
      issuedAt: todayStr(),
    });
    if (!created) return;
    alert('Contrato gerado com sucesso!');
    navigate('/contratos');
  }

  return (
    <div>
      <div className="row gap12 mb18">
        <button className="iconbtn" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={() => navigate('/contratos')}>
          <Icon name="back" size={18} />
        </button>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Gerar Contrato</div>
      </div>

      <div className="card card-form">
        <div className="field"><label>Contratante (razão social)</label><input value={contractorName} onChange={(e) => setContractorName(e.target.value)} placeholder="Nome do contratante" /></div>
        <div className="grid2">
          <div className="field"><label>CNPJ/CPF</label><input value={cnpj} onChange={(e) => setCnpj(e.target.value)} /></div>
          <div className="field">
            <label>Evento vinculado</label>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
              {eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.contractorName} — {ev.date}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Valor (R$)</label><input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" /></div>

        <div className="sect sect-gap">Cláusulas</div>
        {clausulas.map((c, i) => (
          <div className="row between mb14" key={c.label}>
            <label style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 500 }}>{c.label}</label>
            <div className={`toggle${c.on ? ' on' : ''}`} onClick={() => toggleClausula(i)}><div className="knob" /></div>
          </div>
        ))}

        <button className="btn btn-brand btn-full" onClick={handleGerar}><Icon name="download" size={16} />Gerar PDF</button>
      </div>
    </div>
  );
}
