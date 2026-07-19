import type { CSSProperties, ReactNode } from 'react';

// Estilo compartilhado por todo <select> de filtro (ano/mês/status/músico) em
// Painel, Eventos, Caixa e Relatório — garante altura, fonte e truncamento
// idênticos nas 4 telas, em vez de cada uma reimplementar o próprio ajuste.
export const filterSelectStyle: CSSProperties = {
  height: 34, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9,
  padding: '0 20px 0 9px', color: 'var(--text)', fontSize: 12, fontWeight: 600,
  flex: '1 1 0', minWidth: 68,
  textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden',
};

// Botão de ação compacto (mesma altura dos selects) para caber na barra de
// filtros — ex.: "+ Novo evento", "Importar dados". Combine com width/aria-label.
export const filterButtonStyle: CSSProperties = { flexShrink: 0, height: 34, padding: 0, justifyContent: 'center' };

interface FilterBarProps {
  children: ReactNode;
  /** Relatório tem músico+ano+mês+status+exportar (5 campos) — permite quebrar
   *  linha em telas muito estreitas em vez de espremer tudo ilegível. */
  wrap?: boolean;
}

// Barra de filtros fixa (sticky) logo abaixo do cabeçalho — mesma posição e
// espaçamento em toda página que tem filtro de ano/mês/status no topo.
export function FilterBar({ children, wrap = false }: FilterBarProps) {
  return (
    <div
      className="row gap8 sticky-subheader"
      style={{ flexWrap: wrap ? 'wrap' : 'nowrap', overflowX: wrap ? 'visible' : 'auto', rowGap: wrap ? 8 : undefined }}
    >
      {children}
    </div>
  );
}
