import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { FilterBar, filterButtonStyle, filterSelectStyle } from '@/components/ui/FilterBar';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { supabase } from '@/lib/supabase';
import { calcBordero } from '@/lib/calc';
import { fmt, fmtDate, mesLabel, parseDateLocal } from '@/lib/format';

type StatusFilter = 'todos' | 'receber' | 'recebido';

interface BaseRow {
  eventoId: string;
  date: string;
  contractorName: string;
  bruto: number;
  descontos: number;
  paymentStatus: string; // Pago/Pendente do próprio músico naquele show — é o que os filtros usam
  clickable: boolean;
}

interface MeuRelatorioRow {
  evento_id: string;
  event_date: string;
  contractor_name: string;
  bruto_cents: number;
  descontos_cents: number;
  payment_status: string;
}

// Tela dupla: Admin vê o relatório de qualquer músico do elenco (seletor +
// dados completos, já em memória via useAppData). Papel "View" (músico do
// elenco com acesso restrito) vê só a própria conta, sem seletor — a RLS
// bloqueia leitura direta de eventos/músicos pra esse papel, então os dados
// vêm de get_my_relatorio() (RPC security definer, mesmo padrão de
// MinhaAgenda), que nunca devolve faturamento do evento nem valor de
// outros músicos.
export function Relatorio() {
  const { group } = useAuth();
  const navigate = useNavigate();
  const isAdmin = group?.role === 'Admin';
  const { eventos, musicos } = useAppData();

  const [musicoId, setMusicoId] = useState('');
  const [ano, setAno] = useState('all');
  const [mes, setMes] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');

  const [viewLoading, setViewLoading] = useState(!isAdmin);
  const [viewMusico, setViewMusico] = useState<{ id: string; name: string } | null>(null);
  const [viewRows, setViewRows] = useState<MeuRelatorioRow[]>([]);

  useEffect(() => {
    if (isAdmin) {
      setMusicoId((cur) => cur || musicos[0]?.id || '');
      return;
    }
    let active = true;
    (async () => {
      const { data: musicoData } = await supabase.rpc('get_my_musico');
      const meu = (musicoData as { id: string; name: string }[] | null)?.[0] ?? null;
      if (!active) return;
      setViewMusico(meu);
      if (meu) {
        const { data: relatorioData } = await supabase.rpc('get_my_relatorio');
        if (!active) return;
        setViewRows((relatorioData as MeuRelatorioRow[] | null) ?? []);
      }
      if (active) setViewLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // O filtro reflete se o MÚSICO já recebeu o cachê dele naquele show
  // (paymentStatus: Pago/Pendente — o mesmo badge exibido no card), não se
  // o contratante já pagou o evento como um todo (isso é outro status,
  // do evento, que não aparece aqui).
  function matchesStatus(paymentStatus: string): boolean {
    if (statusFilter === 'receber') return paymentStatus === 'Pendente';
    if (statusFilter === 'recebido') return paymentStatus === 'Pago';
    return true;
  }

  const baseRows: BaseRow[] = useMemo(() => {
    if (isAdmin) {
      const musico = musicos.find((m) => m.id === musicoId);
      if (!musico) return [];
      return eventos
        .filter((ev) => ev.scheduledMusicians.some((s) => s.musicianId === musicoId))
        .map((ev) => {
          const schedule = ev.scheduledMusicians.find((s) => s.musicianId === musicoId)!;
          const bordero = calcBordero(ev, musicos);
          const bruto = musico.role === 'Sócio' ? Math.max(0, bordero.cotaSocio) : schedule.feeOverrideCents;
          return {
            eventoId: ev.id, date: ev.date, contractorName: ev.contractorName,
            bruto, descontos: schedule.otherExpensesCents, paymentStatus: schedule.paymentStatus, clickable: true,
          };
        });
    }
    return viewRows.map((r) => ({
      eventoId: r.evento_id, date: r.event_date, contractorName: r.contractor_name,
      bruto: r.bruto_cents, descontos: r.descontos_cents, paymentStatus: r.payment_status, clickable: false,
    }));
  }, [isAdmin, eventos, musicos, musicoId, viewRows]);

  const anos = useMemo(() => {
    const s = new Set<string>();
    baseRows.forEach((r) => s.add(String(parseDateLocal(r.date).getFullYear())));
    return Array.from(s).sort();
  }, [baseRows]);

  // Toda a tela deriva de `rows` (totais, gráfico e lista), então o filtro de
  // status entra aqui, junto com ano/mês, e o resto acompanha sozinho.
  const rows = useMemo(() => {
    return baseRows
      .filter((r) => {
        const d = parseDateLocal(r.date);
        if (ano !== 'all' && String(d.getFullYear()) !== ano) return false;
        if (mes !== 'all' && String(d.getMonth() + 1).padStart(2, '0') !== mes) return false;
        if (!matchesStatus(r.paymentStatus)) return false;
        return true;
      })
      .map((r) => ({ ...r, liquido: Math.max(0, r.bruto - r.descontos) }))
      .sort((a, b) => b.date.localeCompare(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseRows, ano, mes, statusFilter]);

  const totals = rows.reduce(
    (acc, r) => ({ bruto: acc.bruto + r.bruto, descontos: acc.descontos + r.descontos, liquido: acc.liquido + r.liquido }),
    { bruto: 0, descontos: 0, liquido: 0 }
  );
  const maxBar = Math.max(1, totals.bruto, totals.descontos, totals.liquido);

  const nomeAtual = isAdmin ? musicos.find((m) => m.id === musicoId)?.name : viewMusico?.name;

  function handleExport() {
    const lines = rows.map((r) => `${r.date} | ${r.contractorName} | ${fmt(r.bruto)} | ${fmt(r.descontos)} | ${fmt(r.liquido)} | ${r.paymentStatus}`);
    const content = [`Relatório - ${nomeAtual ?? ''}`, ...lines].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${nomeAtual ?? 'musico'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!isAdmin && viewLoading) {
    return <div className="faint">Carregando relatório...</div>;
  }

  if (!isAdmin && !viewMusico) {
    return (
      <div className="card">
        <div className="faint">
          Você ainda não foi vinculado a um músico do elenco. Peça para um Admin do grupo fazer esse vínculo.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Filtros: mesma posição/espaçamento fixo da barra em Painel/Eventos/Caixa.
          5 campos (músico, ano, mês, status, exportar) — quebra linha em telas
          estreitas em vez de truncar tudo de forma ilegível. */}
      <FilterBar wrap>
        {isAdmin ? (
          <select value={musicoId} onChange={(e) => setMusicoId(e.target.value)} style={filterSelectStyle}>
            {musicos.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        ) : (
          <div style={{ ...filterSelectStyle, display: 'flex', alignItems: 'center' }}>{viewMusico?.name}</div>
        )}
        <select value={ano} onChange={(e) => setAno(e.target.value)} style={filterSelectStyle}>
          <option value="all">Todos os anos</option>
          {anos.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={(e) => setMes(e.target.value)} style={filterSelectStyle}>
          <option value="all">Todos os meses</option>
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{mesLabel(i)}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} style={filterSelectStyle}>
          <option value="todos">Todos</option>
          <option value="receber">A receber</option>
          <option value="recebido">Recebido</option>
        </select>
        <button className="btn btn-sm" style={{ ...filterButtonStyle, width: 34 }} onClick={handleExport} aria-label="Exportar" title="Exportar">
          <Icon name="download" size={16} />
        </button>
      </FilterBar>

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
          const d = parseDateLocal(r.date);
          return (
            <div
              key={r.eventoId}
              className="ag-show-card"
              style={r.clickable ? undefined : { cursor: 'default' }}
              onClick={r.clickable ? () => navigate(`/eventos/${r.eventoId}`) : undefined}
            >
              <div className="ag-date-badge">
                <div className="mo">{mesLabel(d.getMonth())}</div>
                <div className="dy">{d.getDate()}</div>
              </div>
              <div className="grow">
                <div className="row-name">{r.contractorName}</div>
                <div className="row-sub">{fmtDate(r.date)} · Cachê {fmt(r.bruto)} · Descontos {fmt(r.descontos)}</div>
              </div>
              <span className={`badge ${r.paymentStatus === 'Pago' ? 'badge-ok' : 'badge-warn'}`}>{r.paymentStatus}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
