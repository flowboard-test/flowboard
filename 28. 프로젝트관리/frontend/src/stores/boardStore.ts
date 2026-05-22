import { create } from 'zustand';

interface Column {
  id: string;
  name: string;
  position: number;
  wip_limit: number | null;
  cards: Card[];
}

interface Card {
  id: string;
  title: string;
  priority: string;
  assignee_id: string | null;
  due_date: string | null;
  start_date: string | null;
  position: number;
  version: number;
}

interface BoardState {
  columns: Column[];
  setColumns: (columns: Column[]) => void;
  moveCard: (
    cardId: string,
    fromColId: string,
    toColId: string,
    position: number
  ) => void;
  updateCard: (cardId: string, changes: Partial<Card>) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  columns: [],
  setColumns: (columns) => set({ columns }),
  moveCard: (cardId, fromColId, toColId, position) =>
    set((state) => {
      const columns = structuredClone(state.columns);
      const fromCol = columns.find((c) => c.id === fromColId);
      const toCol = columns.find((c) => c.id === toColId);
      if (!fromCol || !toCol) return state;

      const cardIdx = fromCol.cards.findIndex((c) => c.id === cardId);
      if (cardIdx === -1) return state;

      const [card] = fromCol.cards.splice(cardIdx, 1);
      toCol.cards.splice(position, 0, card);

      // Reindex positions
      fromCol.cards.forEach((c, i) => { c.position = i; });
      toCol.cards.forEach((c, i) => { c.position = i; });

      return { columns };
    }),
  updateCard: (cardId, changes) =>
    set((state) => {
      const columns = structuredClone(state.columns);
      for (const col of columns) {
        const card = col.cards.find((c) => c.id === cardId);
        if (card) {
          Object.assign(card, changes);
          break;
        }
      }
      return { columns };
    }),
}));
