import { create } from 'zustand';
import type { Project } from '@/types/project';
import { useAuthStore } from './auth-store';

interface ProjectState {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id'>) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  getProjectsForUser: () => Project[];
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,
  
  clearError: () => set({ error: null }),
  
  fetchProjects: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    
    try {
      set({ isLoading: true, error: null });
      const response = await fetch('/api/projects', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch projects');
      }
      
      const data = await response.json();
      set({ projects: data });
    } catch (error) {
      console.error('Fetch projects error:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  addProject: async (projectData) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    
    try {
      set({ isLoading: true, error: null });
      
      // Ensure project data has all required fields before sending to server
      const safeProjectData = {
        ...projectData,
        phases: projectData.phases || [],
        recurringSessions: projectData.recurringSessions || [],
        mvg: projectData.mvg || {
          description: 'Define your minimum viable goal',
          completed: false,
          streak: 0,
          completionHistory: []
        }
      };
      
      // Ensure MVG has all required fields
      if (!safeProjectData.mvg.completionHistory) {
        safeProjectData.mvg.completionHistory = [];
      }
      
      // Ensure MVG has streak field
      if (safeProjectData.mvg.streak === undefined) {
        safeProjectData.mvg.streak = 0;
      }
      
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(safeProjectData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add project');
      }
      
      const newProject = await response.json();
      
      // Process project data returned from the server
      const processedProject = {
        ...newProject,
        // Ensure these fields are arrays even if they come back as null or undefined
        phases: Array.isArray(newProject.phases) ? newProject.phases : [],
        recurringSessions: Array.isArray(newProject.recurring_sessions) 
          ? newProject.recurring_sessions 
          : [],
        // Handle camelCase/snake_case conversion for recurring_sessions
        ...(newProject.recurring_sessions && { recurringSessions: newProject.recurring_sessions })
      };
      
      // Ensure MVG object has the right structure
      if (!processedProject.mvg) {
        processedProject.mvg = {
          description: 'Define your minimum viable goal',
          completed: false,
          streak: 0,
          completionHistory: []
        };
      } else if (!processedProject.mvg.completionHistory) {
        processedProject.mvg.completionHistory = [];
      }
      
      set(state => ({
        projects: [...state.projects, processedProject]
      }));
    } catch (error) {
      console.error('Add project error:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateProject: async (project) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(project),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update project');
      }
      
      const updatedProject = await response.json();
      set(state => ({
        projects: state.projects.map(p => p.id === project.id ? updatedProject : p)
      }));
    } catch (error) {
      console.error('Update project error:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteProject: async (id) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete project');
      }
      
      set(state => ({
        projects: state.projects.filter(p => p.id !== id)
      }));
    } catch (error) {
      console.error('Delete project error:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  getProjectsForUser: () => {
    return get().projects;
  }
}));