import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Clausula, Contrato, CustomExpense, Evento, EventStatus, Musico, ScheduledMusician, Transacao } from '@/types';
import { CLAUSULAS_DEFAULT } from '@/data/mocks';
import { calcBordero } from '@/lib/calc';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface AppDataContextValue {
  loadingData: boolean;
  saveError: string | null;
  dismissError: () => void;
  musicos: Musico[];
  eventos: Evento[];
  transacoes: Transacao[];
  contratos: Contrato[];
  clausulas: Clausula[];

  addMusico: (m: Omit<Musico, 'id'>) => Promise<void>;
  updateMusico: (id: string, m: Omit<Musico, 'id'>) => Promise<void>;
  deleteMusico: (id: string) => Promise<void>;

  addEvento: (e: Omit<Evento, 'id' | 'scheduledMusicians'>) => Promise<Evento | null>;
  updateEvento: (id: string, patch: Partial<Evento>) => Promise<void>;
  deleteEvento: (id: string) => Promise<void>;
  setEventoStatus: (id: string, status: EventStatus) => Promise<void>;

  addScheduledMusician: (eventoId: string, musicianId: string, feeOverrideCents: number) => Promise<void>;
  removeScheduledMusician: (eventoId: string, scheduleId: string) => Promise<void>;
  updateScheduledMusician: (eventoId: string, scheduleId: string, patch: Partial<ScheduledMusician>) => Promise<void>;
  payScheduledMusicians: (eventoId: string, scheduleIds: string[]) => Promise<void>;

  addCustomExpense: (eventoId: string) => Promise<void>;
  updateCustomExpense: (eventoId: string, expenseId: string, patch: Partial<CustomExpense>) => Promise<void>;
  removeCustomExpense: (eventoId: string, expenseId: string) => Promise<void>;

  addTransacao: (t: Omit<Transacao, 'id'>) => Promise<void>;
  deleteTransacao: (id: string) => Promise<void>;
  importTransacoes: (items: Omit<Transacao, 'id'>[]) => Promise<{ inserted: number; error: string | null }>;

  addContrato: (c: Omit<Contrato, 'id' | 'sequenceNumber'>) => Promise<Contrato | null>;
  setClausulas: (c: Clausula[]) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function mapEventoRow(row: any): Evento {
  return {
    id: row.id,
    contractorName: row.contractor_name,
    date: row.date,
    time: row.time,
    location: row.location,
    locationLink: row.location_link,
    totalValueCents: row.total_value_cents,
    status: row.status,
    operationalExpensesCents: row.operational_expenses_cents,
    bandFundCents: row.band_fund_cents,
    bandFundMode: row.band_fund_mode,
    bandFundPercent: row.band_fund_percent,
    bandFundPercentBase: row.band_fund_percent_base,
    customExpenses: (row.custom_expenses ?? []).map((ce: any) => ({ id: ce.id, name: ce.name, cents: ce.cents })),
    scheduledMusicians: (row.scheduled_musicians ?? []).map((s: any) => ({
      id: s.id,
      musicianId: s.musician_id,
      feeOverrideCents: s.fee_override_cents,
      otherExpensesCents: s.other_expenses_cents,
      paymentStatus: s.payment_status,
      paidViaTeam: s.paid_via_team ?? false,
    })),
  };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { group } = useAuth();
  const [loadingData, setLoadingData] = useState(true);
  const [musicos, setMusicos] = useState<Musico[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [clausulas, setClausulasState] = useState<Clausula[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Aviso inline não-bloqueante (substitui window.alert). Retorna true se houve erro.
  function reportError(error: { message: string } | null): boolean {
    if (!error) return false;
    console.error(error);
    setSaveError(error.message);
    return true;
  }

  useEffect(() => {
    // Usuários "View" (acesso restrito à própria agenda) nunca leem essas
    // tabelas diretamente — a RLS já bloqueia no banco, então nem tenta
    // buscar aqui (evita requisições que sempre voltam vazias).
    if (!group || group.role !== 'Admin') {
      setMusicos([]);
      setEventos([]);
      setTransacoes([]);
      setContratos([]);
      setClausulasState([]);
      setLoadingData(false);
      return;
    }

    let active = true;
    setLoadingData(true);

    (async () => {
      const groupId = group.id;

      const [musicosRes, eventosRes, transacoesRes, contratosRes, clausulasRes] = await Promise.all([
        supabase.from('musicos').select('*').eq('group_id', groupId).order('name'),
        supabase.from('eventos').select('*, custom_expenses(*), scheduled_musicians(*)').eq('group_id', groupId).order('date'),
        supabase.from('transacoes').select('*').eq('group_id', groupId).order('date', { ascending: false }),
        supabase.from('contratos').select('*').eq('group_id', groupId).order('sequence_number'),
        supabase.from('clausulas').select('*').eq('group_id', groupId).order('position'),
      ]);

      if (!active) return;

      if (musicosRes.data) {
        setMusicos(musicosRes.data.map((r: any) => ({ id: r.id, name: r.name, instrument: r.instrument, role: r.role, phone: r.phone, pix: r.pix })));
      }
      if (eventosRes.data) {
        setEventos(eventosRes.data.map(mapEventoRow));
      }
      if (transacoesRes.data) {
        setTransacoes(transacoesRes.data.map((r: any) => ({ id: r.id, description: r.description, amountCents: r.amount_cents, type: r.type, category: r.category, date: r.date, eventoId: r.evento_id ?? undefined, lineItems: r.line_items ?? undefined })));
      }
      if (contratosRes.data) {
        setContratos(contratosRes.data.map((r: any) => ({ id: r.id, eventId: r.event_id, sequenceNumber: r.sequence_number, contractorName: r.contractor_name, eventDate: r.event_date, totalValueCents: r.total_value_cents, issuedAt: r.issued_at })));
      }

      let clausulaRows = clausulasRes.data ?? [];
      if (clausulaRows.length === 0) {
        const seed = CLAUSULAS_DEFAULT.map((c, i) => ({ group_id: groupId, label: c.label, is_on: c.on, position: i }));
        const { data: inserted } = await supabase.from('clausulas').insert(seed).select();
        clausulaRows = inserted ?? [];
      }
      if (active) {
        setClausulasState(clausulaRows.map((r: any) => ({ id: r.id, label: r.label, on: r.is_on })));
        setLoadingData(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [group]);

  const addMusico: AppDataContextValue['addMusico'] = async (m) => {
    if (!group) return;
    const { data, error } = await supabase
      .from('musicos')
      .insert({ group_id: group.id, name: m.name, instrument: m.instrument, role: m.role, phone: m.phone, pix: m.pix })
      .select()
      .single();
    if (reportError(error) || !data) return;
    setMusicos((prev) => [...prev, { id: data.id, name: data.name, instrument: data.instrument, role: data.role, phone: data.phone, pix: data.pix }].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const updateMusico: AppDataContextValue['updateMusico'] = async (id, m) => {
    const { error } = await supabase
      .from('musicos')
      .update({ name: m.name, instrument: m.instrument, role: m.role, phone: m.phone, pix: m.pix })
      .eq('id', id);
    if (reportError(error)) return;
    setMusicos((prev) => prev.map((x) => (x.id === id ? { ...x, ...m } : x)));
  };

  const deleteMusico: AppDataContextValue['deleteMusico'] = async (id) => {
    const { error } = await supabase.from('musicos').delete().eq('id', id);
    if (reportError(error)) return;
    setMusicos((prev) => prev.filter((x) => x.id !== id));
    setEventos((prev) => prev.map((ev) => ({ ...ev, scheduledMusicians: ev.scheduledMusicians.filter((s) => s.musicianId !== id) })));
  };

  const addEvento: AppDataContextValue['addEvento'] = async (e) => {
    if (!group) return null;
    const { data, error } = await supabase
      .from('eventos')
      .insert({
        group_id: group.id,
        contractor_name: e.contractorName,
        date: e.date,
        time: e.time,
        location: e.location,
        location_link: e.locationLink,
        total_value_cents: e.totalValueCents,
        status: e.status,
        operational_expenses_cents: e.operationalExpensesCents,
        band_fund_cents: e.bandFundCents,
        band_fund_mode: e.bandFundMode,
        band_fund_percent: e.bandFundPercent,
        band_fund_percent_base: e.bandFundPercentBase,
      })
      .select()
      .single();
    if (reportError(error) || !data) return null;

    const socios = musicos.filter((m) => m.role === 'Sócio');
    let scheduledMusicians: ScheduledMusician[] = [];
    if (socios.length > 0) {
      const { data: schedules, error: schedError } = await supabase
        .from('scheduled_musicians')
        .insert(socios.map((s) => ({ evento_id: data.id, musician_id: s.id, fee_override_cents: 0, other_expenses_cents: 0, payment_status: 'Pendente', paid_via_team: false })))
        .select();
      if (!reportError(schedError) && schedules) {
        scheduledMusicians = schedules.map((s: any) => ({
          id: s.id,
          musicianId: s.musician_id,
          feeOverrideCents: s.fee_override_cents,
          otherExpensesCents: s.other_expenses_cents,
          paymentStatus: s.payment_status,
          paidViaTeam: s.paid_via_team ?? false,
        }));
      }
    }

    const newEvento: Evento = { ...e, id: data.id, scheduledMusicians };
    setEventos((prev) => [...prev, newEvento].sort((a, b) => a.date.localeCompare(b.date)));
    return newEvento;
  };

  const updateEvento: AppDataContextValue['updateEvento'] = async (id, patch) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.contractorName !== undefined) dbPatch.contractor_name = patch.contractorName;
    if (patch.date !== undefined) dbPatch.date = patch.date;
    if (patch.time !== undefined) dbPatch.time = patch.time;
    if (patch.location !== undefined) dbPatch.location = patch.location;
    if (patch.locationLink !== undefined) dbPatch.location_link = patch.locationLink;
    if (patch.totalValueCents !== undefined) dbPatch.total_value_cents = patch.totalValueCents;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.operationalExpensesCents !== undefined) dbPatch.operational_expenses_cents = patch.operationalExpensesCents;
    if (patch.bandFundCents !== undefined) dbPatch.band_fund_cents = patch.bandFundCents;
    if (patch.bandFundMode !== undefined) dbPatch.band_fund_mode = patch.bandFundMode;
    if (patch.bandFundPercent !== undefined) dbPatch.band_fund_percent = patch.bandFundPercent;
    if (patch.bandFundPercentBase !== undefined) dbPatch.band_fund_percent_base = patch.bandFundPercentBase;

    const { error } = await supabase.from('eventos').update(dbPatch).eq('id', id);
    if (reportError(error)) return;
    setEventos((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const deleteEvento: AppDataContextValue['deleteEvento'] = async (id) => {
    const { error } = await supabase.from('eventos').delete().eq('id', id);
    if (reportError(error)) return;
    setEventos((prev) => prev.filter((x) => x.id !== id));
  };

  /**
   * Alterna o status do evento (A receber <-> Recebido). Ao marcar como Recebido, lança o
   * fluxo de caixa BRUTO do show (calcBordero) como transações vinculadas ao evento: o cachê
   * total como entrada, e as pernas de custo já conhecidas — despesas (operacional + custom) e
   * cotas dos sócios — como saídas. Os freelancers/equipe NÃO entram aqui: viram saída só
   * quando pagos de fato ("Pagar equipe"), refletindo o caixa real. Como
   *   cachê = despesas + cotas sócios + freelancers + caixa da banda,
   * o saldo desses lançamentos = freelancers a pagar + caixa da banda; após pagar a equipe, o
   * saldo do show fecha exatamente na fatia da banda. Ao desmarcar, remove todos esses
   * lançamentos (reconciliação idempotente: sempre apaga e recria, refletindo os custos/escala
   * mais recentes do evento). O "Pagamento equipe" não é vinculado ao evento de propósito, pra
   * que desmarcar o Recebido não apague um desembolso que já aconteceu de verdade.
   */
  const setEventoStatus: AppDataContextValue['setEventoStatus'] = async (id, status) => {
    const ev = eventos.find((e) => e.id === id);
    if (!ev || !group || ev.status === status) return;

    const { error } = await supabase.from('eventos').update({ status }).eq('id', id);
    if (reportError(error)) return;
    setEventos((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));

    const { error: delError } = await supabase.from('transacoes').delete().eq('evento_id', id);
    if (reportError(delError)) return;
    setTransacoes((prev) => prev.filter((t) => t.eventoId !== id));

    if (status === 'Recebido') {
      const b = calcBordero(ev, musicos);
      const despesas = b.operacional + b.customTotal;
      const sociosTotal = Math.max(0, b.cotaSocio) * b.numSocios;

      const rows = [
        { description: `Cachê - ${ev.contractorName}`, amount_cents: ev.totalValueCents, type: 'IN', category: 'Receita de Show' },
        { description: `Despesas - ${ev.contractorName}`, amount_cents: despesas, type: 'OUT', category: 'Despesas Operacionais' },
        { description: `Cotas dos sócios - ${ev.contractorName}`, amount_cents: sociosTotal, type: 'OUT', category: 'Cachê/Pagamento' },
      ]
        .filter((r) => r.amount_cents > 0)
        .map((r) => ({ ...r, group_id: group.id, date: ev.date, evento_id: id }));

      if (rows.length > 0) {
        const { data: txs, error: txError } = await supabase.from('transacoes').insert(rows).select();
        if (!reportError(txError) && txs) {
          const mapped = txs.map((tx) => ({ id: tx.id, description: tx.description, amountCents: tx.amount_cents, type: tx.type, category: tx.category, date: tx.date, eventoId: tx.evento_id ?? undefined }));
          setTransacoes((prev) => [...mapped, ...prev]);
        }
      }
    }
  };

  const addScheduledMusician: AppDataContextValue['addScheduledMusician'] = async (eventoId, musicianId, feeOverrideCents) => {
    const { data, error } = await supabase
      .from('scheduled_musicians')
      .insert({ evento_id: eventoId, musician_id: musicianId, fee_override_cents: feeOverrideCents, other_expenses_cents: 0, payment_status: 'Pendente', paid_via_team: false })
      .select()
      .single();
    if (reportError(error) || !data) return;
    const schedule: ScheduledMusician = { id: data.id, musicianId: data.musician_id, feeOverrideCents: data.fee_override_cents, otherExpensesCents: data.other_expenses_cents, paymentStatus: data.payment_status, paidViaTeam: data.paid_via_team ?? false };
    setEventos((prev) => prev.map((ev) => (ev.id === eventoId ? { ...ev, scheduledMusicians: [...ev.scheduledMusicians, schedule] } : ev)));
  };

  const removeScheduledMusician: AppDataContextValue['removeScheduledMusician'] = async (eventoId, scheduleId) => {
    const { error } = await supabase.from('scheduled_musicians').delete().eq('id', scheduleId);
    if (reportError(error)) return;
    setEventos((prev) => prev.map((ev) => (ev.id === eventoId ? { ...ev, scheduledMusicians: ev.scheduledMusicians.filter((s) => s.id !== scheduleId) } : ev)));
  };

  const updateScheduledMusician: AppDataContextValue['updateScheduledMusician'] = async (eventoId, scheduleId, patch) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.feeOverrideCents !== undefined) dbPatch.fee_override_cents = patch.feeOverrideCents;
    if (patch.otherExpensesCents !== undefined) dbPatch.other_expenses_cents = patch.otherExpensesCents;
    if (patch.paymentStatus !== undefined) dbPatch.payment_status = patch.paymentStatus;
    if (patch.paidViaTeam !== undefined) dbPatch.paid_via_team = patch.paidViaTeam;

    const { error } = await supabase.from('scheduled_musicians').update(dbPatch).eq('id', scheduleId);
    if (reportError(error)) return;
    setEventos((prev) => prev.map((ev) => (ev.id === eventoId ? { ...ev, scheduledMusicians: ev.scheduledMusicians.map((s) => (s.id === scheduleId ? { ...s, ...patch } : s)) } : ev)));
  };

  const payScheduledMusicians: AppDataContextValue['payScheduledMusicians'] = async (eventoId, scheduleIds) => {
    const ev = eventos.find((e) => e.id === eventoId);
    if (!ev || !group) return;

    const { error } = await supabase.from('scheduled_musicians').update({ payment_status: 'Pago', paid_via_team: true }).in('id', scheduleIds);
    if (reportError(error)) return;

    const idSet = new Set(scheduleIds);
    let totalPaidCents = 0;
    const lineItems: { name: string; instrument?: string; cents: number }[] = [];
    for (const s of ev.scheduledMusicians) {
      if (idSet.has(s.id)) {
        const musico = musicos.find((m) => m.id === s.musicianId);
        const base = musico?.role === 'Sócio' ? 0 : s.feeOverrideCents;
        const value = Math.max(0, base - s.otherExpensesCents);
        totalPaidCents += value;
        if (value > 0) {
          lineItems.push({ name: musico?.name ?? 'Músico', instrument: musico?.instrument || undefined, cents: value });
        }
      }
    }

    setEventos((prev) => prev.map((e) => (e.id === eventoId ? { ...e, scheduledMusicians: e.scheduledMusicians.map((s) => (idSet.has(s.id) ? { ...s, paymentStatus: 'Pago', paidViaTeam: true } : s)) } : e)));

    if (totalPaidCents > 0) {
      const { data: tx, error: txError } = await supabase
        .from('transacoes')
        // NÃO vincular evento_id de propósito: desmarcar "Recebido" apaga
        // transações por evento_id, e este é um desembolso real que já
        // aconteceu (não deve sumir). O extrato por músico vai em line_items.
        .insert({ group_id: group.id, description: `Pagamento equipe - ${ev.contractorName}`, amount_cents: totalPaidCents, type: 'OUT', category: 'Cachê/Pagamento', date: new Date().toISOString().slice(0, 10), line_items: lineItems })
        .select()
        .single();
      if (reportError(txError)) return;
      if (tx) {
        setTransacoes((prev) => [{ id: tx.id, description: tx.description, amountCents: tx.amount_cents, type: tx.type, category: tx.category, date: tx.date, eventoId: tx.evento_id ?? undefined, lineItems: tx.line_items ?? undefined }, ...prev]);
      }
    }
  };

  const addCustomExpense: AppDataContextValue['addCustomExpense'] = async (eventoId) => {
    const { data, error } = await supabase.from('custom_expenses').insert({ evento_id: eventoId, name: '', cents: 0 }).select().single();
    if (reportError(error) || !data) return;
    setEventos((prev) => prev.map((ev) => (ev.id === eventoId ? { ...ev, customExpenses: [...ev.customExpenses, { id: data.id, name: data.name, cents: data.cents }] } : ev)));
  };

  const updateCustomExpense: AppDataContextValue['updateCustomExpense'] = async (eventoId, expenseId, patch) => {
    const { error } = await supabase.from('custom_expenses').update(patch).eq('id', expenseId);
    if (reportError(error)) return;
    setEventos((prev) => prev.map((ev) => (ev.id === eventoId ? { ...ev, customExpenses: ev.customExpenses.map((c) => (c.id === expenseId ? { ...c, ...patch } : c)) } : ev)));
  };

  const removeCustomExpense: AppDataContextValue['removeCustomExpense'] = async (eventoId, expenseId) => {
    const { error } = await supabase.from('custom_expenses').delete().eq('id', expenseId);
    if (reportError(error)) return;
    setEventos((prev) => prev.map((ev) => (ev.id === eventoId ? { ...ev, customExpenses: ev.customExpenses.filter((c) => c.id !== expenseId) } : ev)));
  };

  const addTransacao: AppDataContextValue['addTransacao'] = async (t) => {
    if (!group) return;
    const { data, error } = await supabase
      .from('transacoes')
      .insert({ group_id: group.id, description: t.description, amount_cents: t.amountCents, type: t.type, category: t.category, date: t.date })
      .select()
      .single();
    if (reportError(error) || !data) return;
    setTransacoes((prev) => [{ id: data.id, description: data.description, amountCents: data.amount_cents, type: data.type, category: data.category, date: data.date }, ...prev]);
  };

  const deleteTransacao: AppDataContextValue['deleteTransacao'] = async (id) => {
    const { error } = await supabase.from('transacoes').delete().eq('id', id);
    if (reportError(error)) return;
    setTransacoes((prev) => prev.filter((x) => x.id !== id));
  };

  // Import de extrato (CSV): insere tudo em uma única chamada (em vez de
  // repetir addTransacao por linha) — o volume de linhas de um extrato
  // bancário torna N inserts individuais lento e desnecessário.
  const importTransacoes: AppDataContextValue['importTransacoes'] = async (items) => {
    if (!group) return { inserted: 0, error: 'Nenhum grupo ativo.' };
    if (items.length === 0) return { inserted: 0, error: null };

    const { data, error } = await supabase
      .from('transacoes')
      .insert(items.map((t) => ({ group_id: group.id, description: t.description, amount_cents: t.amountCents, type: t.type, category: t.category, date: t.date })))
      .select();
    if (reportError(error) || !data) return { inserted: 0, error: error?.message ?? 'Falha ao importar.' };

    const mapped: Transacao[] = data.map((r: any) => ({ id: r.id, description: r.description, amountCents: r.amount_cents, type: r.type, category: r.category, date: r.date }));
    setTransacoes((prev) => [...mapped, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    return { inserted: mapped.length, error: null };
  };

  const addContrato: AppDataContextValue['addContrato'] = async (c) => {
    if (!group) return null;
    const nextSeq = contratos.reduce((max, x) => Math.max(max, x.sequenceNumber), 0) + 1;
    const { data, error } = await supabase
      .from('contratos')
      .insert({ group_id: group.id, event_id: c.eventId, sequence_number: nextSeq, contractor_name: c.contractorName, event_date: c.eventDate, total_value_cents: c.totalValueCents, issued_at: c.issuedAt })
      .select()
      .single();
    if (reportError(error) || !data) return null;
    const newContrato: Contrato = { id: data.id, eventId: data.event_id, sequenceNumber: data.sequence_number, contractorName: data.contractor_name, eventDate: data.event_date, totalValueCents: data.total_value_cents, issuedAt: data.issued_at };
    setContratos((prev) => [...prev, newContrato]);
    return newContrato;
  };

  const setClausulas: AppDataContextValue['setClausulas'] = async (list) => {
    await Promise.all(list.map((c) => supabase.from('clausulas').update({ is_on: c.on }).eq('id', c.id)));
    setClausulasState(list);
  };

  return (
    <AppDataContext.Provider
      value={{
        loadingData,
        saveError,
        dismissError: () => setSaveError(null),
        musicos,
        eventos,
        transacoes,
        contratos,
        clausulas,
        addMusico,
        updateMusico,
        deleteMusico,
        addEvento,
        updateEvento,
        deleteEvento,
        setEventoStatus,
        addScheduledMusician,
        removeScheduledMusician,
        updateScheduledMusician,
        payScheduledMusicians,
        addCustomExpense,
        updateCustomExpense,
        removeCustomExpense,
        addTransacao,
        deleteTransacao,
        importTransacoes,
        addContrato,
        setClausulas,
      }}
    >
      {children}
      {saveError && <SaveErrorToast message={saveError} onClose={() => setSaveError(null)} />}
    </AppDataContext.Provider>
  );
}

/** Aviso de erro inline, fixo no rodapé, auto-dispensável (substitui window.alert). */
function SaveErrorToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  return (
    <div
      role="alert"
      style={{
        position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)',
        zIndex: 1000, maxWidth: 'min(92vw, 460px)', display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 14px', borderRadius: 12,
        background: 'var(--surface, #1b1b22)', color: 'var(--text, #fff)',
        border: '1px solid rgba(239,68,68,.45)', boxShadow: '0 10px 30px rgba(0,0,0,.35)',
        borderLeft: '3px solid #ef4444',
      }}
    >
      <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>
        <strong style={{ color: '#ef4444' }}>Erro ao salvar.</strong> {message}
      </div>
      <button
        onClick={onClose}
        aria-label="Fechar"
        style={{ background: 'transparent', border: 'none', color: 'var(--text-dim, #aaa)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}
      >
        ×
      </button>
    </div>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
