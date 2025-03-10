import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';

export interface WorkSession {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  projectId: string;
  projectColor: string;
}

interface WorkSessionCardProps {
  session: WorkSession;
  onClick?: () => void;
}

export function WorkSessionCard({ session, onClick }: WorkSessionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: session.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${session.projectColor} p-3 rounded-lg text-white cursor-move transition-shadow hover:shadow-lg`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">{session.title}</h4>
        <span className="text-sm opacity-90">
          {format(session.startTime, 'h:mm a')} - {format(session.endTime, 'h:mm a')}
        </span>
      </div>
    </div>
  );
}