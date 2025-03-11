import React, { useState } from 'react';
import { Check, Plus, X, Edit2, Trash, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Habit, HabitCategory } from '@/types/habit';
import { useHabitStore } from '@/stores/habit-store';
import { format, parseISO, subDays } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: HabitCategory;
  habit?: Habit;
}

function HabitModal({ isOpen, onClose, habit }: HabitModalProps) {
  const [name, setName] = useState(habit?.name || '');
  const [identity, setIdentity] = useState(habit?.identity || '');
  const [category, setCategory] = useState<HabitCategory>(habit?.category || 'Spiritual');
  const [clearFramework, setClearFramework] = useState(habit?.clearFramework || '');
  const { addHabit, updateHabit, deleteHabit } = useHabitStore();

  // Reset form when modal opens with new habit data
  React.useEffect(() => {
    if (isOpen) {
      setName(habit?.name || '');
      setIdentity(habit?.identity || '');
      setCategory(habit?.category || 'Spiritual');
      setClearFramework(habit?.clearFramework || '');
    }
  }, [isOpen, habit]);

  const categories: HabitCategory[] = ['Spiritual', 'Physical', 'Intellectual'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (habit) {
      updateHabit(habit.id, {
        ...habit,
        name,
        identity,
        category,
        clearFramework
      });
    } else {
      addHabit({
        name,
        identity,
        category,
        completed: false,
        clearFramework
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (habit) {
      deleteHabit(habit.id);
      onClose();
    }
  };

  const getCategoryColor = (cat: HabitCategory) => {
    switch (cat) {
      case 'Spiritual': return 'bg-red-500 text-white';
      case 'Physical': return 'bg-blue-500 text-white';
      case 'Intellectual': return 'bg-purple-500 text-white';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-[600px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold dark:text-white">
                {habit ? 'Edit' : 'New'} Habit
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <div className="flex gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                        category === cat
                          ? getCategoryColor(cat)
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Habit Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Morning Prayer"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Identity Statement
                </label>
                <input
                  type="text"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  className="w-full p-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., I am a devoted believer"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CLEAR Framework
                </label>
                <Textarea
                  value={clearFramework}
                  onChange={(e) => setClearFramework(e.target.value)}
                  placeholder="Describe your habit using the CLEAR framework..."
                  className="resize-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  rows={4}
                />
              </div>

              <div className="flex justify-between gap-3 pt-2">
                {habit && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg flex items-center gap-2"
                  >
                    <Trash className="w-4 h-4" />
                    Delete
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                  >
                    {habit ? 'Save Changes' : 'Create Habit'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function StreakVisualization({ habit }: { habit: Habit }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => ({
    date: format(subDays(today, 6 - i), 'yyyy-MM-dd'),
    index: i
  }));
  
  // Ensure completionHistory exists
  const safeCompletionHistory = habit.completionHistory || [];
  
  return (
    <div className="flex gap-1">
      {days.map(({ date, index }) => {
        const completion = safeCompletionHistory.find(h => h?.date === date);
        const isTodays = date === format(today, 'yyyy-MM-dd');
        
        return (
          <div
            key={`${habit.id}-${date}-${index}`}
            className="flex-1 h-1 rounded-full transition-colors"
            style={{
              backgroundColor: isTodays && habit.completed
                ? habit.category === 'Spiritual' ? 'rgb(239, 68, 68)' :
                  habit.category === 'Physical' ? 'rgb(59, 130, 246)' :
                  'rgb(168, 85, 247)'
                : completion?.completed
                ? habit.category === 'Spiritual' ? 'rgb(239, 68, 68)' :
                  habit.category === 'Physical' ? 'rgb(59, 130, 246)' :
                  'rgb(168, 85, 247)'
                : 'rgb(229, 231, 235)'
            }}
            title={format(parseISO(date), 'MMM d, yyyy')}
          />
        );
      })}
    </div>
  );
}

function ClearFrameworkPopup({ framework }: { framework: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 p-4 z-50"
    >
      <p className="text-sm text-gray-700 dark:text-gray-300">{framework}</p>
    </motion.div>
  );
}

export function HabitTracker() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>();
  const [hoveredHabit, setHoveredHabit] = useState<string | null>(null);
  const { getHabitsForUser, toggleHabit } = useHabitStore();

  const categories: HabitCategory[] = ['Spiritual', 'Physical', 'Intellectual'];
  const habits = getHabitsForUser();
  const allHabits = [...habits].sort((a, b) => {
    if (a.category === b.category) {
      return a.name.localeCompare(b.name);
    }
    return categories.indexOf(a.category) - categories.indexOf(b.category);
  });

  const getCategoryColor = (category: HabitCategory) => {
    switch (category) {
      case 'Spiritual': return 'text-red-500';
      case 'Physical': return 'text-blue-500';
      case 'Intellectual': return 'text-purple-500';
    }
  };

  const handleEditClick = (habit: Habit) => {
    setEditingHabit(habit);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingHabit(undefined);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {allHabits.map((habit) => (
          <div
            key={habit.id}
            className="relative bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleHabit(habit.id)}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                    habit.completed
                      ? habit.category === 'Spiritual' ? 'bg-red-500' :
                        habit.category === 'Physical' ? 'bg-blue-500' :
                        'bg-purple-500'
                      : 'border-2 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {habit.completed && <Check className="w-3 h-3 text-white" />}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium dark:text-white">{habit.name}</h4>
                    <span className={`text-xs ${getCategoryColor(habit.category)}`}>
                      {habit.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{habit.identity}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {habit.streak > 0 && (
                  <div className="flex items-center gap-1 text-orange-500">
                    <span className="text-xs">🔥</span>
                    <span className="text-xs font-medium">{habit.streak}</span>
                  </div>
                )}
                {habit.clearFramework && (
                  <div className="relative">
                    <button
                      onMouseEnter={() => setHoveredHabit(habit.id)}
                      onMouseLeave={() => setHoveredHabit(null)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {hoveredHabit === habit.id && (
                        <ClearFrameworkPopup framework={habit.clearFramework} />
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <button
                  onClick={() => handleEditClick(habit)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-2">
              <StreakVisualization habit={habit} />
            </div>
          </div>
        ))}

        <button
          onClick={() => {
            setEditingHabit(undefined);
            setIsModalOpen(true);
          }}
          className="w-full p-4 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-primary"
        >
          <Plus className="w-4 h-4" />
          Add New Habit
        </button>
      </div>

      <HabitModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        habit={editingHabit}
      />
    </div>
  );
}