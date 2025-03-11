import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { X } from 'lucide-react';
import type { RecurringSession } from '@/types/project';
import { useState, useEffect } from 'react';

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
  // Keep a local copy of the session to avoid issues with parent state updates
  const [localSession, setLocalSession] = useState<RecurringSession>(() => {
    // Initialize with deep clone and ensure all properties exist
    const clone = JSON.parse(JSON.stringify(session));
    if (!Array.isArray(clone.completions)) {
      clone.completions = [];
    }
    if (!Array.isArray(clone.days)) {
      clone.days = [];
    }
    return clone;
  });
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  console.log('RecurringSessionCard rendering:', localSession.id, localSession.title);
  
  // Update local state when session props change
  useEffect(() => {
    console.log('Session prop updated, updating local state', session.id);
    // Create a deep clone of the session
    const updatedSession = JSON.parse(JSON.stringify(session));
    
    // Ensure all properties are properly initialized
    if (!Array.isArray(updatedSession.completions)) {
      updatedSession.completions = [];
    }
    if (!Array.isArray(updatedSession.days)) {
      updatedSession.days = [];
    }
    
    setLocalSession(updatedSession);
  }, [session]);
  
  // Handle local updates before propagating to parent
  const handleUpdate = (updatedFields: Partial<RecurringSession>) => {
    // Create a new session object with the updated fields
    const updatedSession = { ...localSession, ...updatedFields };
    console.log('Updating session locally:', updatedSession);
    
    // Ensure days is always an array
    if (!Array.isArray(updatedSession.days)) {
      updatedSession.days = [];
    }
    
    // Ensure completions is always an array
    if (!Array.isArray(updatedSession.completions)) {
      updatedSession.completions = [];
    }
    
    // Update local state
    setLocalSession(updatedSession);
    
    // Propagate to parent after validating
    onUpdate(structuredClone(updatedSession));
  };
  
  // Handle deletion with confirmation
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      console.log('Deleting session:', localSession.id);
      onDelete(localSession.id);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          value={localSession.title}
          onChange={e => handleUpdate({ title: e.target.value })}
          className="text-lg font-medium bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 -ml-2"
        />
        <button
          onClick={handleDelete}
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
            value={localSession.days || []}
            onValueChange={days => handleUpdate({ days })}
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
              value={localSession.startTime}
              onChange={e => handleUpdate({ startTime: e.target.value })}
              className="w-full p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time
            </label>
            <input
              type="time"
              value={localSession.endTime}
              onChange={e => handleUpdate({ endTime: e.target.value })}
              className="w-full p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}