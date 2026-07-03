export function fmt(cents: number): string {
  return 'R$ ' + (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseCents(s: string | number | null | undefined): number {
  if (s === null || s === undefined || s === '') return 0;
  const n = parseFloat(String(s).replace(',', '.'));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function mesLabel(idx: number, long = false): string {
  return long ? MESES_LONGOS[idx] : MESES[idx];
}

export { MESES, MESES_LONGOS, DIAS_SEMANA };

export function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDate(dateStr: string): string {
  const d = parseDateLocal(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function fmtDateShort(dateStr: string): string {
  const d = parseDateLocal(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isOverdue(dateStr: string, status: string): boolean {
  return status !== 'Recebido' && dateStr < todayStr();
}
