export type Role = 'Sócio' | 'Freelancer';

export interface Musico {
  id: string;
  name: string;
  instrument: string;
  role: Role;
  phone: string;
  pix: string;
}

export type EventStatus = 'A receber' | 'Recebido';
export type PaymentStatus = 'Pago' | 'Pendente';

export interface CustomExpense {
  id: string;
  name: string;
  cents: number;
}

export interface ScheduledMusician {
  id: string;
  musicianId: string;
  feeOverrideCents: number;
  otherExpensesCents: number;
  paymentStatus: PaymentStatus;
  /** true = pago via "Pagar equipe" (gerou transação, não pode ser desmarcado). */
  paidViaTeam?: boolean;
}

export type BandFundMode = 'auto' | 'manual' | 'percentual';
export type BandFundPercentBase = 'venda' | 'saldo';

export interface Evento {
  id: string;
  contractorName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  location: string;
  locationLink: string;
  totalValueCents: number;
  status: EventStatus;
  operationalExpensesCents: number;
  customExpenses: CustomExpense[];
  bandFundCents: number;
  bandFundMode: BandFundMode;
  /** % (ex.: 15 = 15%), só usado quando bandFundMode === 'percentual'. */
  bandFundPercent: number | null;
  /** 'venda' = total_value_cents; 'saldo' = lucro (Saldo Rateio). */
  bandFundPercentBase: BandFundPercentBase | null;
  scheduledMusicians: ScheduledMusician[];
}

export type TxType = 'IN' | 'OUT';

/** Item do extrato de uma transação agregada (ex.: "Pagamento equipe" — um item por músico). */
export interface TxLineItem {
  name: string;
  instrument?: string;
  /** Valor líquido pago a este músico, em centavos (já descontado vale/adiantamento). */
  cents: number;
}

export interface Transacao {
  id: string;
  description: string;
  amountCents: number;
  type: TxType;
  category: string;
  date: string; // YYYY-MM-DD
  /** Preenchido quando a transação foi gerada automaticamente a partir de um evento (ex.: ao marcar como Recebido). */
  eventoId?: string;
  /** Extrato por músico de uma transação agregada (ex.: "Pagamento equipe"). Ausente em transações simples. */
  lineItems?: TxLineItem[];
}

export interface Contrato {
  id: string;
  eventId: string | null;
  sequenceNumber: number;
  contractorName: string;
  eventDate: string;
  totalValueCents: number;
  issuedAt: string;
}

export interface Clausula {
  id: string;
  label: string;
  on: boolean;
}

export interface Bordero {
  faturamento: number;
  custosFixos: number;
  freelancersCents: number;
  caixaBanda: number;
  cotaSocio: number;
  numSocios: number;
  lucro: number;
  operacional: number;
  customTotal: number;
}

export type ThemeMode = 'dark' | 'light';

export interface ThemeState {
  brand: string;
  mode: ThemeMode;
}
