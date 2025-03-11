import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ProjectChart } from '@/components/analytics/project-chart';
import { WeeklySchedule } from '@/components/schedule/weekly-schedule';
import type { WorkSession } from '@/components/schedule/work-session';
import { useProjectStore } from '@/stores/project-store';
import { ProjectModal } from '@/components/project-modal/index';

export function ProjectPage() {
  const { id } = useParams();
  const { getProjectsForUser, updateProject } = useProjectStore();
  const projects = getProjectsForUser();
  const currentProject = projects.find(p => p.id === id);
  
  console.log('ProjectPage rendering', { 
    projectId: id, 
    currentProject: currentProject ? {
      id: currentProject.id,
      title: currentProject.title,
      recurringSessions: currentProject.recurringSessions?.length || 0
    } : null
  });

  // Add a counter for debugging re-renders
  const renderCount = useRef(0);
  renderCount.current++;
  console.log(`ProjectPage render count: ${renderCount.current}`);

  // Keep local state of the project to ensure UI updates immediately
  const [localProject, setLocalProject] = useState(currentProject);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  
  // Update local project state when the store project changes
  useEffect(() => {
    if (currentProject) {
      console.log('Updating localProject from currentProject');
      setLocalProject(currentProject);
    }
  }, [currentProject]);
  
  // When the project is updated, ensure the component refreshes
  useEffect(() => {
    console.log('Current project updated:', currentProject ? JSON.stringify(currentProject) : 'null');
  }, [currentProject]);
  
  // Track when the modal is opened/closed
  useEffect(() => {
    console.log('Project modal is now:', isProjectModalOpen ? 'open' : 'closed');
  }, [isProjectModalOpen]);

  const [sessions, setSessions] = useState<WorkSession[]>([
    {
      id: '1',
      title: 'Design Review',
      startTime: new Date(2024, 2, 19, 10, 0),
      endTime: new Date(2024, 2, 19, 11, 30),
      projectId: '1',
      projectColor: 'bg-purple-600'
    },
    {
      id: '2',
      title: 'Frontend Development',
      startTime: new Date(2024, 2, 19, 14, 0),
      endTime: new Date(2024, 2, 19, 17, 0),
      projectId: '1',
      projectColor: 'bg-purple-600'
    }
  ]);

  const projectData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{
      label: 'Progress',
      data: [30, 45, 60, 75],
      borderColor: 'rgb(124, 58, 237)',
      backgroundColor: 'rgba(124, 58, 237, 0.1)',
      fill: true
    }]
  };

  const handleSessionsChange = (newSessions: WorkSession[]) => {
    console.log('handleSessionsChange called with', newSessions);
    setSessions(newSessions);
  };

  const handleSessionClick = (session: WorkSession) => {
    console.log('Session clicked:', session);
  };
  
  const handleProjectUpdate = (updatedProject: any) => {
    console.log('handleProjectUpdate called with:', JSON.stringify(updatedProject));
    
    // Log changes specifically to recurringSessions
    console.log('recurringSessions before:', currentProject?.recurringSessions?.length || 0);
    console.log('recurringSessions after:', updatedProject.recurringSessions?.length || 0);
    
    // Update local state immediately for a responsive UI
    setLocalProject(updatedProject);
    
    // Then update the store and persist to backend
    updateProject(updatedProject);
  };

  if (!localProject) {
    return <div className="p-6">Project not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{localProject.title}</h1>
        <button
          onClick={() => setIsProjectModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          Edit Project
        </button>
      </div>
      
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-6">Project Progress</h2>
        <ProjectChart data={projectData} />
      </div>

      <WeeklySchedule
        project={localProject}
        sessions={sessions}
        onSessionsChange={handleSessionsChange}
        onSessionClick={handleSessionClick}
      />
      
      {isProjectModalOpen && (
        <ProjectModal
          project={localProject}
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          onUpdate={handleProjectUpdate}
          sessions={sessions}
          allProjects={projects}
        />
      )}
    </div>
  );
}