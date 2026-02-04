import { useState, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  Announcements,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import type { EngagementItem, EngagementStatus } from '../types';

interface KanbanBoardProps {
  items: EngagementItem[];
  onItemClick: (item: EngagementItem) => void;
  onStatusChange: (itemId: string, newStatus: EngagementStatus) => void;
  selectedItemId?: string;
}

const COLUMNS: { id: EngagementStatus; title: string; color: string }[] = [
  { id: 'discovered', title: 'Discovered', color: 'bg-gray-400' },
  { id: 'draft_ready', title: 'Draft Ready', color: 'bg-yellow-400' },
  { id: 'in_review', title: 'In Review', color: 'bg-blue-400' },
  { id: 'approved', title: 'Approved', color: 'bg-green-400' },
  { id: 'published', title: 'Published', color: 'bg-green-600' },
];

interface KanbanCardProps {
  item: EngagementItem;
  onClick: () => void;
  isSelected: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onMoveToColumn?: (direction: 'left' | 'right') => void;
}

function KanbanCard({ item, onClick, isSelected, onKeyDown, onMoveToColumn }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow keyboard navigation without dragging
    if (e.key === 'ArrowLeft' && onMoveToColumn) {
      e.preventDefault();
      onMoveToColumn('left');
    } else if (e.key === 'ArrowRight' && onMoveToColumn) {
      e.preventDefault();
      onMoveToColumn('right');
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
    onKeyDown?.(e);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="listitem"
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={`${item.postTitle} in r/${item.subreddit}${item.relevanceScore ? `, relevance ${item.relevanceScore} out of 10` : ''}`}
      className={`p-3 rounded-lg border cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-carol-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
        isSelected
          ? 'border-carol-500 bg-carol-50 dark:bg-carol-900/30'
          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'
      }`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="mt-1 cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-carol-500 rounded"
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {item.postTitle}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              r/{item.subreddit}
            </span>
            {item.relevanceScore && (
              <span className="text-xs text-gray-400">
                · {item.relevanceScore}/10
              </span>
            )}
          </div>
          {item.commentScore !== undefined && item.commentScore !== null && (
            <span className="text-xs text-green-600 dark:text-green-400 mt-1 inline-block">
              +{item.commentScore} pts
            </span>
          )}
        </div>
        <a
          href={item.postUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-gray-400 hover:text-carol-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-carol-500 rounded"
          aria-label={`Open original post in new tab`}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  items,
  onItemClick,
  selectedItemId,
  onMoveItem,
  columnIndex,
  totalColumns,
}: {
  column: (typeof COLUMNS)[0];
  items: EngagementItem[];
  onItemClick: (item: EngagementItem) => void;
  selectedItemId?: string;
  onMoveItem?: (itemId: string, direction: 'left' | 'right') => void;
  columnIndex: number;
  totalColumns: number;
}) {
  const columnRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={columnRef}
      className="flex-1 min-w-[280px] max-w-[320px]"
      role="group"
      aria-labelledby={`column-${column.id}-title`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-3 h-3 rounded-full ${column.color}`} aria-hidden="true" />
        <h3
          id={`column-${column.id}-title`}
          className="font-medium text-gray-900 dark:text-gray-100"
        >
          {column.title}
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400" aria-label={`${items.length} items`}>
          ({items.length})
        </span>
      </div>
      <div
        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 min-h-[400px] max-h-[calc(100vh-280px)] overflow-y-auto"
        role="list"
        aria-label={`${column.title} items`}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((item) => (
              <KanbanCard
                key={item.id}
                item={item}
                onClick={() => onItemClick(item)}
                isSelected={item.id === selectedItemId}
                onMoveToColumn={(direction) => onMoveItem?.(item.id, direction)}
              />
            ))}
            {items.length === 0 && (
              <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-8" role="status">
                No items
              </div>
            )}
          </div>
        </SortableContext>
      </div>
      {/* Keyboard navigation hint */}
      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-2">
        {columnIndex > 0 && (
          <span className="flex items-center gap-1">
            <ChevronLeft className="h-3 w-3" aria-hidden="true" />
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">←</kbd>
          </span>
        )}
        {columnIndex < totalColumns - 1 && (
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">→</kbd>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({
  items,
  onItemClick,
  onStatusChange,
  selectedItemId,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  const getItemsByStatus = (status: EngagementStatus) =>
    items.filter((item) => item.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    const item = items.find((i) => i.id === event.active.id);
    if (item) {
      setAnnouncement(`Picked up ${item.postTitle}. Use arrow keys to move between columns.`);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      setAnnouncement('Dropped. No changes made.');
      return;
    }

    const activeItem = items.find((i) => i.id === active.id);
    if (!activeItem) return;

    // Find which column the item was dropped over
    const overColumn = COLUMNS.find((col) => {
      const columnItems = getItemsByStatus(col.id);
      return (
        columnItems.some((i) => i.id === over.id) ||
        over.id === col.id
      );
    });

    if (overColumn && overColumn.id !== activeItem.status) {
      onStatusChange(activeItem.id, overColumn.id);
      setAnnouncement(`Moved ${activeItem.postTitle} to ${overColumn.title}.`);
    } else {
      setAnnouncement('Dropped. No changes made.');
    }
  };

  // Handle keyboard-based column movement (without drag)
  const handleMoveItem = useCallback(
    (itemId: string, direction: 'left' | 'right') => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const currentColumnIndex = COLUMNS.findIndex((col) => col.id === item.status);
      const newColumnIndex = direction === 'left' ? currentColumnIndex - 1 : currentColumnIndex + 1;

      if (newColumnIndex >= 0 && newColumnIndex < COLUMNS.length) {
        const newColumn = COLUMNS[newColumnIndex];
        onStatusChange(itemId, newColumn.id);
        setAnnouncement(`Moved ${item.postTitle} to ${newColumn.title}.`);
      }
    },
    [items, onStatusChange]
  );

  // Screen reader announcements
  const announcements: Announcements = {
    onDragStart({ active }) {
      const item = items.find((i) => i.id === active.id);
      return item
        ? `Picked up ${item.postTitle}. Current column: ${COLUMNS.find((c) => c.id === item.status)?.title}`
        : '';
    },
    onDragOver({ active, over }) {
      if (!over) return '';
      const item = items.find((i) => i.id === active.id);
      const overColumn = COLUMNS.find((col) => {
        const columnItems = getItemsByStatus(col.id);
        return columnItems.some((i) => i.id === over.id) || over.id === col.id;
      });
      return item && overColumn ? `Over ${overColumn.title} column` : '';
    },
    onDragEnd({ active, over }) {
      if (!over) return 'Dropped outside';
      const item = items.find((i) => i.id === active.id);
      const overColumn = COLUMNS.find((col) => {
        const columnItems = getItemsByStatus(col.id);
        return columnItems.some((i) => i.id === over.id) || over.id === col.id;
      });
      return item && overColumn ? `Dropped ${item.postTitle} in ${overColumn.title}` : '';
    },
    onDragCancel({ active }) {
      const item = items.find((i) => i.id === active.id);
      return item ? `Cancelled moving ${item.postTitle}` : '';
    },
  };

  return (
    <>
      {/* Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable: 'Press space or enter to pick up. Use arrow keys to move between columns. Press space or enter again to drop.',
          },
        }}
      >
        <div
          className="flex gap-4 overflow-x-auto pb-4"
          role="region"
          aria-label="Kanban board with engagement items organized by status"
        >
          {COLUMNS.map((column, index) => (
            <KanbanColumn
              key={column.id}
              column={column}
              items={getItemsByStatus(column.id)}
              onItemClick={onItemClick}
              selectedItemId={selectedItemId}
              onMoveItem={handleMoveItem}
              columnIndex={index}
              totalColumns={COLUMNS.length}
            />
          ))}
        </div>
        <DragOverlay>
          {activeItem ? (
            <div
              className="p-3 rounded-lg border border-carol-500 bg-white dark:bg-gray-800 shadow-lg rotate-3"
              aria-hidden="true"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {activeItem.postTitle}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                r/{activeItem.subreddit}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
