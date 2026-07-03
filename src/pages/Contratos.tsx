import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useAppData } from '@/context/AppDataContext';
import { fmt, fmtDate } from '@/lib/format';

export function Contratos() {
  const { contratos } = useAppData();
  const navigate = useNavigate();
  const sorted = [...contratos].sort((a, b) => b.sequenceNumber - a.sequenceNumber);

  return (
    <div>
      <div className="row between mb16">
        <div className="muted">Contratos emitidos</div>
        <button className="btn btn-brand btn-sm" onClick={() => navigate('/contratos/novo')}><Icon name="plus" size={14} />Gerar contrato</button>
      </div>

      <div className="listcard">
        {sorted.length === 0 && <div className="faint" style={{ padding: '16px 0' }}>Nenhum contrato emitido ainda.</div>}
        {sorted.map((c) => (
          <div className="listrow" key={c.id}>
            <div className="thumb"><Icon name="file" size={16} /></div>
            <div className="grow">
              <div className="row-name">#{String(c.sequenceNumber).padStart(4, '0')} · {c.contractorName}</div>
              <div className="row-sub">{fmtDate(c.eventDate)} · {fmt(c.totalValueCents)}</div>
            </div>
            <button className="iconbtn" onClick={() => alert('PDF gerado com sucesso! (mock)')}><Icon name="download" size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
