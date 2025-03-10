import { format } from 'date-fns';
import { CalendarWidget } from '@/components/calendar-widget';
import { HabitTracker } from '@/components/habits/habit-tracker';
import { useState } from 'react';
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
  const { getProjectsForUser, updateProject } = useProjectStore();
  const [activeView, setActiveView] = useState<DashboardView>('holistic');
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  
  const projects = getProjectsForUser();

  const calendarEvents = sessions.map(session => ({
    time: format(session.startTime, 'h:mm a'),
    title: session.title,
    category: projects.find(p => p.id === session.projectId)?.title || '',
    color: session.projectColor,
    projectId: session.projectId
  }));

  const handleSessionAdd = (sessionData: Omit<WorkSession, 'id'>) => {
    const newSession: WorkSession = {
      ...sessionData,
      id: crypto.randomUUID(),
    };
    setSessions([...sessions, newSession]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const projectId = active.id as string;
    const newStatus = over.id === 'completed';
    
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const completionHistory = project.mvg.completionHistory || [];
    const todayIndex = completionHistory.findIndex(h => h.date === today);

    let newHistory = [...completionHistory];
    if (todayIndex >= 0) {
      newHistory[todayIndex] = { date: today, completed: newStatus };
    } else {
      newHistory = [...newHistory, { date: today, completed: newStatus }];
    }

    // Calculate streak
    let streak = 0;
    if (newStatus) {
      for (const completion of newHistory.sort((a, b) => b.date.localeCompare(a.date))) {
        if (completion.completed) streak++;
        else break;
      }
    }

    updateProject({
      ...project,
      mvg: {
        ...project.mvg,
        completed: newStatus,
        completionHistory: newHistory,
        streak
      }
    });
  };

  return (
    <div className="pb-24">
      <AnimatePresence mode="wait">
        {activeView === 'holistic' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-12 gap-6 mobile-grid"
          >
            <div className="col-span-9 space-y-6">
              <MVGStreak projects={projects} />
              
              <KanbanProvider onDragEnd={handleDragEnd}>
                {mvgStatuses.map((status) => (
                  <KanbanBoard 
                    key={status.id} 
                    id={status.id}
                    className="bg-gray-50/50 border-gray-100 dark:bg-gray-800/50 dark:border-gray-700"
                  >
                    <KanbanHeader name={status.name} color={status.color} />
                    <KanbanCards>
                      {projects
                        .filter(project => 
                          status.id === 'completed' ? project.mvg.completed : !project.mvg.completed
                        )
                        .map((project, index) => (
                          <KanbanCard
                            key={project.id}
                            id={project.id}
                            name={project.title}
                            parent={status.id}
                            index={index}
                            className="p-0 border-0 shadow-none bg-transparent"
                          >
                            <ProjectCard
                              {...project}
                              onUpdate={updateProject}
                              sessions={sessions}
                              onSessionAdd={handleSessionAdd}
                              allProjects={projects}
                            />
                          </KanbanCard>
                        ))}
                    </KanbanCards>
                  </KanbanBoard>
                ))}
              </KanbanProvider>

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
      />
    </div>
  );
}