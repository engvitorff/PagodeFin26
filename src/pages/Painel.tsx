import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useAppData } from '@/context/AppDataContext';
import { calcBordero, GANTT_COLORS, PIZZA_COLORS } from '@/lib/calc';
import { DIAS_SEMANA, fmt, fmtDateShort, mesLabel, parseDateLocal, todayStr } from '@/lib/format';

type StatusFilter = 'todos' | 'receber' | 'recebido';

export function Painel() {
  const { eventos, transacoes, musicos } = useAppData();
  const navigate = useNavigate();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [ganttDate, setGanttDate] = useState<string | null>(null);
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const [activeSeg, setActiveSeg] = useState<number | null>(null);

  const caixaBandaSaldo = transacoes.reduce((sum, t) => sum + (t.type === 'IN' ? t.amountCents : -t.amountCents), 0);
  const aReceber = eventos.filter((e) => e.status === 'A receber').reduce((s, e) => s + e.totalValueCents, 0);
  const faturamentoTotal = eventos.reduce((s, e) => s + e.totalValueCents, 0);

  const metrics = [
    { label: 'Caixa da banda', value: caixaBandaSaldo, icon: 'wallet' },
    { label: 'A receber', value: aReceber, icon: 'clock' },
    { label: 'Faturamento total', value: faturamentoTotal, icon: 'chart' },
  ];

  // Receita mensal - últimos 6 meses
  const monthlyRevenue = useMemo(() => {
    const months: { label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const total = eventos
        .filter((e) => {
          const ed = parseDateLocal(e.date);
          return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
        })
        .reduce((s, e) => s + e.totalValueCents, 0);
      months.push({ label: mesLabel(d.getMonth()), total });
    }
    return months;
  }, [eventos]);
  const maxRevenue = Math.max(1, ...monthlyRevenue.map((m) => m.total));

  // Divisão de custos (pizza)
  const costSplit = useMemo(() => {
    let caixa = 0, operacional = 0, freelancers = 0, socios = 0;
    for (const ev of eventos) {
      const b = calcBordero(ev, musicos);
      caixa += Math.max(0, b.caixaBanda);
      operacional += b.operacional + b.customTotal;
      freelancers += b.freelancersCents;
      socios += Math.max(0, b.cotaSocio) * b.numSocios;
    }
    const segments = [
      { label: 'Caixa banda', value: caixa, color: PIZZA_COLORS.caixa },
      { label: 'Operacional', value: operacional, color: PIZZA_COLORS.operacional },
      { label: 'Freelancers', value: freelancers, color: PIZZA_COLORS.freelancers },
      { label: 'Sócios', value: socios, color: PIZZA_COLORS.socios },
    ].filter((s) => s.value > 0);
    return segments;
  }, [eventos, musicos]);
  // Base do percentual = Faturamento total (não a soma das próprias fatias) -- assim, se
  // shows com prejuízo empurrarem os custos acima do faturamento, isso aparece nos números
  // em vez de ser mascarado por uma normalização que sempre soma 100%.
  const pizzaTotal = faturamentoTotal || 1;

  // Agenda
  const filteredEventos = eventos.filter((e) => {
    if (statusFilter === 'receber') return e.status === 'A receber';
    if (statusFilter === 'recebido') return e.status === 'Recebido';
    return true;
  });

  const monthEventos = filteredEventos
    .filter((e) => {
      const d = parseDateLocal(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof eventos>();
    for (const e of monthEventos) {
      const arr = map.get(e.date) || [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [monthEventos]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  const today = todayStr();

  const yearsAvailable = useMemo(() => {
    const s = new Set<number>();
    eventos.forEach((e) => s.add(parseDateLocal(e.date).getFullYear()));
    s.add(now.getFullYear());
    return Array.from(s).sort();
  }, [eventos]);

  function navMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
    setGanttDate(null);
  }

  function dateStr(d: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function openGantt(ds: string) {
    if (eventsByDate.has(ds)) setGanttDate(ds);
  }

  const ganttEventos = ganttDate ? (eventsByDate.get(ganttDate) || []) : [];

  return (
    <div>
      <div className="card mb18">
        {metrics.map((m) => (
          <div className="brow" key={m.label}>
            <span className="metric-lab" style={{ marginBottom: 0 }}><Icon name={m.icon} size={14} />{m.label}</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{fmt(m.value)}</span>
          </div>
        ))}
      </div>

      <div className="grid2" style={{ gap: 14, marginBottom: 22 }}>
        <div className="chart-wrap">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Receita mensal</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 80 }} onClick={() => setActiveBar(null)}>
            {monthlyRevenue.map((m, i) => (
              <div
                key={i}
                style={{ flex: 1, position: 'relative', cursor: 'pointer' }}
                onMouseEnter={() => setActiveBar(i)}
                onMouseLeave={() => setActiveBar(null)}
                onClick={(e) => { e.stopPropagation(); setActiveBar((cur) => (cur === i ? null : i)); }}
              >
                <div className="chart-bar" style={{ height: `${Math.max(4, (m.total / maxRevenue) * 80)}px` }}>
                  <div className="fill" style={{ width: '100%', background: m.total > 0 ? 'var(--brand)' : 'var(--surface-3)' }} />
                </div>
                {activeBar === i && <div className="chart-tip">{fmt(m.total)}</div>}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
            {monthlyRevenue.map((m, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--text-faint)' }}>{m.label}</div>
            ))}
          </div>
        </div>
        <div className="chart-wrap" onClick={() => setActiveSeg(null)}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Divisão de custos</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
              <PizzaChart
                segments={costSplit}
                total={pizzaTotal}
                activeIndex={activeSeg}
                onHover={setActiveSeg}
                onLeave={() => setActiveSeg(null)}
                onToggle={(i) => setActiveSeg((cur) => (cur === i ? null : i))}
              />
              {activeSeg !== null && costSplit[activeSeg] && (
                <div
                  style={{
                    position: 'absolute', top: 0, bottom: 0, left: -45, right: -45,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    textAlign: 'center', gap: 1, pointerEvents: 'none',
                  }}
                >
                  <div className="faint" style={{ fontSize: 9, whiteSpace: 'nowrap' }}>{costSplit[activeSeg].label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{fmt(costSplit[activeSeg].value)}</div>
                  <div className="muted" style={{ fontSize: 10, fontWeight: 600 }}>{Math.round((costSplit[activeSeg].value / pizzaTotal) * 100)}%</div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              {costSplit.length === 0 && <div className="faint">Sem dados</div>}
              {costSplit.map((s, i) => (
                <div
                  key={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', opacity: activeSeg === null || activeSeg === i ? 1 : 0.5 }}
                  onMouseEnter={() => setActiveSeg(i)}
                  onMouseLeave={() => setActiveSeg(null)}
                  onClick={(e) => { e.stopPropagation(); setActiveSeg((cur) => (cur === i ? null : i)); }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                  <span className="muted" style={{ flex: 1 }}>{s.label}</span>
                  <span style={{ fontWeight: 600 }}>{Math.round((s.value / pizzaTotal) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!ganttDate ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{ padding: '5px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text)', height: 34 }}
            >
              {yearsAvailable.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              style={{ padding: '5px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text)', height: 34, minWidth: 110 }}
            >
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{mesLabel(i, true)}</option>)}
            </select>
            <div style={{ flex: 1, minWidth: 12 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button className={`ag-filter${statusFilter === 'todos' ? ' on' : ''}`} onClick={() => setStatusFilter('todos')}>Todos</button>
              <button className={`ag-filter${statusFilter === 'receber' ? ' on' : ''}`} onClick={() => setStatusFilter('receber')}>A receber</button>
              <button className={`ag-filter${statusFilter === 'recebido' ? ' on' : ''}`} onClick={() => setStatusFilter('recebido')}>Recebido</button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 15, fontWeight: 600 }}>
              <Icon name="calendar" size={16} style={{ color: 'var(--brand-ink)' }} />
              <span>{mesLabel(month, true)} de {year}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => navMonth(-1)} style={navBtnStyle}><Icon name="back" size={13} /></button>
              <button onClick={() => navMonth(1)} style={{ ...navBtnStyle, transform: 'scaleX(-1)' }}><Icon name="back" size={13} /></button>
            </div>
          </div>

          <div className="ag-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
                {DIAS_SEMANA.map((d, i) => <div className="ag-dh" key={i}>{d}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px 0' }}>
                {calendarCells.map((d, i) => {
                  if (d === null) return <div key={i} className="ag-cell empty" />;
                  const ds = dateStr(d);
                  const hasShow = eventsByDate.has(ds);
                  const isToday = ds === today;
                  return (
                    <div
                      key={i}
                      className={`ag-cell${isToday ? ' today' : ''}${hasShow ? ' has-show' : ''}`}
                      onClick={() => openGantt(ds)}
                    >
                      {d}
                      {hasShow && <span className="ag-dot" />}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Shows Filtrados</div>
                <span onClick={() => navigate('/eventos')} style={{ fontSize: 12, color: 'var(--brand-ink)', cursor: 'pointer', fontWeight: 600 }}>VER TODOS</span>
              </div>
              <div>
                {monthEventos.length === 0 && <div className="faint">Nenhum show neste mês.</div>}
                {monthEventos.map((ev) => {
                  const d = parseDateLocal(ev.date);
                  return (
                    <div key={ev.id} className="ag-show-card" onClick={() => navigate(`/eventos/${ev.id}`)}>
                      <div className="ag-date-badge">
                        <div className="mo">{mesLabel(d.getMonth())}</div>
                        <div className="dy">{d.getDate()}</div>
                      </div>
                      <div className="grow">
                        <div className="row-name">{ev.contractorName}</div>
                        <div className="row-sub">{ev.time} · {ev.location}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{fmt(ev.totalValueCents)}</div>
                        <span className={`badge ${ev.status === 'Recebido' ? 'badge-ok' : 'badge-warn'}`}>{ev.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <button onClick={() => setGanttDate(null)} style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="back" size={16} />
            </button>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtDateShort(ganttDate)}</div>
              <div className="faint">{ganttEventos.length} show(s) neste dia</div>
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, overflow: 'hidden' }}>
            <GanttChart eventos={ganttEventos} onSelect={(id) => navigate(`/eventos/${id}`)} />
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)',
  color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

function PizzaChart({ segments, total, activeIndex, onHover, onLeave, onToggle }: {
  segments: { label: string; value: number; color: string }[];
  total: number;
  activeIndex: number | null;
  onHover: (i: number) => void;
  onLeave: () => void;
  onToggle: (i: number) => void;
}) {
  if (segments.length === 0) {
    return (
      <svg viewBox="0 0 80 80" width="80" height="80" style={{ flexShrink: 0 }}>
        <circle cx="40" cy="40" r="36" fill="none" stroke="var(--surface-3)" strokeWidth="8" />
      </svg>
    );
  }
  let cumulative = 0;
  const r = 36;
  const circumference = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" width="80" height="80" style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
      {segments.map((s, i) => {
        const frac = s.value / total;
        const dash = frac * circumference;
        const offset = cumulative * circumference;
        cumulative += frac;
        return (
          <circle
            key={s.label}
            cx="40" cy="40" r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="8"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            style={{ cursor: 'pointer', opacity: activeIndex === null || activeIndex === i ? 1 : 0.4, transition: 'opacity .15s' }}
            onMouseEnter={() => onHover(i)}
            onMouseLeave={onLeave}
            onClick={(e) => { e.stopPropagation(); onToggle(i); }}
          >
            <title>{s.label}: {fmt(s.value)}</title>
          </circle>
        );
      })}
    </svg>
  );
}

function GanttChart({ eventos, onSelect }: { eventos: { id: string; contractorName: string; time: string }[]; onSelect: (id: string) => void }) {
  if (eventos.length === 0) return <div className="faint">Nenhum show neste dia.</div>;
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const times = eventos.map((e) => toMinutes(e.time));
  const minT = Math.min(...times) - 30;
  const maxT = Math.max(...times) + 120;
  const span = Math.max(60, maxT - minT);

  return (
    <div style={{ position: 'relative', paddingLeft: 48, height: eventos.length * 56 + 20 }}>
      {eventos.map((ev, i) => {
        const start = toMinutes(ev.time);
        const leftPct = ((start - minT) / span) * 100;
        const widthPct = (120 / span) * 100;
        return (
          <div key={ev.id} style={{ position: 'relative', height: 48, marginBottom: 8 }}>
            <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-faint)', width: 40 }}>
              {ev.time}
            </div>
            <div
              className="gantt-bar"
              onClick={() => onSelect(ev.id)}
              style={{
                position: 'absolute',
                left: `calc(48px + ${leftPct}%)`,
                width: `${widthPct}%`,
                minWidth: 90,
                top: 0,
                height: 40,
                background: GANTT_COLORS[i % GANTT_COLORS.length],
                cursor: 'pointer',
              }}
            >
              {ev.contractorName}
            </div>
          </div>
        );
      })}
    </div>
  );
}
