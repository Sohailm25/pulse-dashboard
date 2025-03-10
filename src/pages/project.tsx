import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { ProjectChart } from '@/components/analytics/project-chart';
import { WeeklySchedule } from '@/components/schedule/weekly-schedule';
import type { WorkSession } from '@/components/schedule/work-session';
import { useProjectStore } from '@/stores/project-store';

export function ProjectPage() {
  const { id } = useParams();
  const { projects } = useProjectStore();
  const currentProject = projects.find(p => p.id === id);

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
    setSessions(newSessions);
  };

  const handleSessionClick = (session: WorkSession) => {
    console.log('Session clicked:', session);
  };

  if (!currentProject) {
    return <div className="p-6">Project not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-6">Project Progress</h2>
        <ProjectChart data={projectData} />
      </div>

      <WeeklySchedule
        project={currentProject}
        sessions={sessions}
        onSessionsChange={handleSessionsChange}
        onSessionClick={handleSessionClick}
      />
    </div>
  );
}