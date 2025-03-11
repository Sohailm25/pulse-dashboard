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
    if (!userId) {
      console.log('No user ID found, skipping project fetch');
      return;
    }
    
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
      
      // Process the projects to ensure all properties exist
      const processedProjects = data.map((project: any) => {
        // Ensure phases is an array
        const phases = Array.isArray(project.phases) ? project.phases : [];
        
        // Ensure recurring_sessions/recurringSessions is an array
        const recurringSessions = Array.isArray(project.recurring_sessions) 
          ? project.recurring_sessions 
          : (Array.isArray(project.recurringSessions) ? project.recurringSessions : []);
        
        // Ensure mvg structure is complete
        const mvg = project.mvg || {
          description: 'Define your minimum viable goal',
          completed: false,
          streak: 0,
          completionHistory: []
        };
        
        if (!mvg.completionHistory) {
          mvg.completionHistory = [];
        }
        
        if (mvg.streak === undefined) {
          mvg.streak = 0;
        }
        
        return {
          ...project,
          phases,
          recurringSessions,
          mvg
        };
      });
      
      set({ projects: processedProjects });
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
    if (!userId) {
      console.error('Cannot update project: No user ID found');
      return;
    }
    
    try {
      console.log('🔵 PROJECT-STORE: updateProject called with:', {
        id: project.id,
        title: project.title,
        recurringSessions: project.recurringSessions?.length || 0
      });
      console.log('🔵 Full recurring sessions before API call:', JSON.stringify(project.recurringSessions));
      
      // Validate recurringSessions before sending to API
      const validatedProject = JSON.parse(JSON.stringify(project)); // Deep clone
      
      if (!Array.isArray(validatedProject.recurringSessions)) {
        console.warn('🟠 PROJECT-STORE: recurringSessions is not an array, fixing before API call');
        validatedProject.recurringSessions = [];
      }
      
      // Validate each recurring session
      validatedProject.recurringSessions = validatedProject.recurringSessions.map(session => {
        if (!session.completions || !Array.isArray(session.completions)) {
          console.log('🟠 PROJECT-STORE: Fixing missing completions array for session:', session.id);
          session.completions = [];
        }
        if (!Array.isArray(session.days)) {
          console.log('🟠 PROJECT-STORE: Fixing missing days array for session:', session.id);
          session.days = [];
        }
        return session;
      });
      
      console.log('🔵 PROJECT-STORE: Sending to API:', {
        url: `/api/projects/${project.id}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedProject).substring(0, 200) + '...' // Log first 200 chars
      });
      
      set({ isLoading: true, error: null });
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validatedProject),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('🔴 PROJECT-STORE: API error response:', errorData);
        throw new Error(errorData.message || 'Failed to update project');
      }
      
      // Get the updated project from the response
      const updatedProject = await response.json();
      console.log('🟢 PROJECT-STORE: API response success:', {
        id: updatedProject.id,
        title: updatedProject.title,
        recurringSessions: (updatedProject.recurringSessions || updatedProject.recurring_sessions)?.length || 0
      });
      
      console.log('🟢 PROJECT-STORE: Full response:', JSON.stringify(updatedProject).substring(0, 200) + '...');
      
      // Process the response to ensure all fields are properly formatted
      const processedProject = {
        ...updatedProject,
        // Ensure these fields are arrays even if they come back as null or undefined
        phases: Array.isArray(updatedProject.phases) ? updatedProject.phases : [],
        // Handle possible snake_case from API
        recurringSessions: Array.isArray(updatedProject.recurring_sessions) 
          ? updatedProject.recurring_sessions 
          : (Array.isArray(updatedProject.recurringSessions) 
              ? updatedProject.recurringSessions 
              : [])
      };
      
      console.log('🟢 PROJECT-STORE: Project processed with sessions count:', 
                  processedProject.recurringSessions.length);
      console.log('🟢 Full recurring sessions after API response:', 
                 JSON.stringify(processedProject.recurringSessions));
      
      // Update the projects in the store
      set(state => ({
        projects: state.projects.map(p => p.id === project.id ? processedProject : p)
      }));
    } catch (error) {
      console.error('🔴 PROJECT-STORE: Update project error:', error);
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
    const projects = get().projects;
    
    // Ensure we always return a valid array with complete objects
    if (!projects || !Array.isArray(projects)) {
      console.warn('Projects not available in store, returning empty array');
      return [];
    }
    
    // Map over projects to ensure each has required properties
    return projects.map(project => {
      if (!project) return null;
      
      return {
        ...project,
        phases: Array.isArray(project.phases) ? project.phases : [],
        recurringSessions: Array.isArray(project.recurringSessions) ? project.recurringSessions : [],
        mvg: project.mvg || {
          description: 'Define your minimum viable goal',
          completed: false, 
          streak: 0,
          completionHistory: []
        }
      };
    }).filter(Boolean) as Project[]; // Remove any null values
  }
}));