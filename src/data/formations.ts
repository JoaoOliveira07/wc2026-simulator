export type PositionType = 'gk' | 'df' | 'mf' | 'fw';

export interface FormationRow {
  count: number;
  type: PositionType;
}

export interface FormationConfig {
  id: string;
  rows: FormationRow[]; // bottom→top: GK row first
}

export const FORMATIONS: FormationConfig[] = [
  { id: '4-3-3',   rows: [{ count: 1, type: 'gk' }, { count: 4, type: 'df' }, { count: 3, type: 'mf' }, { count: 3, type: 'fw' }] },
  { id: '4-4-2',   rows: [{ count: 1, type: 'gk' }, { count: 4, type: 'df' }, { count: 4, type: 'mf' }, { count: 2, type: 'fw' }] },
  { id: '4-5-1',   rows: [{ count: 1, type: 'gk' }, { count: 4, type: 'df' }, { count: 5, type: 'mf' }, { count: 1, type: 'fw' }] },
  { id: '3-4-3',   rows: [{ count: 1, type: 'gk' }, { count: 3, type: 'df' }, { count: 4, type: 'mf' }, { count: 3, type: 'fw' }] },
  { id: '3-5-2',   rows: [{ count: 1, type: 'gk' }, { count: 3, type: 'df' }, { count: 5, type: 'mf' }, { count: 2, type: 'fw' }] },
  { id: '5-3-2',   rows: [{ count: 1, type: 'gk' }, { count: 5, type: 'df' }, { count: 3, type: 'mf' }, { count: 2, type: 'fw' }] },
  { id: '5-4-1',   rows: [{ count: 1, type: 'gk' }, { count: 5, type: 'df' }, { count: 4, type: 'mf' }, { count: 1, type: 'fw' }] },
  { id: '4-2-3-1', rows: [{ count: 1, type: 'gk' }, { count: 4, type: 'df' }, { count: 2, type: 'mf' }, { count: 3, type: 'mf' }, { count: 1, type: 'fw' }] },
  { id: '4-2-2-2', rows: [{ count: 1, type: 'gk' }, { count: 4, type: 'df' }, { count: 2, type: 'mf' }, { count: 2, type: 'mf' }, { count: 2, type: 'fw' }] },
];

export const DEFAULT_FORMATION = '4-3-3';

export function getFormation(id: string): FormationConfig {
  return FORMATIONS.find(f => f.id === id) ?? FORMATIONS[0];
}

export interface SlotMeta {
  key: string;
  type: PositionType;
  rowIdx: number;
  colIdx: number;
}

export function getSlotKeys(config: FormationConfig): SlotMeta[] {
  const slots: SlotMeta[] = [];
  config.rows.forEach((row, rowIdx) => {
    for (let colIdx = 0; colIdx < row.count; colIdx++) {
      slots.push({ key: `r${rowIdx}_${colIdx}`, type: row.type, rowIdx, colIdx });
    }
  });
  return slots;
}
