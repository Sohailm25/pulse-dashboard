import { create } from 'zustand';
import type { Habit } from '@/types/habit';
import { useAuthStore } from './auth-store';

interface HabitStore {
  habits: Habit[];
  isLoading: boolean;
  error: string | null;
  fetchHabits: () => Promise<void>;
  addHabit: (habit: Omit<Habit, 'id' | 'streak' | 'completed' | 'completionHistory'>) => Promise<void>;
  updateHabit: (id: string, habit: Habit) => Promise<void>;
  toggleHabit: (id: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  resetDailyHabits: () => Promise<void>;
  getHabitsForUser: () => Habit[];
  clearError: () => void;
}

const useHabitStore = create<HabitStore>()((set, get) => ({
  habits: [],
  isLoading: false,
  error: null,
  
  clearError: () => set({ error: null }),
  
  fetchHabits: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    
    try {
      set({ isLoading: true, error: null });
      const response = await fetch('/api/habits', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch habits');
      }
      
      const data = await response.json();
      
      // Ensure each habit has required fields
      const processedHabits = data.map((habit) => ({
        ...habit,
        completionHistory: habit.completionHistory || [],
        streak: habit.streak || 0
      }));
      
      set({ habits: processedHabits });
    } catch (error) {
      console.error('Fetch habits error:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  addHabit: async (habitData) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    
    try {
      set({ isLoading: true, error: null });
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(habitData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add habit');
      }
      
      const newHabit = await response.json();
      
      // Ensure the new habit has a completionHistory array and other required fields
      const processedHabit = {
        ...newHabit,
        completionHistory: newHabit.completionHistory || [],
        streak: newHabit.streak || 0
      };
      
      set(state => ({
        habits: [...state.habits, processedHabit]
      }));
    } catch (error) {
      console.error('Add habit error:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateHabit: async (id, habit) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`/api/habits/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(habit),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update habit');
      }
      
      const updatedHabit = await response.json();
      set(state => ({
        habits: state.habits.map(h => h.id === id ? updatedHabit : h)
      }));
    } catch (error) {
      console.error('Update habit error:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  toggleHabit: async (id) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`/api/habits/${id}/toggle`, {
        method: 'PUT',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to toggle habit');
      }
      
      const updatedHabit = await response.json();
      set(state => ({
        habits: state.habits.map(h => h.id === id ? updatedHabit : h)
      }));
    } catch (error) {
      console.error('Toggle habit error:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteHabit: async (id) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`/api/habits/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete habit');
      }
      
      set(state => ({
        habits: state.habits.filter(h => h.id !== id)
      }));
    } catch (error) {
      console.error('Delete habit error:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  resetDailyHabits: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    
    try {
      set({ isLoading: true, error: null });
      const response = await fetch('/api/habits/reset-daily', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset daily habits');
      }
      
      // Refresh habits after reset
      await get().fetchHabits();
    } catch (error) {
      console.error('Reset daily habits error:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  getHabitsForUser: () => {
    return get().habits;
  }
}));

export { useHabitStore };