import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project } from '@/types/project';
import { useAuthStore } from './auth-store';

interface ProjectState {
  projects: Record<string, Project[]>;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  getProjectsForUser: () => Project[];
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: {},
      addProject: (project) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        set((state) => ({
          projects: {
            ...state.projects,
            [userId]: [
              ...(state.projects[userId] || []),
              {
                ...project,
                mvg: project.mvg || {
                  description: 'Define your minimum viable goal',
                  completed: false,
                  streak: 0,
                  completionHistory: []
                }
              }
            ]
          }
        }));
      },
      updateProject: (project) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        set((state) => ({
          projects: {
            ...state.projects,
            [userId]: (state.projects[userId] || []).map((p) => 
              p.id === project.id ? {
                ...project,
                mvg: project.mvg || {
                  description: 'Define your minimum viable goal',
                  completed: false,
                  streak: 0,
                  completionHistory: []
                }
              } : p
            )
          }
        }));
      },
      deleteProject: (id) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        set((state) => ({
          projects: {
            ...state.projects,
            [userId]: (state.projects[userId] || []).filter((p) => p.id !== id)
          }
        }));
      },
      getProjectsForUser: () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return [];
        return get().projects[userId] || [];
      }
    }),
    {
      name: 'project-storage'
    }
  )
);