import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import type { Phase, Subgoal } from '@/types/project';

interface PhaseCardProps {
  phase: Phase;
  onUpdate: (phase: Phase) => void;
}

export function PhaseCard({ phase, onUpdate }: PhaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSubgoalToggle = (subgoalId: string) => {
    const updatedSubgoals = phase.subgoals.map(subgoal =>
      subgoal.id === subgoalId
        ? { ...subgoal, completed: !subgoal.completed }
        : subgoal
    );
    onUpdate({ ...phase, subgoals: updatedSubgoals });
  };

  const addSubgoal = () => {
    const newSubgoal: Subgoal = {
      id: crypto.randomUUID(),
      title: 'New Subgoal',
      completed: false
    };
    onUpdate({
      ...phase,
      subgoals: [...phase.subgoals, newSubgoal]
    });
  };

  const updateSubgoalTitle = (subgoalId: string, title: string) => {
    const updatedSubgoals = phase.subgoals.map(subgoal =>
      subgoal.id === subgoalId ? { ...subgoal, title } : subgoal
    );
    onUpdate({ ...phase, subgoals: updatedSubgoals });
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <input
            type="text"
            value={phase.title}
            onChange={e => onUpdate({ ...phase, title: e.target.value })}
            className="text-lg font-medium bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 -ml-2 w-full"
          />
          {phase.targetDate && (
            <p className="text-sm text-gray-500 mt-1">
              Target: {phase.targetDate.toLocaleDateString()}
            </p>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 rounded-lg"
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-2">
          {phase.subgoals.map(subgoal => (
            <div
              key={subgoal.id}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg group"
            >
              <button
                onClick={() => handleSubgoalToggle(subgoal.id)}
                className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                  subgoal.completed
                    ? 'bg-primary text-white'
                    : 'border-2 border-gray-200'
                }`}
              >
                {subgoal.completed && <Check className="w-3 h-3" />}
              </button>
              <input
                type="text"
                value={subgoal.title}
                onChange={e => updateSubgoalTitle(subgoal.id, e.target.value)}
                className="flex-1 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 -ml-2"
              />
            </div>
          ))}
          <button
            onClick={addSubgoal}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 p-2"
          >
            <Plus className="w-4 h-4" />
            Add Subgoal
          </button>
        </div>
      )}
    </div>
  );
}