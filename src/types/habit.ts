export type HabitCategory = 'Spiritual' | 'Physical' | 'Intellectual';

export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  identity: string;
  streak: number;
  completed: boolean;
  completionHistory: {
    date: string;
    completed: boolean;
  }[];
  clearFramework?: string;
}

export interface HabitStore {
  habits: Habit[];
  addHabit: (habit: Omit<Habit, 'id' | 'streak' | 'completionHistory'>) => void;
  updateHabit: (id: string, habit: Habit) => void;
  toggleHabit: (id: string) => void;
  deleteHabit: (id: string) => void;
  resetDailyHabits: () => void;
}