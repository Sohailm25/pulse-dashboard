'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  UniqueIdentifier,
  DraggableSyntheticListeners,
  useDraggable,
  useDroppable,
  rectIntersection,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createContext, useContext, ReactNode } from 'react';

interface DragHandleProps {
  id: UniqueIdentifier;
  listeners?: DraggableSyntheticListeners;
}

interface KanbanContextProps {
  activeId: UniqueIdentifier | null;
}

const KanbanContext = createContext<KanbanContextProps>({
  activeId: null,
});

export type Status = {
  id: string;
  name: string;
  color: string;
};

export type Feature = {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  status: Status;
};

interface KanbanProviderProps {
  children: ReactNode;
  onDragEnd?: (event: DragEndEvent) => void;
  className?: string;
}

interface KanbanBoardProps {
  children: ReactNode;
  onDragEnd: (event: DragEndEvent) => void;
}

interface KanbanHeaderProps {
  id: string;
  children: ReactNode;
  className?: string;
}

interface KanbanCardsProps {
  id: string;
  children: ReactNode;
}

interface KanbanCardProps {
  id: string;
  children?: ReactNode;
  className?: string;
  index?: number;
  parent?: string;
  name?: string;
}

export const KanbanProvider = ({
  children,
  onDragEnd,
  className,
}: KanbanProviderProps) => {
  // Configure the drag sensor with a custom activation constraint
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Increase drag activation constraints for better mobile experience
      activationConstraint: {
        distance: 8, // Minimum distance before a drag starts
        delay: 150, // Delay in ms before a drag starts - useful for mobile
        tolerance: 5, // Tolerance for movement during delay
      },
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragEnd={onDragEnd}
    >
      <div className="grid w-full auto-cols-fr grid-flow-col gap-4 sm:grid-flow-col">
        {children}
      </div>
    </DndContext>
  );
};

export const KanbanBoard = ({ children, onDragEnd }: KanbanBoardProps) => {
  return (
    <div
      onTouchMove={(e) => {
        // Prevent page scrolling during drag on mobile
        if (document.querySelector("[data-dragging]")) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </div>
  );
};

export const KanbanHeader = ({
  id,
  children,
  className,
}: KanbanHeaderProps) => {
  return <div className={className}>{children}</div>;
};

export const KanbanCards = ({ id, children }: KanbanCardsProps) => {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div ref={setNodeRef} className="min-h-[150px] p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      {children}
    </div>
  );
};

export const KanbanCard = ({
  id,
  children,
  className,
  index = 0,
  parent,
  name,
}: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      data: { index, parent },
    });

  const dragAttributes = {
    ...attributes,
    ...listeners,
    style: {
      transform: transform
        ? `translateX(${transform.x}px) translateY(${transform.y}px)`
        : undefined,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 1 : 0,
    },
  };

  return (
    <div
      className={`rounded-md p-3 shadow-sm mb-3 touch-manipulation ${
        isDragging ? 'cursor-grabbing' : ''
      } ${className || ''}`}
      ref={setNodeRef}
      {...dragAttributes}
      data-dragging={isDragging || undefined}
    >
      {children ?? <p className="m-0 font-medium text-sm">{name}</p>}
    </div>
  );
};