import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Habit, HabitStore } from '@/types/habit';
import { format, isToday, parseISO } from 'date-fns';
import { useAuthStore } from './auth-store';

const useHabitStore = create<HabitStore>()(
  persist(
    (set, get) => ({
      habits: {},
      addHabit: (habit) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        const newHabit: Habit = {
          ...habit,
          id: crypto.randomUUID(),
          streak: 0,
          completed: false,
          completionHistory: []
        };

        set((state) => ({
          habits: {
            ...state.habits,
            [userId]: [...(state.habits[userId] || []), newHabit]
          }
        }));
      },
      updateHabit: (id, updatedHabit) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        set((state) => ({
          habits: {
            ...state.habits,
            [userId]: (state.habits[userId] || []).map((habit) =>
              habit.id === id ? { ...updatedHabit } : habit
            )
          }
        }));
      },
      toggleHabit: (id) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');

        set((state) => ({
          habits: {
            ...state.habits,
            [userId]: (state.habits[userId] || []).map((habit) => {
              if (habit.id === id) {
                const newCompleted = !habit.completed;
                let newHistory = [...habit.completionHistory];
                const todayIndex = newHistory.findIndex(h => h.date === todayStr);
                
                if (todayIndex >= 0) {
                  newHistory[todayIndex] = { date: todayStr, completed: newCompleted };
                } else {
                  newHistory.unshift({ date: todayStr, completed: newCompleted });
                }

                let streak = 0;
                if (newCompleted) {
                  for (const completion of newHistory.sort((a, b) => b.date.localeCompare(a.date))) {
                    if (completion.completed) streak++;
                    else break;
                  }
                }

                return {
                  ...habit,
                  completed: newCompleted,
                  completionHistory: newHistory,
                  streak
                };
              }
              return habit;
            })
          }
        }));
      },
      deleteHabit: (id) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        set((state) => ({
          habits: {
            ...state.habits,
            [userId]: (state.habits[userId] || []).filter((habit) => habit.id !== id)
          }
        }));
      },
      getHabitsForUser: () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return [];
        return get().habits[userId] || [];
      },
      resetDailyHabits: () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        const today = format(new Date(), 'yyyy-MM-dd');
        const state = get();
        
        const needsReset = (state.habits[userId] || []).some(habit => {
          const lastCompletion = habit.completionHistory[0];
          return !lastCompletion || !isToday(parseISO(lastCompletion.date));
        });

        if (needsReset) {
          set((state) => ({
            habits: {
              ...state.habits,
              [userId]: (state.habits[userId] || []).map((habit) => ({
                ...habit,
                completed: false,
                streak: 0
              }))
            }
          }));
        }
      }
    }),
    {
      name: 'habits-storage'
    }
  )
);

export { useHabitStore };