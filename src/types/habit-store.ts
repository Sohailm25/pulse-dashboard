import type { Habit } from './habit';

export interface HabitStore {
  habits: Record<string, Habit[]>;
  addHabit: (habit: Omit<Habit, 'id' | 'streak' | 'completionHistory'>) => void;
  updateHabit: (id: string, habit: Habit) => void;
  toggleHabit: (id: string) => void;
  deleteHabit: (id: string) => void;
  resetDailyHabits: () => void;
  getHabitsForUser: () => Habit[];
}