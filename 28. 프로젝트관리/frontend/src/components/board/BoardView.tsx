import { useState } from 'react';
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors,
  closestCorners, DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useBoardStore } from '@/stores/boardStore';
import { ColumnComponent } from './Column';
import { CardItem } from './CardItem';
import { apiClient } from '@/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

export function BoardView() {
  const columns = useBoardStore((s) => s.columns);
  const setColumns = useBoardStore((s) => s.setColumns);
  const queryClient = useQueryClient();
  const { id: projectId } = useParams();
  const [activeCard, setActiveCard] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function findColumnByCardId(cardId: string) {
    return columns.find((col) => col.cards.some((c) => c.id === cardId));
  }

  function handleDragStart(event: DragStartEvent) {
    const card = columns
      .flatMap((col) => col.cards)
      .find((c) => c.id === event.active.id);
    setActiveCard(card || null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeCol = findColumnByCardId(activeId);
    const isOverColumn = columns.some((col) => col.id === overId);
    const overCol = isOverColumn
      ? columns.find((col) => col.id === overId)
      : findColumnByCardId(overId);

    if (!activeCol || !overCol || activeCol.id === overCol.id) return;

    // 다른 컬럼으로 이동 (실시간 미리보기)
    const newColumns = structuredClone(columns);
    const fromCol = newColumns.find((c) => c.id === activeCol.id)!;
    const toCol = newColumns.find((c) => c.id === overCol.id)!;

    const activeIdx = fromCol.cards.findIndex((c) => c.id === activeId);
    const [card] = fromCol.cards.splice(activeIdx, 1);

    if (isOverColumn) {
      toCol.cards.push(card);
    } else {
      const overIdx = toCol.cards.findIndex((c) => c.id === overId);
      toCol.cards.splice(overIdx >= 0 ? overIdx : toCol.cards.length, 0, card);
    }

    setColumns(newColumns);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCol = findColumnByCardId(activeId);
    if (!activeCol) return;

    // 같은 컬럼 내 순서 변경
    if (activeId !== overId) {
      const overIdx = activeCol.cards.findIndex((c) => c.id === overId);
      const activeIdx = activeCol.cards.findIndex((c) => c.id === activeId);

      if (overIdx !== -1 && activeIdx !== -1) {
        const newColumns = structuredClone(columns);
        const col = newColumns.find((c) => c.id === activeCol.id)!;
        col.cards = arrayMove(col.cards, activeIdx, overIdx);
        col.cards.forEach((c, i) => { c.position = i; });
        setColumns(newColumns);
      }
    }

    // API 호출: 최종 위치 저장
    const finalCol = findColumnByCardId(activeId);
    if (!finalCol) return;
    const finalPos = finalCol.cards.findIndex((c) => c.id === activeId);

    try {
      await apiClient(`/cards/${activeId}/move`, {
        method: 'PUT',
        body: JSON.stringify({
          target_column_id: finalCol.id,
          position: finalPos >= 0 ? finalPos : 0,
        }),
      });
    } catch {
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto p-4 h-full">
        {columns.map((column) => (
          <ColumnComponent key={column.id} column={column} />
        ))}
      </div>
      <DragOverlay>
        {activeCard && <CardItem card={activeCard} />}
      </DragOverlay>
    </DndContext>
  );
}
