import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { MapPicker } from '@/components/ui/MapPicker';
import { useAppData } from '@/context/AppDataContext';
import { avatarColor, calcBordero, initials } from '@/lib/calc';
import { DESPESA_AVULSA_PRESETS } from '@/data/mocks';
import { fmt, fmtDate, parseCents } from '@/lib/format';
import type { EventStatus } from '@/types';

const OUTRO_DESPESA = '__outro__';

/**
 * Input monetário com estado local: digitação livre (sem reformatar a cada
 * tecla nem gravar no banco por dígito). Persiste apenas ao sair do campo.
 */
function MoneyInput({ cents, onCommit }: { cents: number; onCommit: (cents: number) => void }) {
  const [local, setLocal] = useState(cents ? (cents / 100).toFixed(2) : '');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocal(cents ? (cents / 100).toFixed(2) : '');
  }, [cents, focused]);

  return (
    <input
      type="number"
      step="0.01"
      placeholder="0.00"
      value={local}
      onFocus={() => setFocused(true)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => {
        setFocused(false);
        onCommit(parseCents(e.target.value));
      }}
    />
  );
}

export function EventoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    eventos, musicos, updateEvento, deleteEvento, setEventoStatus,
    addCustomExpense, updateCustomExpense, removeCustomExpense,
    addScheduledMusician, removeScheduledMusician, updateScheduledMusician, payScheduledMusicians,
  } = useAppData();

  const ev = eventos.find((e) => e.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [escalarOpen, setEscalarOpen] = useState(false);
  const [valeScheduleId, setValeScheduleId] = useState<string | null>(null);
  const [pagarOpen, setPagarOpen] = useState(false);
  const [confirmUnpayId, setConfirmUnpayId] = useState<string | null>(null);
  const [cobrancaOpen, setCobrancaOpen] = useState(false);
  const [contratoOpen, setContratoOpen] = useState(false);
  const [freeTextIds, setFreeTextIds] = useState<Set<string>>(new Set());

  const bordero = useMemo(() => (ev ? calcBordero(ev, musicos) : null), [ev, musicos]);

  if (!ev || !bordero) {
    return (
      <div>
        <div className="faint">Evento não encontrado.</div>
        <button className="btn btn-sm mb16" style={{ marginTop: 12 }} onClick={() => navigate('/eventos')}>Voltar</button>
      </div>
    );
  }

  function toggleStatus() {
    setEventoStatus(ev!.id, ev!.status === 'A receber' ? 'Recebido' : 'A receber' as EventStatus);
  }

  function handleDelete() {
    if (confirm(`Excluir o evento "${ev!.contractorName}"?`)) {
      deleteEvento(ev!.id);
      navigate('/eventos');
    }
  }

  const musicoById = new Map(musicos.map((m) => [m.id, m]));
  const escalados = ev.scheduledMusicians.map((s, i) => {
    const m = musicoById.get(s.musicianId);
    const base = m?.role === 'Sócio' ? Math.max(0, bordero.cotaSocio) : s.feeOverrideCents;
    const liquido = Math.max(0, base - s.otherExpensesCents);
    return { schedule: s, musico: m, base, liquido, colorIdx: i };
  });

  const naoEscalados = musicos.filter((m) => !ev.scheduledMusicians.some((s) => s.musicianId === m.id));

  return (
    <div>
      <div className="row between mb18">
        <div className="row gap12">
          <button className="iconbtn" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={() => navigate('/eventos')}>
            <Icon name="back" size={18} />
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{ev.contractorName}</div>
            <div className="faint">
              {fmtDate(ev.date)} · {ev.time}{(ev.location || ev.locationLink) ? ' · ' : ''}
              {ev.locationLink
                ? <a href={ev.locationLink} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-ink)', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="map" size={12} />Ver localização</a>
                : ev.location}
            </div>
          </div>
        </div>
        <div className="row gap6">
          <button className={`btn btn-sm ${ev.status === 'Recebido' ? 'btn-success' : ''}`} onClick={toggleStatus}>{ev.status}</button>
          <button className="btn btn-sm" onClick={() => setEditOpen(true)}><Icon name="edit" size={14} /></button>
          <button className="btn btn-sm btn-danger" onClick={handleDelete}><Icon name="trash" size={14} /></button>
        </div>
      </div>

      <div className="card mb18">
        <div className="brow">
          <span className="metric-lab" style={{ marginBottom: 0 }}><Icon name="cash" size={14} />Valor bruto</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{fmt(ev.totalValueCents)}</span>
        </div>
        <div className="brow">
          <span className="metric-lab" style={{ marginBottom: 0 }}><Icon name="usrplus" size={14} />Cota por sócio</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{fmt(Math.max(0, bordero.cotaSocio))}</span>
        </div>
        <div className="brow">
          <span className="metric-lab" style={{ marginBottom: 0 }}><Icon name="wallet" size={14} />Caixa da banda</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{fmt(Math.max(0, bordero.caixaBanda))}</span>
        </div>
      </div>

      <div className="card mb18">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="settings" size={16} style={{ color: 'var(--brand-ink)' }} />Fechamento do Palco
        </div>
        <div className="field" style={{ marginBottom: 14 }}>
          <div className="row between mb8">
            <label style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)', fontWeight: 500 }}>Caixa (Fundo)</label>
            <button
              className="btn btn-sm"
              style={{ padding: '3px 8px', fontSize: 10, height: 'auto' }}
              onClick={() => updateEvento(ev.id, { isBandFundAuto: !ev.isBandFundAuto })}
            >
              {ev.isBandFundAuto ? 'Auto ✓' : 'Manual'}
            </button>
          </div>
          {ev.isBandFundAuto ? (
            <input type="number" readOnly value={(bordero.caixaBanda / 100).toFixed(2)} />
          ) : (
            <MoneyInput
              key={`fund-${ev.id}`}
              cents={ev.bandFundCents}
              onCommit={(cents) => updateEvento(ev.id, { bandFundCents: cents })}
            />
          )}
        </div>
        <div style={{ marginTop: 4 }}>
          <div className="row between mb8">
            <label style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500 }}>Custos Avulsos</label>
            <button className="btn btn-sm" onClick={() => addCustomExpense(ev.id)}><Icon name="plus" size={12} /> Adicionar Despesa</button>
          </div>
          <div>
            {ev.customExpenses.map((ce) => {
              const isTextMode = freeTextIds.has(ce.id) || (ce.name !== '' && !DESPESA_AVULSA_PRESETS.includes(ce.name));
              return (
                <div key={ce.id} className="row gap8 mb8">
                  <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                    {isTextMode ? (
                      <input
                        placeholder="Descrição" defaultValue={ce.name} autoFocus={freeTextIds.has(ce.id)}
                        onBlur={(e) => updateCustomExpense(ev.id, ce.id, { name: e.target.value })}
                      />
                    ) : (
                      <select
                        value={ce.name}
                        onChange={(e) => {
                          if (e.target.value === OUTRO_DESPESA) {
                            setFreeTextIds((prev) => new Set(prev).add(ce.id));
                          } else {
                            updateCustomExpense(ev.id, ce.id, { name: e.target.value });
                          }
                        }}
                      >
                        <option value="" disabled>Selecionar descrição</option>
                        {DESPESA_AVULSA_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
                        <option value={OUTRO_DESPESA}>Outro (digitar)</option>
                      </select>
                    )}
                  </div>
                  <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                    <MoneyInput cents={ce.cents} onCommit={(cents) => updateCustomExpense(ev.id, ce.id, { cents })} />
                  </div>
                  <button className="iconbtn" onClick={() => removeCustomExpense(ev.id, ce.id)}><Icon name="trash" size={14} /></button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card mb18">
        <div className="row between mb14">
          <div style={{ fontSize: 15, fontWeight: 600 }}>Borderô</div>
          <div className="row gap8">
            <button className="btn btn-sm" onClick={() => setContratoOpen(true)}><Icon name="file" size={14} />Contrato</button>
            <button className="btn btn-sm" style={{ background: 'rgba(34,197,94,.12)', color: 'var(--success)', borderColor: 'rgba(34,197,94,.25)' }} onClick={() => setCobrancaOpen(true)}>
              <Icon name="cash" size={14} />Cobrança
            </button>
            <button className="btn btn-brand btn-sm" onClick={() => setPagarOpen(true)}><Icon name="cash" size={14} />Pagar equipe</button>
          </div>
        </div>
        <div>
          <div className="brow"><span>Faturamento</span><span>{fmt(bordero.faturamento)}</span></div>
          {bordero.operacional > 0 && (
            <div className="brow"><span>Custos operacionais</span><span className="neg">- {fmt(bordero.operacional)}</span></div>
          )}
          {ev.customExpenses.map((ce) => (
            <div className="brow" key={ce.id}><span>{ce.name || 'Despesa avulsa'}</span><span className="neg">- {fmt(ce.cents)}</span></div>
          ))}
          {bordero.freelancersCents > 0 && (
            <div className="brow"><span>Freelancers</span><span className="neg">- {fmt(bordero.freelancersCents)}</span></div>
          )}
          <div className="brow total"><span>Caixa banda</span><span className="pos">{fmt(Math.max(0, bordero.caixaBanda))}</span></div>
          <div className="brow total"><span>Cota por sócio</span><span className="pos">{fmt(Math.max(0, bordero.cotaSocio))}</span></div>
        </div>
      </div>

      <div className="row between mb14">
        <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="music" size={16} style={{ color: 'var(--brand-ink)' }} />Escala ({escalados.length})
        </div>
        <button className="btn btn-sm" onClick={() => setEscalarOpen(true)}><Icon name="usrplus" size={14} />Escalar</button>
      </div>

      {escalados.length === 0 && <div className="faint mb16">Nenhum músico escalado ainda.</div>}
      {escalados.map(({ schedule, musico, base, liquido, colorIdx }) => (
        <div key={schedule.id} className={`ecard${schedule.paymentStatus === 'Pago' ? ' pago' : ''}`}>
          <div className="row gap12">
            <div className="mav" style={{ background: avatarColor(colorIdx) }}>{musico ? initials(musico.name) : '?'}</div>
            <div className="grow">
              <div className="row-name">{musico?.name ?? 'Músico removido'}</div>
              <div className="row-sub">{musico?.instrument} · {musico?.role}</div>
            </div>
            <div className="row gap6">
              {schedule.paymentStatus === 'Pago' ? (
                schedule.paidViaTeam ? (
                  <span className="btn btn-sm btn-success" style={{ cursor: 'default' }} title="Pago via Pagar equipe (gerou transação no Caixa)">
                    <Icon name="lock" size={12} /> Pago
                  </span>
                ) : (
                  <button className="btn btn-sm btn-success" onClick={() => setConfirmUnpayId(schedule.id)} title="Clique para desmarcar">
                    <Icon name="check" size={12} /> Pago
                  </button>
                )
              ) : (
                <button className="btn btn-sm btn-brand" onClick={() => updateScheduledMusician(ev.id, schedule.id, { paymentStatus: 'Pago', paidViaTeam: false })}>Pagar</button>
              )}
              <button className="btn btn-sm" onClick={() => setValeScheduleId(schedule.id)}><Icon name="edit" size={14} /></button>
              <button className="btn btn-sm btn-danger" onClick={() => removeScheduledMusician(ev.id, schedule.id)}><Icon name="trash" size={14} /></button>
            </div>
          </div>
          <div className="ecard-foot">
            <div className="ecard-row"><span>{musico?.role === 'Sócio' ? 'Cota' : 'Cachê base'}</span><span>{fmt(base)}</span></div>
            <div className="ecard-row"><span>Vales/despesas</span><span>- {fmt(schedule.otherExpensesCents)}</span></div>
            <div className="ecard-row total"><span>Líquido</span><span>{fmt(liquido)}</span></div>
          </div>
        </div>
      ))}

      {editOpen && <EditEventoModal evento={ev} onClose={() => setEditOpen(false)} onSave={(patch) => { updateEvento(ev.id, patch); setEditOpen(false); }} />}
      {escalarOpen && (
        <EscalarModal
          candidatos={naoEscalados}
          onClose={() => setEscalarOpen(false)}
          onSave={(musicianId, fee) => { addScheduledMusician(ev.id, musicianId, fee); setEscalarOpen(false); }}
        />
      )}
      {valeScheduleId && (
        <ValeModal
          initial={ev.scheduledMusicians.find((s) => s.id === valeScheduleId)?.otherExpensesCents ?? 0}
          onClose={() => setValeScheduleId(null)}
          onSave={(cents) => { updateScheduledMusician(ev.id, valeScheduleId, { otherExpensesCents: cents }); setValeScheduleId(null); }}
        />
      )}
      {pagarOpen && (
        <PagarModal
          escalados={escalados.filter((e) => e.schedule.paymentStatus === 'Pendente')}
          onClose={() => setPagarOpen(false)}
          onConfirm={(ids) => { payScheduledMusicians(ev.id, ids); setPagarOpen(false); }}
        />
      )}
      {confirmUnpayId && (
        <Modal title="Desmarcar pagamento" onClose={() => setConfirmUnpayId(null)}>
          <div className="mb18" style={{ fontSize: 14, lineHeight: 1.5 }}>
            Marcar este músico como <strong>Pendente</strong> novamente? Isso não altera o Caixa — apenas reverte a marcação manual.
          </div>
          <div className="row gap8">
            <button className="btn btn-full" onClick={() => setConfirmUnpayId(null)}>Cancelar</button>
            <button
              className="btn btn-brand btn-full"
              onClick={() => { updateScheduledMusician(ev.id, confirmUnpayId, { paymentStatus: 'Pendente' }); setConfirmUnpayId(null); }}
            >
              Confirmar
            </button>
          </div>
        </Modal>
      )}
      {cobrancaOpen && <CobrancaModal valor={ev.totalValueCents} onClose={() => setCobrancaOpen(false)} />}
      {contratoOpen && <ContratoModal evento={ev} onClose={() => setContratoOpen(false)} />}
    </div>
  );
}

function EditEventoModal({ evento, onClose, onSave }: { evento: import('@/types').Evento; onClose: () => void; onSave: (patch: Partial<import('@/types').Evento>) => void }) {
  const [contractorName, setContractorName] = useState(evento.contractorName);
  const [date, setDate] = useState(evento.date);
  const [time, setTime] = useState(evento.time);
  const [location, setLocation] = useState(evento.location);
  const [locationLink, setLocationLink] = useState(evento.locationLink);
  const [valor, setValor] = useState((evento.totalValueCents / 100).toFixed(2));
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <Modal title="Editar Show" onClose={onClose}>
      <div className="field"><label>Contratante</label><input value={contractorName} onChange={(e) => setContractorName(e.target.value)} /></div>
      <div className="grid2">
        <div className="field"><label>Data</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="field"><label>Horário</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
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
      <div className="field"><label>Valor (R$)</label><input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
      <button
        className="btn btn-brand btn-full"
        onClick={() => onSave({ contractorName, date, time, location, locationLink, totalValueCents: parseCents(valor) })}
      >
        Salvar alterações
      </button>

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

function EscalarModal({ candidatos, onClose, onSave }: { candidatos: import('@/types').Musico[]; onClose: () => void; onSave: (musicianId: string, fee: number) => void }) {
  const [musicianId, setMusicianId] = useState(candidatos[0]?.id ?? '');
  const [fee, setFee] = useState('');
  const selecionado = candidatos.find((m) => m.id === musicianId);

  return (
    <Modal title="Escalar Músico" onClose={onClose}>
      {candidatos.length === 0 ? (
        <div className="faint mb16">Todos os músicos já estão escalados.</div>
      ) : (
        <>
          <div className="field">
            <label>Músico</label>
            <select value={musicianId} onChange={(e) => setMusicianId(e.target.value)}>
              {candidatos.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.instrument}</option>)}
            </select>
          </div>
          {selecionado?.role === 'Freelancer' && (
            <div className="field"><label>Cachê acordado (R$)</label><input type="number" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0.00" /></div>
          )}
          <button className="btn btn-brand btn-full" onClick={() => onSave(musicianId, parseCents(fee))}>Escalar</button>
        </>
      )}
    </Modal>
  );
}

function ValeModal({ initial, onClose, onSave }: { initial: number; onClose: () => void; onSave: (cents: number) => void }) {
  const [valor, setValor] = useState(initial ? (initial / 100).toFixed(2) : '');
  return (
    <Modal title="Lançar Vale / Despesa" onClose={onClose}>
      <div className="field"><label>Valor (R$)</label><input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" /></div>
      <button className="btn btn-brand btn-full" onClick={() => onSave(parseCents(valor))}>Salvar</button>
    </Modal>
  );
}

function PagarModal({ escalados, onClose, onConfirm }: {
  escalados: { schedule: import('@/types').ScheduledMusician; musico: import('@/types').Musico | undefined; liquido: number }[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(escalados.map((e) => e.schedule.id));
  const total = escalados.filter((e) => selected.includes(e.schedule.id)).reduce((s, e) => s + e.liquido, 0);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <Modal title="Pagar Equipe" onClose={onClose}>
      {escalados.length === 0 ? (
        <div className="faint mb16">Não há pagamentos pendentes.</div>
      ) : (
        <>
          <div className="mb16">
            {escalados.map(({ schedule, musico, liquido }) => (
              <div key={schedule.id} className={`pagar-row${selected.includes(schedule.id) ? ' sel' : ''}`} onClick={() => toggle(schedule.id)}>
                <div className="pagar-check">{selected.includes(schedule.id) && <Icon name="check" size={12} />}</div>
                <div className="grow">
                  <div className="row-name">{musico?.name}</div>
                  <div className="row-sub">{musico?.instrument} · {musico?.role}</div>
                </div>
                <div style={{ fontWeight: 700 }}>{fmt(liquido)}</div>
              </div>
            ))}
          </div>
          <div className="row between mb18"><span className="muted">Total selecionado</span><span style={{ fontWeight: 700, fontSize: 16 }}>{fmt(total)}</span></div>
          <button className="btn btn-brand btn-full" onClick={() => onConfirm(selected)}>Confirmar pagamento</button>
        </>
      )}
    </Modal>
  );
}

function CobrancaModal({ valor, onClose }: { valor: number; onClose: () => void }) {
  const [mode, setMode] = useState<'menu' | 'pix'>('menu');
  return (
    <Modal title="Gerar Cobrança" onClose={onClose}>
      {mode === 'menu' ? (
        <div className="row gap8" style={{ flexDirection: 'column' }}>
          <button className="btn btn-full" onClick={() => setMode('pix')}><Icon name="pix" size={16} />PIX Direto</button>
          <button className="btn btn-full" onClick={() => alert('Link de cobrança gerado (mock): https://mpago.la/exemplo')}><Icon name="link" size={16} />Link Multifôrma</button>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 160, height: 160, background: 'var(--surface-2)', margin: '0 auto 16px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="pix" size={48} style={{ color: 'var(--text-faint)' }} />
          </div>
          <div className="muted mb16">{fmt(valor)}</div>
          <button className="btn btn-brand btn-full" onClick={() => alert('Código PIX copiado!')}>Copiar código PIX</button>
        </div>
      )}
    </Modal>
  );
}

function ContratoModal({ evento, onClose }: { evento: import('@/types').Evento; onClose: () => void }) {
  const { addContrato } = useAppData();
  const [contratante, setContratante] = useState(evento.contractorName);
  const [cnpj, setCnpj] = useState('');
  const [cidade, setCidade] = useState('');

  async function handleGerar() {
    const created = await addContrato({
      eventId: evento.id,
      contractorName: contratante,
      eventDate: evento.date,
      totalValueCents: evento.totalValueCents,
      issuedAt: new Date().toISOString().slice(0, 10),
    });
    if (!created) return;
    alert('Contrato gerado com sucesso!');
    onClose();
  }

  return (
    <Modal title="Configurar Contrato" onClose={onClose}>
      <div className="field"><label>Contratante</label><input value={contratante} onChange={(e) => setContratante(e.target.value)} /></div>
      <div className="grid2">
        <div className="field"><label>CNPJ/CPF</label><input value={cnpj} onChange={(e) => setCnpj(e.target.value)} /></div>
        <div className="field"><label>Cidade</label><input value={cidade} onChange={(e) => setCidade(e.target.value)} /></div>
      </div>
      <button className="btn btn-brand btn-full" onClick={handleGerar}>Gerar contrato</button>
    </Modal>
  );
}
