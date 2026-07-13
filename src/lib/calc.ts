import type { Bordero, Evento, Musico } from '@/types';

let _idCounter = 100;
export function genId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}${_idCounter}`;
}

const AVATAR_COLORS = ['#7C5CFF', '#d85a30', '#185fa5', '#0f6e56', '#a16207', '#c026d3', '#0891b2', '#65a30d'];
export function avatarColor(i: number): string {
  return AVATAR_COLORS[((i % AVATAR_COLORS.length) + AVATAR_COLORS.length) % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function calcBordero(ev: Evento, musicos: Musico[]): Bordero {
  const musicoById = new Map(musicos.map((m) => [m.id, m]));

  let freelancersCents = 0;
  for (const s of ev.scheduledMusicians) {
    const m = musicoById.get(s.musicianId);
    if (m && m.role === 'Freelancer') {
      const liquido = Math.max(0, s.feeOverrideCents - s.otherExpensesCents);
      freelancersCents += liquido;
    }
  }

  const operacional = ev.operationalExpensesCents;
  const customTotal = ev.customExpenses.reduce((sum, c) => sum + c.cents, 0);
  const custosFixos = operacional + customTotal + freelancersCents;
  const lucro = ev.totalValueCents - custosFixos;

  const numSocios = ev.scheduledMusicians.filter((s) => musicoById.get(s.musicianId)?.role === 'Sócio').length;

  let caixaBanda: number;
  let cotaSocio: number;

  if (ev.bandFundMode === 'auto') {
    const numCotistas = numSocios + 1;
    cotaSocio = numCotistas > 0 ? Math.floor(lucro / numCotistas) : 0;
    caixaBanda = cotaSocio;
  } else {
    if (ev.bandFundMode === 'percentual') {
      const base = ev.bandFundPercentBase === 'venda' ? ev.totalValueCents : lucro;
      caixaBanda = Math.floor((base * (ev.bandFundPercent ?? 0)) / 100);
    } else {
      caixaBanda = ev.bandFundCents;
    }
    cotaSocio = numSocios > 0 ? Math.floor((lucro - caixaBanda) / numSocios) : 0;
  }

  return { faturamento: ev.totalValueCents, custosFixos, freelancersCents, caixaBanda, cotaSocio, numSocios, lucro, operacional, customTotal };
}

export const BRAND_PRESETS = ['#FF169B', '#7C5CFF', '#16C784', '#F5A524', '#2E8BFF', '#FF5C5C', '#0EA5E9', '#DC2626'];

export const GANTT_COLORS = ['#FF169B', '#7C5CFF', '#16C784', '#F5A524', '#2E8BFF'];

export const PIZZA_COLORS = {
  caixa: '#16C784',
  operacional: '#F5A524',
  freelancers: '#7C5CFF',
  socios: '#FF169B',
};
