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
    console.log('📅 Session initializing:', session.id, session.title);
    const clone = JSON.parse(JSON.stringify(session));
    if (!Array.isArray(clone.completions)) {
      console.log('📅 Session initializing: fixing missing completions array');
      clone.completions = [];
    }
    if (!Array.isArray(clone.days)) {
      console.log('📅 Session initializing: fixing missing days array');
      clone.days = [];
    }
    console.log('📅 Session initialized:', clone);
    return clone;
  });
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  console.log('📅 RecurringSessionCard rendering:', localSession.id, localSession.title, 
              'days:', localSession.days?.length || 0);
  
  // Update local state when session props change
  useEffect(() => {
    console.log('📅 Session prop updated, updating local state', session.id);
    console.log('📅 New session data:', JSON.stringify(session));
    
    // Create a deep clone of the session
    const updatedSession = JSON.parse(JSON.stringify(session));
    
    // Ensure all properties are properly initialized
    if (!Array.isArray(updatedSession.completions)) {
      console.log('📅 Session update: fixing missing completions array');
      updatedSession.completions = [];
    }
    if (!Array.isArray(updatedSession.days)) {
      console.log('📅 Session update: fixing missing days array');
      updatedSession.days = [];
    }
    
    console.log('📅 Session update complete:', updatedSession);
    setLocalSession(updatedSession);
  }, [session]);
  
  // Handle local updates before propagating to parent
  const handleUpdate = (updatedFields: Partial<RecurringSession>) => {
    // Create a new session object with the updated fields
    console.log('📅 Session handleUpdate called with fields:', Object.keys(updatedFields));
    console.log('📅 Session handleUpdate values:', JSON.stringify(updatedFields));
    
    const updatedSession = { ...localSession, ...updatedFields };
    console.log('📅 Updating session locally:', updatedSession);
    
    // Ensure days is always an array
    if (!Array.isArray(updatedSession.days)) {
      console.log('📅 Session handleUpdate: fixing missing days array');
      updatedSession.days = [];
    }
    
    // Ensure completions is always an array
    if (!Array.isArray(updatedSession.completions)) {
      console.log('📅 Session handleUpdate: fixing missing completions array');
      updatedSession.completions = [];
    }
    
    // Update local state
    console.log('📅 Session handleUpdate: setting local state');
    setLocalSession(updatedSession);
    
    // Propagate to parent after validating
    console.log('📅 Session handleUpdate: propagating to parent');
    const sessionToSend = JSON.parse(JSON.stringify(updatedSession)); // Deep clone
    console.log('📅 Session handleUpdate: sending to parent:', sessionToSend);
    onUpdate(sessionToSend);
  };
  
  // Handle deletion with confirmation
  const handleDelete = () => {
    console.log('📅 Session handleDelete called for session:', localSession.id);
    if (window.confirm('Are you sure you want to delete this session?')) {
      console.log('📅 Session deletion confirmed for:', localSession.id);
      onDelete(localSession.id);
    } else {
      console.log('📅 Session deletion cancelled');
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
            onValueChange={days => {
              console.log('📅 Days updated to:', days);
              handleUpdate({ days });
            }}
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
              onChange={e => {
                console.log('📅 Start time updated to:', e.target.value);
                handleUpdate({ startTime: e.target.value });
              }}
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
              onChange={e => {
                console.log('📅 End time updated to:', e.target.value);
                handleUpdate({ endTime: e.target.value });
              }}
              className="w-full p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}