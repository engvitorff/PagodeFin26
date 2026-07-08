import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useAppData } from '@/context/AppDataContext';
import { calcBordero } from '@/lib/calc';
import { fmt, fmtDate, mesLabel, parseDateLocal } from '@/lib/format';

type StatusFilter = 'todos' | 'receber' | 'recebido';

export function Relatorio() {
  const { eventos, musicos } = useAppData();
  const navigate = useNavigate();
  const [musicoId, setMusicoId] = useState(musicos[0]?.id ?? '');
  const [ano, setAno] = useState('all');
  const [mes, setMes] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');

  const anos = useMemo(() => {
    const s = new Set<string>();
    eventos.forEach((e) => s.add(String(parseDateLocal(e.date).getFullYear())));
    return Array.from(s).sort();
  }, [eventos]);

  function matchesStatus(status: string): boolean {
    if (statusFilter === 'receber') return status === 'A receber';
    if (statusFilter === 'recebido') return status === 'Recebido';
    return true;
  }

  // Toda a tela deriva de `rows` (totais, gráfico e lista), então o filtro de
  // status entra aqui, junto com músico/ano/mês, e o resto acompanha sozinho.
  const rows = useMemo(() => {
    const musico = musicos.find((m) => m.id === musicoId);
    if (!musico) return [];
    return eventos
      .filter((ev) => {
        const d = parseDateLocal(ev.date);
        if (ano !== 'all' && String(d.getFullYear()) !== ano) return false;
        if (mes !== 'all' && String(d.getMonth() + 1).padStart(2, '0') !== mes) return false;
        if (!matchesStatus(ev.status)) return false;
        return ev.scheduledMusicians.some((s) => s.musicianId === musicoId);
      })
      .map((ev) => {
        const schedule = ev.scheduledMusicians.find((s) => s.musicianId === musicoId)!;
        const bordero = calcBordero(ev, musicos);
        const bruto = musico.role === 'Sócio' ? Math.max(0, bordero.cotaSocio) : schedule.feeOverrideCents;
        const descontos = schedule.otherExpensesCents;
        const liquido = Math.max(0, bruto - descontos);
        return { evento: ev, bruto, descontos, liquido, status: schedule.paymentStatus };
      })
      .sort((a, b) => b.evento.date.localeCompare(a.evento.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos, musicos, musicoId, ano, mes, statusFilter]);

  const totals = rows.reduce(
    (acc, r) => ({ bruto: acc.bruto + r.bruto, descontos: acc.descontos + r.descontos, liquido: acc.liquido + r.liquido }),
    { bruto: 0, descontos: 0, liquido: 0 }
  );
  const maxBar = Math.max(1, totals.bruto, totals.descontos, totals.liquido);

  function handleExport() {
    const musico = musicos.find((m) => m.id === musicoId);
    const lines = rows.map((r) => `${r.evento.date} | ${r.evento.contractorName} | ${fmt(r.bruto)} | ${fmt(r.descontos)} | ${fmt(r.liquido)} | ${r.status}`);
    const content = [`Relatório - ${musico?.name}`, ...lines].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${musico?.name ?? 'musico'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="rel-filters mb16">
        <select value={musicoId} onChange={(e) => setMusicoId(e.target.value)} className="rel-filter">
          {musicos.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={ano} onChange={(e) => setAno(e.target.value)} className="rel-filter">
          <option value="all">Todos os anos</option>
          {anos.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={(e) => setMes(e.target.value)} className="rel-filter">
          <option value="all">Todos os meses</option>
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{mesLabel(i)}</option>)}
        </select>
        <button className="btn btn-sm rel-export" onClick={handleExport}>
          <Icon name="download" size={14} />
          <span className="rel-export-label">Exportar</span>
        </button>
      </div>

      <div className="row gap6 mb16" style={{ flexWrap: 'wrap' }}>
        <button className={`ag-filter${statusFilter === 'todos' ? ' on' : ''}`} onClick={() => setStatusFilter('todos')}>Todos</button>
        <button className={`ag-filter${statusFilter === 'receber' ? ' on' : ''}`} onClick={() => setStatusFilter('receber')}>A receber</button>
        <button className={`ag-filter${statusFilter === 'recebido' ? ' on' : ''}`} onClick={() => setStatusFilter('recebido')}>Recebido</button>
      </div>

      <div className="card mb18">
        <div className="brow">
          <span className="metric-lab" style={{ marginBottom: 0 }}><Icon name="calendar" size={14} />Shows realizados</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{rows.length}</span>
        </div>
        <div className="brow">
          <span className="metric-lab" style={{ marginBottom: 0 }}><Icon name="cash" size={14} />Cachê bruto</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{fmt(totals.bruto)}</span>
        </div>
        <div className="brow">
          <span className="metric-lab" style={{ marginBottom: 0 }}><Icon name="out" size={14} />Descontos</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--danger)' }}>{fmt(totals.descontos)}</span>
        </div>
        <div className="brow">
          <span className="metric-lab" style={{ marginBottom: 0 }}><Icon name="in" size={14} />Líquido</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--success)' }}>{fmt(totals.liquido)}</span>
        </div>
      </div>

      <div className="chart-wrap mb18">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Cachê vs Descontos</div>
        {[
          { label: 'Bruto', value: totals.bruto, color: 'var(--brand)' },
          { label: 'Descontos', value: totals.descontos, color: 'var(--danger)' },
          { label: 'Líquido', value: totals.liquido, color: 'var(--success)' },
        ].map((b) => (
          <div key={b.label} className="row gap12 mb8">
            <div style={{ width: 70, fontSize: 12, color: 'var(--text-dim)' }}>{b.label}</div>
            <div className="chart-bar grow" style={{ height: 14 }}>
              <div className="fill" style={{ width: `${(b.value / maxBar) * 100}%`, background: b.color }} />
            </div>
            <div style={{ width: 90, textAlign: 'right', fontSize: 12, fontWeight: 600 }}>{fmt(b.value)}</div>
          </div>
        ))}
      </div>

      <div>
        {rows.length === 0 && <div className="faint">Nenhum show encontrado para este período.</div>}
        {rows.map((r) => {
          const d = parseDateLocal(r.evento.date);
          return (
            <div key={r.evento.id} className="ag-show-card" onClick={() => navigate(`/eventos/${r.evento.id}`)}>
              <div className="ag-date-badge">
                <div className="mo">{mesLabel(d.getMonth())}</div>
                <div className="dy">{d.getDate()}</div>
              </div>
              <div className="grow">
                <div className="row-name">{r.evento.contractorName}</div>
                <div className="row-sub">{fmtDate(r.evento.date)} · Cachê {fmt(r.bruto)} · Descontos {fmt(r.descontos)}</div>
              </div>
              <span className={`badge ${r.status === 'Pago' ? 'badge-ok' : 'badge-warn'}`}>{r.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
