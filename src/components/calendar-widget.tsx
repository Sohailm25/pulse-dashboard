import { ChevronLeft, ChevronRight, MoreHorizontal, X, Check } from 'lucide-react';
import { useState } from 'react';
import { format, addDays, subDays, startOfWeek, addWeeks, isSameDay, parse } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '@/stores/project-store';
import { SessionCompletionModal } from './session-completion-modal';
import type { RecurringSession } from '@/types/project';

interface CalendarEvent {
  time: string;
  title: string;
  category: string;
  color: string;
  projectId?: string;
  session?: RecurringSession;
}

interface CalendarWidgetProps {
  date: Date;
  events: CalendarEvent[];
}

export function CalendarWidget({ date, events }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(date);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSession, setSelectedSession] = useState<{
    session: RecurringSession;
    projectId: string;
    date: Date;
  } | null>(null);
  
  const { getProjectsForUser, updateProject } = useProjectStore();
  const projects = getProjectsForUser();

  const handleEventClick = (event: CalendarEvent, date: Date) => {
    if (event.projectId && event.session) {
      setSelectedSession({
        session: event.session,
        projectId: event.projectId,
        date
      });
    }
  };

  const handleSessionComplete = (completed: boolean, notes?: string) => {
    if (!selectedSession) return;

    const project = projects.find(p => p.id === selectedSession.projectId);
    if (!project) return;

    const updatedSessions = project.recurringSessions.map(s => {
      if (s.id === selectedSession.session.id) {
        const dateStr = format(selectedSession.date, 'yyyy-MM-dd');
        const completions = s.completions || [];
        const existingIndex = completions.findIndex(c => c.date === dateStr);

        if (existingIndex >= 0) {
          completions[existingIndex] = { date: dateStr, completed, notes };
        } else {
          completions.push({ date: dateStr, completed, notes });
        }

        return { ...s, completions };
      }
      return s;
    });

    updateProject({
      ...project,
      recurringSessions: updatedSessions
    });

    setSelectedSession(null);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => 
    addDays(startOfWeek(currentDate), i)
  );

  const nextWeek = weekDays.map(day => addWeeks(day, 1));
  const allDays = [...weekDays, ...nextWeek];

  const getEventsForDay = (day: Date) => {
    const dayFormat = format(day, 'EEE');
    const dateStr = format(day, 'yyyy-MM-dd');
    
    console.log(`🗓️ Calendar: Getting events for ${dateStr} (${dayFormat})`);
    
    const regularEvents = events.filter(event => 
      format(date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    );
    
    console.log(`🗓️ Calendar: Found ${regularEvents.length} regular events`);

    // Log project recurring sessions data
    console.log(`🗓️ Calendar: Processing ${projects.length} projects for recurring sessions`);
    projects.forEach(project => {
      if (!project.recurringSessions || !Array.isArray(project.recurringSessions)) {
        console.warn(`🗓️ Calendar: Project ${project.id} (${project.title}) has no valid recurringSessions array`);
      } else {
        console.log(`🗓️ Calendar: Project ${project.id} (${project.title}) has ${project.recurringSessions.length} recurring sessions`);
        // Log each session's day to debug day matching
        project.recurringSessions.forEach(session => {
          console.log(`🗓️ Calendar: Session "${session.title}" has days: ${JSON.stringify(session.days)}`);
        });
      }
    });

    const recurringEvents = projects.flatMap(project => {
      if (!project.recurringSessions || !Array.isArray(project.recurringSessions)) {
        console.warn(`🗓️ Calendar: Skipping project ${project.id} due to invalid recurringSessions`);
        return [];
      }
      
      try {
        return project.recurringSessions
          .filter(session => {
            // Make sure days is an array
            if (!Array.isArray(session.days)) {
              console.warn(`🗓️ Calendar: Session "${session.title}" has invalid days array, fixing...`);
              session.days = [];
              return false;
            }
            
            const hasDay = session.days.includes(dayFormat);
            if (hasDay) {
              console.log(`🗓️ Calendar: Found matching session "${session.title}" for day ${dayFormat} in project ${project.title}`);
            }
            return hasDay;
          })
          .map(session => {
            // Make sure we have valid times
            if (!session.startTime) {
              console.warn(`🗓️ Calendar: Session "${session.title}" missing startTime, setting default`);
              session.startTime = '09:00';
            }
            if (!session.endTime) {
              console.warn(`🗓️ Calendar: Session "${session.title}" missing endTime, setting default`);
              session.endTime = '10:00';
            }
            
            return {
              time: session.startTime,
              title: session.title || 'Untitled Session',
              category: project.title,
              color: project.color,
              projectId: project.id,
              session
            };
          });
      } catch (error) {
        console.error(`🗓️ Calendar: Error processing recurring sessions for project ${project.title}:`, error);
        return [];
      }
    });
    
    console.log(`🗓️ Calendar: Found ${recurringEvents.length} recurring events for ${dateStr}`);

    const allEvents = [...regularEvents, ...recurringEvents].sort((a, b) => {
      try {
        const timeA = parse(a.time, 'HH:mm', new Date());
        const timeB = parse(b.time, 'HH:mm', new Date());
        return timeA.getTime() - timeB.getTime();
      } catch (error) {
        console.error(`🗓️ Calendar: Error sorting events:`, error);
        return 0;
      }
    });
    
    console.log(`🗓️ Calendar: Returning ${allEvents.length} total events for ${dateStr}`);
    return allEvents;
  };

  const todaysEvents = getEventsForDay(currentDate);

  const renderEvent = (event: CalendarEvent, day: Date) => {
    const isCompleted = event.session?.completions?.find(
      c => c.date === format(day, 'yyyy-MM-dd')
    )?.completed;

    return (
      <motion.div
        layout
        className={`flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer group`}
        onClick={(e) => {
          e.stopPropagation();
          handleEventClick(event, day);
        }}
      >
        <div className={`w-1 h-12 rounded ${event.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {event.time}
            </span>
            <div className={`w-2 h-2 rounded-full ${event.color}`} />
            {isCompleted && (
              <div className={`${event.color} rounded-full p-0.5`}>
                <Check className="w-3 h-3" />
              </div>
            )}
          </div>
          <p className="text-sm font-medium truncate dark:text-white">{event.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{event.category}</p>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          layout
          initial={false}
          onClick={() => !isExpanded && setIsExpanded(true)}
          className={`${
            isExpanded 
              ? 'fixed inset-4 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden'
              : 'bg-white dark:bg-gray-800 rounded-xl'
          } p-6 cursor-pointer transition-all duration-300`}
        >
          <motion.div layout className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentDate(d => subDays(d, isExpanded ? 7 : 1));
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-medium dark:text-white">
                {format(currentDate, 'MMMM d')}
              </h2>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentDate(d => addDays(d, isExpanded ? 7 : 1));
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {isExpanded ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            ) : (
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            )}
          </motion.div>

          <motion.div layout>
            {isExpanded ? (
              <div className="grid grid-cols-7 gap-4">
                {allDays.map((day, index) => (
                  <motion.div
                    key={format(day, 'yyyy-MM-dd')}
                    layout
                    className={`min-h-[200px] p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      isSameDay(day, currentDate) ? 'bg-gray-50 dark:bg-gray-700' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentDate(day);
                    }}
                  >
                    <div className="text-center mb-2">
                      {index < 7 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {format(day, 'EEE')}
                        </p>
                      )}
                      <p className="text-lg font-medium dark:text-white">{format(day, 'd')}</p>
                    </div>
                    <div className="space-y-2">
                      {getEventsForDay(day).map((event, i) => (
                        <div key={`${event.title}-${event.time}-${i}`}>
                          {renderEvent(event, day)}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {todaysEvents.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">No events today</p>
                ) : (
                  todaysEvents.map((event, i) => (
                    <div key={`${event.title}-${event.time}-${i}`}>
                      {renderEvent(event, currentDate)}
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {selectedSession && (
        <SessionCompletionModal
          isOpen={true}
          onClose={() => setSelectedSession(null)}
          session={selectedSession.session}
          project={projects.find(p => p.id === selectedSession.projectId)!}
          date={selectedSession.date}
          onComplete={handleSessionComplete}
        />
      )}
    </>
  );
}