import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { supabase } from '@/lib/supabase';
import { fmt, mesLabel, parseDateLocal, todayStr } from '@/lib/format';

interface MeuMusico {
  id: string;
  name: string;
  instrument: string;
  role: string;
}

interface AgendaRow {
  evento_id: string;
  event_date: string;
  event_time: string;
  location: string | null;
  location_link: string | null;
  contractor_name: string;
  meu_valor_cents: number;
  payment_status: string;
}

// Tela 100% somente-leitura para o papel "View": um músico do elenco vê só a
// própria agenda (data, horário, local, contratante, seu valor líquido e
// status de pagamento). Os dados vêm exclusivamente de get_my_musico()/
// get_my_agenda() (RPCs security definer) — nunca lemos `eventos`/
// `scheduled_musicians` direto, então nada de faturamento do evento ou
// valor de outros músicos passa pelo cliente.
export function MinhaAgenda() {
  const [loading, setLoading] = useState(true);
  const [musico, setMusico] = useState<MeuMusico | null>(null);
  const [rows, setRows] = useState<AgendaRow[]>([]);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data: musicoData } = await supabase.rpc('get_my_musico');
      const meu = (musicoData as MeuMusico[] | null)?.[0] ?? null;
      if (!active) return;
      setMusico(meu);

      if (meu) {
        const { data: agendaData } = await supabase.rpc('get_my_agenda');
        if (!active) return;
        setRows((agendaData as AgendaRow[] | null) ?? []);
      }

      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div className="faint">Carregando agenda...</div>;
  }

  if (!musico) {
    return (
      <div className="card">
        <div className="faint">
          Você ainda não foi vinculado a um músico do elenco. Peça para um Admin do grupo fazer esse vínculo.
        </div>
      </div>
    );
  }

  const today = todayStr();
  const proximos = rows.filter((r) => r.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date));
  const realizados = rows.filter((r) => r.event_date < today).sort((a, b) => b.event_date.localeCompare(a.event_date));

  return (
    <div>
      <div className="mb18">
        <div style={{ fontSize: 16, fontWeight: 600 }}>Agenda de {musico.name} — {musico.instrument}</div>
      </div>

      <div className="sect">Próximos</div>
      {proximos.length === 0 && <div className="faint mb18">Nenhum show agendado.</div>}
      {proximos.length > 0 && (
        <div className="mb18">
          {proximos.map((r) => (
            <ShowCard key={r.evento_id} row={r} />
          ))}
        </div>
      )}

      <div className="sect">Realizados</div>
      {realizados.length === 0 && <div className="faint">Nenhum show realizado ainda.</div>}
      {realizados.length > 0 && (
        <div>
          {realizados.map((r) => (
            <ShowCard key={r.evento_id} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}

// Card somente-leitura (sem onClick de navegação, sem ações de editar/pagar/excluir).
function ShowCard({ row }: { row: AgendaRow }) {
  const d = parseDateLocal(row.event_date);
  return (
    <div className="ag-show-card" style={{ cursor: 'default' }}>
      <div className="ag-date-badge">
        <div className="mo">{mesLabel(d.getMonth())}</div>
        <div className="dy">{d.getDate()}</div>
      </div>
      <div className="grow">
        <div className="row-name">{row.contractor_name}</div>
        <div className="row-sub">
          {row.event_time}
          {(row.location || row.location_link) ? ' · ' : ''}
          {row.location_link ? (
            <a
              href={row.location_link}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--brand-ink)', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 3 }}
            >
              <Icon name="map" size={12} />Ver localização
            </a>
          ) : (
            row.location
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{fmt(row.meu_valor_cents)}</div>
        <span className={`badge ${row.payment_status === 'Pago' ? 'badge-ok' : 'badge-warn'}`}>{row.payment_status}</span>
      </div>
    </div>
  );
}
