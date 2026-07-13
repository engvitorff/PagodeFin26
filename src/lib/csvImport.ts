// Parsing de extratos bancários em CSV. Bancos variam bastante no formato
// (delimitador, separador decimal, formato de data, coluna única de valor
// com sinal vs colunas separadas de débito/crédito) — por isso o parsing é
// tolerante e a tela de import deixa o usuário mapear as colunas, em vez de
// assumir um layout fixo.

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

function countChar(s: string, c: string): number {
  return s.split(c).length - 1;
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

/** Detecta o delimitador (`,`, `;` ou tab) pela primeira linha e separa cabeçalho + linhas. */
export function parseDelimitedText(text: string): ParsedCsv {
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = clean.split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const candidates = [',', ';', '\t'];
  const delimiter = candidates.reduce((best, d) => (countChar(lines[0], d) > countChar(lines[0], best) ? d : best), candidates[0]);

  const parsed = lines.map((line) => parseDelimitedLine(line, delimiter));
  const [headers, ...rows] = parsed;
  return { headers, rows };
}

/** Aceita dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy (com ano de 2 ou 4 dígitos) e yyyy-mm-dd. Retorna null se não reconhecer. */
export function parseFlexibleDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;

  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    const month = Number(m[2]);
    if (month < 1 || month > 12) return null;
    let year = m[3];
    if (year.length === 2) year = (Number(year) > 50 ? '19' : '20') + year;
    return `${year}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }

  return null;
}

/**
 * Converte um valor monetário em texto (com sinal) para centavos (inteiro,
 * pode ser negativo). Lida com "R$", separador decimal vírgula ou ponto,
 * milhar, parênteses (contábil) e sinal explícito.
 */
export function parseFlexibleAmountToCents(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/r\$/i, '').replace(/\s/g, '');
  if (s.startsWith('-')) { negative = true; s = s.slice(1); }
  else if (s.startsWith('+')) { s = s.slice(1); }
  if (!s) return null;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    s = s.replace(',', '.');
  }

  const value = Number(s);
  if (!isFinite(value) || isNaN(value)) return null;
  const cents = Math.round(Math.abs(value) * 100);
  return negative ? -cents : cents;
}
