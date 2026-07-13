import { useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useAppData } from '@/context/AppDataContext';
import { TX_CATEGORIES } from '@/data/mocks';
import { parseDelimitedText, parseFlexibleAmountToCents, parseFlexibleDate } from '@/lib/csvImport';
import { fmt, fmtDate, mesLabel, parseCents, parseDateLocal, todayStr } from '@/lib/format';
import type { Transacao, TxType } from '@/types';

export function Caixa() {
  const { transacoes, addTransacao, deleteTransacao, importTransacoes } = useAppData();
  const [filterAno, setFilterAno] = useState('all');
  const [filterMes, setFilterMes] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
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

      <div className="row between mb16" style={{ flexWrap: 'wrap', rowGap: 10 }}>
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
        <div className="row gap8">
          <button className="btn btn-sm" onClick={() => setShowImport(true)}><Icon name="download" size={14} style={{ transform: 'scaleY(-1)' }} />Importar dados</button>
          <button className="btn btn-brand btn-sm" onClick={() => setShowModal(true)}><Icon name="plus" size={14} />Nova transação</button>
        </div>
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
      {showImport && <ImportModal existentes={transacoes} onClose={() => setShowImport(false)} onImport={importTransacoes} />}
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

// ── Importação de extrato (CSV) ──────────────────────────────
// Bancos variam o formato do CSV (delimitador, decimal, data, coluna única
// de valor com sinal vs débito/crédito separados) — por isso o fluxo pede
// pro usuário mapear as colunas em vez de assumir um layout fixo. O
// mapeamento fica salvo por cabeçalho (localStorage) pra reimportações
// periódicas do mesmo banco não pedirem de novo.

type ImportStep = 'upload' | 'mapping' | 'preview';
type ValueMode = 'signed' | 'split';

interface ParsedRow {
  id: string;
  date: string | null;
  description: string;
  amountCents: number;
  type: TxType;
  valid: boolean;
  invalidReason?: string;
  duplicate: boolean;
}

interface ColumnMapping {
  dateCol: string;
  descCol: string;
  valueMode: ValueMode;
  valueCol: string;
  invertSign: boolean;
  creditCol: string;
  debitCol: string;
}

const MAPPING_STORAGE_PREFIX = 'pagodefin:csv-import-mapping:';

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function guessColumn(headers: string[], keywords: string[]): string {
  return headers.find((h) => keywords.some((k) => stripAccents(h).includes(k))) ?? '';
}

function ImportModal({ existentes, onClose, onImport }: {
  existentes: Transacao[];
  onClose: () => void;
  onImport: (items: Omit<Transacao, 'id'>[]) => Promise<{ inserted: number; error: string | null }>;
}) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [fileName, setFileName] = useState('');
  const [csv, setCsv] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dateCol, setDateCol] = useState('');
  const [descCol, setDescCol] = useState('');
  const [valueMode, setValueMode] = useState<ValueMode>('signed');
  const [valueCol, setValueCol] = useState('');
  const [invertSign, setInvertSign] = useState(false);
  const [creditCol, setCreditCol] = useState('');
  const [debitCol, setDebitCol] = useState('');

  const [categoriaIn, setCategoriaIn] = useState(TX_CATEGORIES.IN[TX_CATEGORIES.IN.length - 1]);
  const [categoriaOut, setCategoriaOut] = useState(TX_CATEGORIES.OUT[TX_CATEGORIES.OUT.length - 1]);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  function handleFile(file: File) {
    setParseError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseDelimitedText(String(reader.result ?? ''));
      if (parsed.headers.length < 2 || parsed.rows.length === 0) {
        setParseError('Não foi possível reconhecer colunas neste arquivo. Confirme que é um CSV exportado do seu banco.');
        return;
      }
      setCsv(parsed);

      const cached = localStorage.getItem(MAPPING_STORAGE_PREFIX + parsed.headers.join('|'));
      if (cached) {
        try {
          const m: ColumnMapping = JSON.parse(cached);
          setDateCol(m.dateCol);
          setDescCol(m.descCol);
          setValueMode(m.valueMode);
          setValueCol(m.valueCol);
          setInvertSign(m.invertSign);
          setCreditCol(m.creditCol);
          setDebitCol(m.debitCol);
        } catch {
          // cache corrompido — ignora e cai no auto-guess abaixo
          setDateCol(guessColumn(parsed.headers, ['data']));
          setDescCol(guessColumn(parsed.headers, ['historico', 'descricao', 'memo', 'lancamento']));
          setValueCol(guessColumn(parsed.headers, ['valor', 'amount']));
        }
      } else {
        setDateCol(guessColumn(parsed.headers, ['data']));
        setDescCol(guessColumn(parsed.headers, ['historico', 'descricao', 'memo', 'lancamento']));
        setValueCol(guessColumn(parsed.headers, ['valor', 'amount']));
      }
      setStep('mapping');
    };
    reader.onerror = () => setParseError('Falha ao ler o arquivo.');
    reader.readAsText(file, 'utf-8');
  }

  function buildPreview() {
    if (!csv) return;
    const di = csv.headers.indexOf(dateCol);
    const dsi = csv.headers.indexOf(descCol);
    const vi = csv.headers.indexOf(valueCol);
    const ci = csv.headers.indexOf(creditCol);
    const bi = csv.headers.indexOf(debitCol);

    const existingSignatures = new Set(existentes.map((t) => `${t.date}|${t.type}|${t.amountCents}`));

    const built: ParsedRow[] = csv.rows.map((cells, idx) => {
      const date = di >= 0 ? parseFlexibleDate(cells[di] ?? '') : null;
      const description = (dsi >= 0 ? cells[dsi] : '') ?? '';

      let type: TxType = 'IN';
      let amountCents: number | null = null;

      if (valueMode === 'signed') {
        const signed = vi >= 0 ? parseFlexibleAmountToCents(cells[vi] ?? '') : null;
        if (signed !== null) {
          const effective = invertSign ? -signed : signed;
          type = effective < 0 ? 'OUT' : 'IN';
          amountCents = Math.abs(effective);
        }
      } else {
        const creditRaw = ci >= 0 ? (cells[ci] ?? '').trim() : '';
        const debitRaw = bi >= 0 ? (cells[bi] ?? '').trim() : '';
        const credit = creditRaw ? parseFlexibleAmountToCents(creditRaw) : null;
        const debit = debitRaw ? parseFlexibleAmountToCents(debitRaw) : null;
        if (credit && Math.abs(credit) > 0) { type = 'IN'; amountCents = Math.abs(credit); }
        else if (debit && Math.abs(debit) > 0) { type = 'OUT'; amountCents = Math.abs(debit); }
      }

      const valid = !!date && amountCents !== null && amountCents > 0;
      const duplicate = valid && existingSignatures.has(`${date}|${type}|${amountCents}`);

      return {
        id: String(idx),
        date,
        description: description.trim(),
        amountCents: amountCents ?? 0,
        type,
        valid,
        invalidReason: !date ? 'Data inválida' : amountCents === null || amountCents === 0 ? 'Valor inválido' : undefined,
        duplicate,
      };
    });

    setRows(built);
    setSelected(new Set(built.filter((r) => r.valid && !r.duplicate).map((r) => r.id)));

    const mapping: ColumnMapping = { dateCol, descCol, valueMode, valueCol, invertSign, creditCol, debitCol };
    localStorage.setItem(MAPPING_STORAGE_PREFIX + csv.headers.join('|'), JSON.stringify(mapping));

    setStep('preview');
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleConfirmImport() {
    const toImport = rows.filter((r) => r.valid && selected.has(r.id));
    if (toImport.length === 0) return;
    setImporting(true);
    const items: Omit<Transacao, 'id'>[] = toImport.map((r) => ({
      description: r.description || (r.type === 'IN' ? categoriaIn : categoriaOut),
      amountCents: r.amountCents,
      type: r.type,
      category: r.type === 'IN' ? categoriaIn : categoriaOut,
      date: r.date!,
    }));
    const result = await onImport(items);
    setImporting(false);
    if (result.error) { setResultMsg(`Erro: ${result.error}`); return; }
    setResultMsg(`${result.inserted} transações importadas.`);
    setTimeout(onClose, 1200);
  }

  const validCount = rows.filter((r) => r.valid).length;
  const duplicateCount = rows.filter((r) => r.valid && r.duplicate).length;
  const canContinue = !!dateCol && !!descCol && (valueMode === 'signed' ? !!valueCol : !!creditCol || !!debitCol);

  return (
    <Modal title="Importar dados" onClose={onClose} large>
      {step === 'upload' && (
        <>
          <div className="field">
            <label>Arquivo CSV do seu banco</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
          <div className="faint mb14">
            Aceita extratos com uma coluna de valor (com sinal) ou colunas separadas de débito/crédito — o mapeamento é feito na próxima etapa. Repita esse processo com certa periodicidade para manter o caixa atualizado.
          </div>
          {parseError && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{parseError}</div>}
        </>
      )}

      {step === 'mapping' && csv && (
        <>
          <div className="faint mb14">Arquivo: {fileName} · {csv.rows.length} linha(s)</div>
          <div className="grid2">
            <div className="field">
              <label>Coluna de data</label>
              <select value={dateCol} onChange={(e) => setDateCol(e.target.value)}>
                <option value="">Selecione...</option>
                {csv.headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Coluna de descrição</label>
              <select value={descCol} onChange={(e) => setDescCol(e.target.value)}>
                <option value="">Selecione...</option>
                {csv.headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div className="type-seg mb14">
            <button className={valueMode === 'signed' ? 'on-in' : ''} onClick={() => setValueMode('signed')}>Uma coluna (com sinal)</button>
            <button className={valueMode === 'split' ? 'on-in' : ''} onClick={() => setValueMode('split')}>Débito/Crédito separados</button>
          </div>

          {valueMode === 'signed' ? (
            <>
              <div className="field">
                <label>Coluna de valor</label>
                <select value={valueCol} onChange={(e) => setValueCol(e.target.value)}>
                  <option value="">Selecione...</option>
                  {csv.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <label className="row gap8 mb14" style={{ fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={invertSign} onChange={(e) => setInvertSign(e.target.checked)} style={{ width: 'auto' }} />
                Inverter sinal (meu banco exporta saída como valor positivo)
              </label>
            </>
          ) : (
            <div className="grid2 mb14">
              <div className="field">
                <label>Coluna de crédito (entrada)</label>
                <select value={creditCol} onChange={(e) => setCreditCol(e.target.value)}>
                  <option value="">Selecione...</option>
                  {csv.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Coluna de débito (saída)</label>
                <select value={debitCol} onChange={(e) => setDebitCol(e.target.value)}>
                  <option value="">Selecione...</option>
                  {csv.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="row gap8">
            <button className="btn" style={{ flex: 1 }} onClick={() => setStep('upload')}>Voltar</button>
            <button className="btn btn-brand" style={{ flex: 2 }} disabled={!canContinue} onClick={buildPreview}>Continuar</button>
          </div>
        </>
      )}

      {step === 'preview' && (
        <>
          <div className="faint mb14">
            {validCount} de {rows.length} linha(s) reconhecidas
            {duplicateCount > 0 && ` · ${duplicateCount} possível(is) duplicata(s) desmarcada(s)`}
          </div>

          <div className="grid2 mb14">
            <div className="field">
              <label>Categoria p/ entradas</label>
              <select value={categoriaIn} onChange={(e) => setCategoriaIn(e.target.value)}>
                {TX_CATEGORIES.IN.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Categoria p/ saídas</label>
              <select value={categoriaOut} onChange={(e) => setCategoriaOut(e.target.value)}>
                {TX_CATEGORIES.OUT.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="row between mb8">
            <span className="faint">{selected.size} selecionada(s)</span>
            <div className="row gap8">
              <span className="link-brand" style={{ fontSize: 12 }} onClick={() => setSelected(new Set(rows.filter((r) => r.valid).map((r) => r.id)))}>Selecionar válidas</span>
              <span className="link-brand" style={{ fontSize: 12 }} onClick={() => setSelected(new Set())}>Limpar</span>
            </div>
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 14 }}>
            {rows.map((r) => (
              <div
                key={r.id}
                className={`pagar-row${selected.has(r.id) ? ' sel' : ''}`}
                style={!r.valid ? { opacity: 0.45, cursor: 'default' } : undefined}
                onClick={r.valid ? () => toggleRow(r.id) : undefined}
              >
                <div className="pagar-check">{selected.has(r.id) && <Icon name="check" size={12} />}</div>
                <div className="grow">
                  <div className="row-name">{r.description || '(sem descrição)'}</div>
                  <div className="row-sub">
                    {r.date ? fmtDate(r.date) : '—'}
                    {!r.valid && ` · ${r.invalidReason}`}
                    {r.valid && r.duplicate && ' · possível duplicata'}
                  </div>
                </div>
                <div className={r.type === 'IN' ? 'pos' : 'neg'}>{r.type === 'IN' ? '+ ' : '- '}{fmt(r.amountCents)}</div>
              </div>
            ))}
          </div>

          {resultMsg && <div className="faint mb8">{resultMsg}</div>}

          <div className="row gap8">
            <button className="btn" style={{ flex: 1 }} onClick={() => setStep('mapping')} disabled={importing}>Voltar</button>
            <button className="btn btn-brand" style={{ flex: 2 }} disabled={selected.size === 0 || importing} onClick={handleConfirmImport}>
              {importing ? 'Importando...' : `Importar ${selected.size} transação(ões)`}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
