import { format } from 'date-fns';
import { CalendarWidget } from '@/components/calendar-widget';
import { HabitTracker } from '@/components/habits/habit-tracker';
import { useState, useEffect } from 'react';
import type { WorkSession } from '@/components/schedule/work-session';
import { useProjectStore } from '@/stores/project-store';
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from '@/components/ui/kanban';
import type { DragEndEvent } from '@dnd-kit/core';
import { ProjectCard } from '@/components/project-card';
import { ViewNavigation, type DashboardView } from '@/components/dashboard/view-navigation';
import { DailyView } from '@/components/dashboard/daily-view';
import { WeeklyView } from '@/components/dashboard/weekly-view';
import { MonthlyView } from '@/components/dashboard/monthly-view';
import { QuarterlyView } from '@/components/dashboard/quarterly-view';
import { AnimatePresence, motion } from 'framer-motion';
import { MVGStreak } from '@/components/mvg-streak';

const mvgStatuses = [
  { id: "pending", name: "MVG Pending", color: "#6B7280" },
  { id: "completed", name: "MVG Complete", color: "#10B981" },
];

export function DashboardPage() {
  const today = new Date();
  const { projects, updateProject } = useProjectStore();
  const [activeView, setActiveView] = useState<DashboardView>('holistic');
  const [isAnyProjectModalOpen, setIsAnyProjectModalOpen] = useState(false);

  const sortedProjects = [...(projects || [])].sort((a, b) => a.progress - b.progress);

  const calendarEvents = projects.flatMap(project => {
    return project.recurringSessions.flatMap(session => {
      return session.days.map(day => ({
        id: `${project.id}-${session.id}-${day}`,
        title: `${project.title}: ${session.title}`,
        day,
        startTime: session.startTime,
        endTime: session.endTime,
        color: project.color
      }));
    });
  });
  
  useEffect(() => {
    const handleProjectModalStateChange = (event: CustomEvent<{isOpen: boolean}>) => {
      setIsAnyProjectModalOpen(event.detail.isOpen);
    };
    
    window.addEventListener('projectModalStateChange', handleProjectModalStateChange as EventListener);
    
    return () => {
      window.removeEventListener('projectModalStateChange', handleProjectModalStateChange as EventListener);
    };
  }, []);

  return (
    <div className="space-y-6 relative pb-16">
      <AnimatePresence mode="wait">
        {activeView === 'holistic' && (
          <motion.div
            key="holistic"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <MVGStreak projects={projects} />
            
            <div>
              <h2 className="text-xl font-semibold mb-6 dark:text-white">Projects</h2>
              
              <KanbanProvider>
                <KanbanBoard
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    
                    if (over && active.id !== over.id) {
                      const activeId = active.id.toString();
                      const overId = over.id.toString();
                      
                      const activeProject = projects.find(p => p.id === activeId);
                      const overStatus = mvgStatuses.find(s => s.id === overId);
                      
                      if (activeProject && overStatus) {
                        const updatedProject = {
                          ...activeProject,
                          mvg: {
                            ...activeProject.mvg,
                            completed: overStatus.id === 'completed'
                          }
                        };
                        
                        updateProject(updatedProject);
                      }
                    }
                  }}
                >
                  <div className="grid grid-cols-2 gap-6">
                    {mvgStatuses.map((status) => (
                      <div key={status.id} className="flex flex-col space-y-4">
                        <KanbanHeader
                          id={status.id}
                          className="text-lg font-medium dark:text-white"
                        >
                          {status.name}
                        </KanbanHeader>
                        
                        <KanbanCards id={status.id}>
                          {sortedProjects
                            .filter(p => (status.id === 'completed' ? p.mvg?.completed : !p.mvg?.completed))
                            .map(project => (
                              <KanbanCard id={project.id} key={project.id}>
                                <ProjectCard 
                                  {...project} 
                                  onUpdate={updateProject}
                                  allProjects={projects}
                                  onProjectModalOpen={(isOpen) => {
                                    window.dispatchEvent(
                                      new CustomEvent('projectModalStateChange', { 
                                        detail: { isOpen } 
                                      })
                                    );
                                  }}
                                />
                              </KanbanCard>
                            ))}
                        </KanbanCards>
                      </div>
                    ))}
                  </div>
                </KanbanBoard>
              </KanbanProvider>
            </div>
            
            <div className="grid grid-cols-4 gap-6 mobile-grid">
              <div className="col-span-3 mobile-full">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold dark:text-white">Identity Habit Tracker</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {format(today, 'EEEE, MMMM d')}
                    </span>
                  </div>
                  <HabitTracker />
                </div>
              </div>

              <div className="col-span-3 mobile-hidden">
                <CalendarWidget date={today} events={calendarEvents} />
              </div>
            </div>
          </motion.div>
        )}
        {activeView === 'daily' && <DailyView />}
        {activeView === 'weekly' && <WeeklyView />}
        {activeView === 'monthly' && <MonthlyView />}
        {activeView === 'quarterly' && <QuarterlyView />}
      </AnimatePresence>

      <ViewNavigation
        activeView={activeView}
        onViewChange={setActiveView}
        hidden={isAnyProjectModalOpen}
      />
    </div>
  );
}