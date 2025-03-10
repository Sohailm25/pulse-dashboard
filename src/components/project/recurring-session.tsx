import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { X } from 'lucide-react';
import type { RecurringSession } from '@/types/project';

interface RecurringSessionProps {
  session: RecurringSession;
  onUpdate: (session: RecurringSession) => void;
  onDelete: (id: string) => void;
}

export function RecurringSessionCard({
  session,
  onUpdate,
  onDelete
}: RecurringSessionProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          value={session.title}
          onChange={e => onUpdate({ ...session, title: e.target.value })}
          className="text-lg font-medium bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 -ml-2"
        />
        <button
          onClick={() => onDelete(session.id)}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Days
          </label>
          <ToggleGroup
            type="multiple"
            value={session.days}
            onValueChange={days => onUpdate({ ...session, days })}
            className="flex flex-wrap gap-2"
          >
            {days.map(day => (
              <ToggleGroupItem
                key={day}
                value={day}
                className="px-3 py-1 rounded-full data-[state=on]:bg-primary data-[state=on]:text-white"
              >
                {day}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time
            </label>
            <input
              type="time"
              value={session.startTime}
              onChange={e => onUpdate({ ...session, startTime: e.target.value })}
              className="w-full p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time
            </label>
            <input
              type="time"
              value={session.endTime}
              onChange={e => onUpdate({ ...session, endTime: e.target.value })}
              className="w-full p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}