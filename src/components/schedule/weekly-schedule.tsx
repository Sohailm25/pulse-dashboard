import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { format, addDays, startOfWeek } from 'date-fns';
import { Plus, Filter } from 'lucide-react';
import { WorkSessionCard, type WorkSession } from './work-session';
import { SessionModal } from './session-modal';
import { Project } from '../project-card';

interface WeeklyScheduleProps {
  project: Project;
  sessions: WorkSession[];
  onSessionsChange: (sessions: WorkSession[]) => void;
  onSessionClick: (session: WorkSession) => void;
}

export function WeeklySchedule({
  project,
  sessions,
  onSessionsChange,
  onSessionClick,
}: WeeklyScheduleProps) {
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const startOfCurrentWeek = startOfWeek(new Date());
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = sessions.findIndex((s) => s.id === active.id);
      const newIndex = sessions.findIndex((s) => s.id === over.id);
      
      onSessionsChange(arrayMove(sessions, oldIndex, newIndex));
    }
  };

  const handleAddSession = (sessionData: Omit<WorkSession, 'id'>) => {
    const newSession: WorkSession = {
      ...sessionData,
      id: crypto.randomUUID(),
    };
    onSessionsChange([...sessions, newSession]);
  };

  const getDaySessions = (date: Date) =>
    sessions.filter(
      (session) =>
        format(session.startTime, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );

  return (
    <>
      <div className="bg-white rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Weekly Schedule</h2>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Filter className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Add Session
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day) => (
            <div
              key={format(day, 'yyyy-MM-dd')}
              className={`p-4 rounded-lg ${
                format(day, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd')
                  ? 'bg-gray-50'
                  : ''
              }`}
              onClick={() => setSelectedDay(day)}
            >
              <div className="text-center mb-4">
                <p className="text-sm text-gray-500">{format(day, 'EEE')}</p>
                <p className="text-lg font-medium">{format(day, 'd')}</p>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={getDaySessions(day).map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {getDaySessions(day).map((session) => (
                      <WorkSessionCard
                        key={session.id}
                        session={session}
                        onClick={() => onSessionClick(session)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ))}
        </div>
      </div>

      <SessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddSession}
        projectId={project.id}
        projectColor={project.color}
        initialDate={selectedDay}
      />
    </>
  );
}