# Interactive Lineup Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive "Editor" tab to TeamModal where users can pick a formation and assign squad players to each slot — FIFA/PES style — with state persisted in localStorage per team.

**Architecture:** New "Editor" tab added to the existing `TeamModal`. A new `FormationEditor` component renders the pitch + formation picker + clickable slots. Clicking a slot opens `PlayerPickerModal` (overlay) which shows the squad filtered by position. State shape `{ formation: string, slots: Record<slotKey, playerId> }` is saved to `localStorage` under key `editor:{teamName}`.

**Tech Stack:** React 19, TypeScript, inline styles (no Tailwind in component internals), `useMemo` for derived maps, `localStorage` for persistence.

## Global Constraints

- No new npm packages.
- All `<img>` tags from API Sports must have `referrerPolicy="no-referrer"`.
- TypeScript strict mode — no `any` unless unavoidable.
- Verify with `cd /Volumes/Externo/GitHub/wc2026-simulator && npm run build` after each task.

---

### Task 1: Formation definitions (`src/data/formations.ts`)

**Files:**
- Create: `src/data/formations.ts`

**Interfaces:**
- Produces: `PositionType`, `FormationConfig`, `FORMATIONS`, `DEFAULT_FORMATION`, `getFormation()`, `getSlotKeys()`

- [ ] **Step 1: Create `src/data/formations.ts`**

```ts
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
  { id: '4-3-3',   rows: [{ count:1,type:'gk'},{count:4,type:'df'},{count:3,type:'mf'},{count:3,type:'fw'}] },
  { id: '4-4-2',   rows: [{ count:1,type:'gk'},{count:4,type:'df'},{count:4,type:'mf'},{count:2,type:'fw'}] },
  { id: '4-5-1',   rows: [{ count:1,type:'gk'},{count:4,type:'df'},{count:5,type:'mf'},{count:1,type:'fw'}] },
  { id: '3-4-3',   rows: [{ count:1,type:'gk'},{count:3,type:'df'},{count:4,type:'mf'},{count:3,type:'fw'}] },
  { id: '3-5-2',   rows: [{ count:1,type:'gk'},{count:3,type:'df'},{count:5,type:'mf'},{count:2,type:'fw'}] },
  { id: '5-3-2',   rows: [{ count:1,type:'gk'},{count:5,type:'df'},{count:3,type:'mf'},{count:2,type:'fw'}] },
  { id: '5-4-1',   rows: [{ count:1,type:'gk'},{count:5,type:'df'},{count:4,type:'mf'},{count:1,type:'fw'}] },
  { id: '4-2-3-1', rows: [{ count:1,type:'gk'},{count:4,type:'df'},{count:2,type:'mf'},{count:3,type:'mf'},{count:1,type:'fw'}] },
  { id: '4-2-2-2', rows: [{ count:1,type:'gk'},{count:4,type:'df'},{count:2,type:'mf'},{count:2,type:'mf'},{count:2,type:'fw'}] },
];

export const DEFAULT_FORMATION = '4-3-3';

export function getFormation(id: string): FormationConfig {
  return FORMATIONS.find(f => f.id === id) ?? FORMATIONS[0];
}

export interface SlotMeta { key: string; type: PositionType; rowIdx: number; colIdx: number }

export function getSlotKeys(config: FormationConfig): SlotMeta[] {
  const slots: SlotMeta[] = [];
  config.rows.forEach((row, rowIdx) => {
    for (let colIdx = 0; colIdx < row.count; colIdx++) {
      slots.push({ key: `r${rowIdx}_${colIdx}`, type: row.type, rowIdx, colIdx });
    }
  });
  return slots;
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Volumes/Externo/GitHub/wc2026-simulator && npx tsc --noEmit
```

Expected: no errors related to formations.ts

- [ ] **Step 3: Commit**

```bash
cd /Volumes/Externo/GitHub/wc2026-simulator && git add src/data/formations.ts && git commit -m "feat: add formation definitions for lineup editor"
```

---

### Task 2: Player picker overlay (`src/components/PlayerPickerModal.tsx`)

**Files:**
- Create: `src/components/PlayerPickerModal.tsx`

**Interfaces:**
- Consumes: `AFPlayer` from `'../data/apiFootball'`, `PositionType` from `'../data/formations'`
- Produces: `<PlayerPickerModal squad usedIds slotType onSelect onClose />`

- [ ] **Step 1: Create `src/components/PlayerPickerModal.tsx`**

Full component — search input, position filter pills, player list, remove option, Escape key handler.

- [ ] **Step 2: Verify build**

```bash
cd /Volumes/Externo/GitHub/wc2026-simulator && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PlayerPickerModal.tsx && git commit -m "feat: add PlayerPickerModal for slot assignment"
```

---

### Task 3: Formation editor component (`src/components/FormationEditor.tsx`)

**Files:**
- Create: `src/components/FormationEditor.tsx`

**Interfaces:**
- Consumes: `AFPlayer`, `PositionType`, `FORMATIONS`, `getFormation`, `getSlotKeys`, `PlayerPickerModal`
- Produces: `<FormationEditor team squad />`

- [ ] **Step 1: Create `src/components/FormationEditor.tsx`**

Formation picker pills, pitch with EditorSlot (filled or empty), auto-populate from squad, localStorage persistence, reset button, PlayerPickerModal overlay.

- [ ] **Step 2: Verify build**

```bash
cd /Volumes/Externo/GitHub/wc2026-simulator && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/FormationEditor.tsx && git commit -m "feat: add interactive FormationEditor pitch component"
```

---

### Task 4: Wire into TeamModal (`src/components/TeamModal.tsx`)

**Files:**
- Modify: `src/components/TeamModal.tsx` (add `'editor'` to ModalTab, import FormationEditor, add tab button + render)

- [ ] **Step 1: Add import**

```tsx
import { FormationEditor } from './FormationEditor';
```

- [ ] **Step 2: Extend ModalTab type**

```ts
type ModalTab = 'lineup' | 'squad' | 'editor';
```

- [ ] **Step 3: Add tab button** (inside the tabs div, after the Elenco button)

```tsx
<TabBtn active={activeTab === 'editor'} onClick={() => setActiveTab('editor')}>
  Editor
</TabBtn>
```

- [ ] **Step 4: Add render**

```tsx
{activeTab === 'editor' && (
  <FormationEditor team={team} squad={squad} />
)}
```

- [ ] **Step 5: Verify build + commit**

```bash
cd /Volumes/Externo/GitHub/wc2026-simulator && npm run build && git add src/components/TeamModal.tsx && git commit -m "feat: add Editor tab to TeamModal for interactive lineup"
```
