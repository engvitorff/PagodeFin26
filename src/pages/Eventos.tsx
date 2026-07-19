import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { MapPicker } from '@/components/ui/MapPicker';
import { FilterBar, filterButtonStyle, filterSelectStyle } from '@/components/ui/FilterBar';
import { useAppData } from '@/context/AppDataContext';
import { fmt, isOverdue, mesLabel, parseCents, parseDateLocal } from '@/lib/format';

export function Eventos() {
  const { eventos, addEvento } = useAppData();
  const navigate = useNavigate();
  const [filterAno, setFilterAno] = useState('all');
  const [filterMes, setFilterMes] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);

  const anos = useMemo(() => {
    const s = new Set<string>();
    eventos.forEach((e) => s.add(String(parseDateLocal(e.date).getFullYear())));
    return Array.from(s).sort();
  }, [eventos]);

  const filtered = eventos
    .filter((e) => {
      const d = parseDateLocal(e.date);
      if (filterAno !== 'all' && String(d.getFullYear()) !== filterAno) return false;
      if (filterMes !== 'all' && String(d.getMonth() + 1).padStart(2, '0') !== filterMes) return false;
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'A receber' ? -1 : 1;
      return a.date.localeCompare(b.date);
    });

  return (
    <div>
      <FilterBar>
        <select value={filterAno} onChange={(e) => setFilterAno(e.target.value)} style={filterSelectStyle}>
          <option value="all">Todos os anos</option>
          {anos.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterMes} onChange={(e) => setFilterMes(e.target.value)} style={filterSelectStyle}>
          <option value="all">Todos os meses</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={String(i + 1).padStart(2, '0')}>{mesLabel(i)}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={filterSelectStyle}>
          <option value="all">Todos</option>
          <option value="A receber">A receber</option>
          <option value="Recebido">Recebido</option>
        </select>
        <button
          className="btn btn-brand btn-sm"
          style={{ ...filterButtonStyle, width: 44 }}
          onClick={() => setShowModal(true)}
          aria-label="Novo evento"
          title="Novo evento"
        >
          <Icon name="plus" size={20} />
        </button>
      </FilterBar>

      <div>
        {filtered.length === 0 && <div className="faint">Nenhum evento encontrado.</div>}
        {filtered.map((ev) => {
          const d = parseDateLocal(ev.date);
          const overdue = isOverdue(ev.date, ev.status);
          return (
            <div key={ev.id} className="ag-show-card" onClick={() => navigate(`/eventos/${ev.id}`)}>
              <div className="ag-date-badge" style={overdue ? { background: 'var(--danger)' } : undefined}>
                <div className="mo">{mesLabel(d.getMonth())}</div>
                <div className="dy">{d.getDate()}</div>
              </div>
              <div className="grow">
                <div className="row-name">{ev.contractorName}</div>
                <div className="row-sub">
                  {ev.time}{(ev.location || ev.locationLink) ? ' · ' : ''}
                  {ev.locationLink
                    ? <a
                        href={ev.locationLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: 'var(--brand-ink)', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                      >
                        <Icon name="map" size={12} />Ver localização
                      </a>
                    : ev.location}
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{fmt(ev.totalValueCents)}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {overdue && <span className="overdue-tag">Atrasado</span>}
                  <span className={`badge ${ev.status === 'Recebido' ? 'badge-ok' : 'badge-warn'}`}>{ev.status}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <NovoEventoModal
          onClose={() => setShowModal(false)}
          onSave={async (payload) => {
            const created = await addEvento(payload);
            setShowModal(false);
            if (created) navigate(`/eventos/${created.id}`);
          }}
        />
      )}
    </div>
  );
}

function NovoEventoModal({ onClose, onSave }: { onClose: () => void; onSave: (payload: Parameters<ReturnType<typeof useAppData>['addEvento']>[0]) => void }) {
  const [contractorName, setContractorName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [locationLink, setLocationLink] = useState('');
  const [valor, setValor] = useState('');
  const [auto, setAuto] = useState(true);
  const [mapOpen, setMapOpen] = useState(false);

  function handleSave() {
    if (!contractorName || !date) return;
    onSave({
      contractorName,
      date,
      time: time || '20:00',
      location,
      locationLink,
      totalValueCents: parseCents(valor),
      status: 'A receber',
      operationalExpensesCents: 0,
      customExpenses: [],
      bandFundCents: 0,
      bandFundMode: auto ? 'auto' : 'manual',
      bandFundPercent: null,
      bandFundPercentBase: null,
    });
  }

  return (
    <Modal title="Novo Show" onClose={onClose}>
      <div className="field">
        <label>Contratante</label>
        <input value={contractorName} onChange={(e) => setContractorName(e.target.value)} placeholder="Nome do contratante" />
      </div>
      <div className="grid2">
        <div className="field">
          <label>Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Horário</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Local</label>
        <div className="row gap8">
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Endereço ou nome do local" style={{ flex: 1 }} />
          <button className="btn btn-sm" type="button" onClick={() => setMapOpen(true)} title="Selecionar no mapa">
            <Icon name="map" size={14} />Mapa
          </button>
        </div>
        {locationLink && (
          <a href={locationLink} target="_blank" rel="noreferrer" className="faint" style={{ fontSize: 11, marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="link" size={11} />Ver no Google Maps
          </a>
        )}
      </div>
      <div className="field">
        <label>Valor (R$)</label>
        <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" />
      </div>
      <div className="row between mb18">
        <label style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 500 }}>Caixa da banda automático</label>
        <div className={`toggle${auto ? ' on' : ''}`} onClick={() => setAuto((v) => !v)}>
          <div className="knob" />
        </div>
      </div>
      <button className="btn btn-brand btn-full" onClick={handleSave}>Salvar</button>

      {mapOpen && (
        <MapPicker
          initialQuery={location}
          onClose={() => setMapOpen(false)}
          onConfirm={({ address, link }) => { setLocation(address); setLocationLink(link); setMapOpen(false); }}
        />
      )}
    </Modal>
  );
}
