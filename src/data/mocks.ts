import type { Clausula, Contrato, Evento, Musico, Transacao } from '@/types';

export const MUSICOS: Musico[] = [
  { id: 'm1', name: 'Júnior', instrument: 'Vocal', role: 'Sócio', phone: '(11)99999-0001', pix: '111.111.111-01' },
  { id: 'm2', name: 'Diego', instrument: 'Pandeiro', role: 'Sócio', phone: '(11)99999-0002', pix: '222.222.222-02' },
  { id: 'm3', name: 'Marcelo', instrument: 'Banjo', role: 'Sócio', phone: '(11)99999-0003', pix: '333.333.333-03' },
  { id: 'm4', name: 'Rafael', instrument: 'Surdo', role: 'Freelancer', phone: '(11)99999-0004', pix: 'rafael@email.com' },
  { id: 'm5', name: 'Bruna', instrument: 'Teclado', role: 'Freelancer', phone: '(11)99999-0005', pix: '(11)99999-0005' },
];

export const EVENTOS: Evento[] = [
  {
    id: 'ev1',
    contractorName: 'Aniversário Júnior',
    date: '2026-07-12',
    time: '22:00',
    location: 'Salão Vila Rica',
    locationLink: '',
    totalValueCents: 300000,
    status: 'A receber',
    operationalExpensesCents: 0,
    customExpenses: [],
    bandFundCents: 0,
    bandFundMode: 'auto',
    bandFundPercent: null,
    bandFundPercentBase: null,
    scheduledMusicians: [
      { id: 's1', musicianId: 'm1', feeOverrideCents: 0, otherExpensesCents: 0, paymentStatus: 'Pago' },
      { id: 's2', musicianId: 'm2', feeOverrideCents: 0, otherExpensesCents: 5000, paymentStatus: 'Pendente' },
      { id: 's3', musicianId: 'm3', feeOverrideCents: 0, otherExpensesCents: 0, paymentStatus: 'Pendente' },
      { id: 's4', musicianId: 'm4', feeOverrideCents: 25000, otherExpensesCents: 0, paymentStatus: 'Pendente' },
    ],
  },
  {
    id: 'ev2',
    contractorName: 'Pagode da Laje',
    date: '2026-07-19',
    time: '20:00',
    location: 'Chácara Bom Retiro',
    locationLink: '',
    totalValueCents: 220000,
    status: 'A receber',
    operationalExpensesCents: 15000,
    customExpenses: [{ id: 'ce1', name: 'Combustível', cents: 8000 }],
    bandFundCents: 0,
    bandFundMode: 'auto',
    bandFundPercent: null,
    bandFundPercentBase: null,
    scheduledMusicians: [
      { id: 's5', musicianId: 'm1', feeOverrideCents: 0, otherExpensesCents: 0, paymentStatus: 'Pendente' },
      { id: 's6', musicianId: 'm2', feeOverrideCents: 0, otherExpensesCents: 0, paymentStatus: 'Pendente' },
      { id: 's7', musicianId: 'm5', feeOverrideCents: 20000, otherExpensesCents: 0, paymentStatus: 'Pendente' },
    ],
  },
  {
    id: 'ev3',
    contractorName: 'Casamento Marina & Léo',
    date: '2026-06-14',
    time: '19:30',
    location: 'Espaço Jardim das Rosas',
    locationLink: '',
    totalValueCents: 450000,
    status: 'Recebido',
    operationalExpensesCents: 20000,
    customExpenses: [],
    bandFundCents: 0,
    bandFundMode: 'auto',
    bandFundPercent: null,
    bandFundPercentBase: null,
    scheduledMusicians: [
      { id: 's8', musicianId: 'm1', feeOverrideCents: 0, otherExpensesCents: 0, paymentStatus: 'Pago' },
      { id: 's9', musicianId: 'm2', feeOverrideCents: 0, otherExpensesCents: 0, paymentStatus: 'Pago' },
      { id: 's10', musicianId: 'm3', feeOverrideCents: 0, otherExpensesCents: 0, paymentStatus: 'Pago' },
      { id: 's11', musicianId: 'm4', feeOverrideCents: 30000, otherExpensesCents: 0, paymentStatus: 'Pago' },
      { id: 's12', musicianId: 'm5', feeOverrideCents: 30000, otherExpensesCents: 0, paymentStatus: 'Pago' },
    ],
  },
];

export const TRANSACOES: Transacao[] = [
  { id: 't1', description: 'Show Vila Rica', amountCents: 300000, type: 'IN', category: 'Receita de Show', date: '2026-06-14' },
  { id: 't2', description: 'Cachê Júnior', amountCents: 90000, type: 'OUT', category: 'Cachê/Pagamento', date: '2026-06-15' },
  { id: 't3', description: 'Compra de caixa de som', amountCents: 45000, type: 'OUT', category: 'Compra de Equipamentos', date: '2026-06-20' },
  { id: 't4', description: 'Manutenção pandeiro', amountCents: 8000, type: 'OUT', category: 'Manutenção', date: '2026-06-22' },
  { id: 't5', description: 'Reposição de caixa', amountCents: 50000, type: 'IN', category: 'Reposição de Caixa', date: '2026-06-25' },
  { id: 't6', description: 'Rendimento aplicação', amountCents: 3200, type: 'IN', category: 'Rendimento', date: '2026-06-28' },
];

export const CONTRATOS: Contrato[] = [
  { id: 'c1', eventId: 'ev1', sequenceNumber: 1, contractorName: 'Aniversário Júnior', eventDate: '2026-07-12', totalValueCents: 300000, issuedAt: '2026-06-20' },
  { id: 'c2', eventId: 'ev2', sequenceNumber: 2, contractorName: 'Pagode da Laje', eventDate: '2026-07-19', totalValueCents: 220000, issuedAt: '2026-07-01' },
];

export const CLAUSULAS_DEFAULT: Omit<Clausula, 'id'>[] = [
  { label: 'Duração e horário', on: true },
  { label: 'Equipamento e estrutura', on: true },
  { label: 'Consumação', on: false },
  { label: 'Multa rescisória (50%)', on: true },
  { label: 'Responsabilidade civil e LGPD', on: true },
];

export const TX_CATEGORIES: Record<'IN' | 'OUT', string[]> = {
  IN: ['Receita de Show', 'Reposição de Caixa', 'Rendimento', 'Outros'],
  OUT: ['Cachê/Pagamento', 'Compra de Equipamentos', 'Despesas Operacionais', 'Manutenção', 'Outros'],
};

export const DESPESA_AVULSA_PRESETS = ['Locação de Som', 'Locação de Iluminação', 'Custos Logística'];
