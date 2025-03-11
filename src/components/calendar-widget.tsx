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
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  
  const { getProjectsForUser, updateProject } = useProjectStore();
  const projects = getProjectsForUser();

  // Detect mobile device on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => window.innerWidth <= 768;
      setIsMobileDevice(checkMobile());
      
      const handleResize = () => {
        setIsMobileDevice(checkMobile());
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  });

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
    
    // Collect all events matching this day's format (Mon, Tue, etc.)
    const projectSessions = projects.reduce((sessions, project) => {
      if (!project.recurringSessions || !Array.isArray(project.recurringSessions)) {
        return sessions;
      }
      
      const projectSessions = project.recurringSessions
        .filter(session => {
          if (!session || !Array.isArray(session.days)) {
            return false;
          }
          return session.days.includes(dayFormat);
        })
        .map(session => {
          // Check if this session is completed for this specific date
          const dateStr = format(day, 'yyyy-MM-dd');
          const completions = session.completions || [];
          const completion = completions.find(c => c?.date === dateStr);
          
          return {
            time: `${session.startTime} - ${session.endTime}`,
            title: session.title,
            category: project.title,
            color: project.color,
            completed: completion?.completed || false,
            projectId: project.id,
            session
          };
        });
      
      return [...sessions, ...projectSessions];
    }, [] as Array<CalendarEvent & { completed: boolean }>);
    
    console.log(`🗓️ Calendar: Found ${projectSessions.length} project sessions for ${dayFormat}`);
    
    return projectSessions;
  };

  // Regular desktop calendar view
  const DesktopCalendarView = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden h-full">
      <div className="p-6 border-b dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold dark:text-white">Calendar</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(prev => subDays(prev, 7))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 dark:text-gray-300" />
            </button>
            <button
              onClick={() => setCurrentDate(date)}
              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm dark:text-gray-300"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(prev => addDays(prev, 7))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-7 p-6 gap-4">
        {weekDays.map(day => {
          const formattedDate = format(day, 'd');
          const dayName = format(day, 'EEE');
          const isToday = isSameDay(day, new Date());
          const events = getEventsForDay(day);
          
          return (
            <div 
              key={day.toISOString()} 
              className={`relative ${isToday ? 'bg-primary/5 dark:bg-primary/10' : ''} rounded-lg p-2`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium dark:text-gray-300">{dayName}</span>
                <span 
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    isToday 
                      ? 'bg-primary text-white' 
                      : 'text-gray-700 dark:text-gray-400'
                  }`}
                >
                  {formattedDate}
                </span>
              </div>
              
              <div className="space-y-2">
                {events.slice(0, 2).map((event, idx) => (
                  <div 
                    key={`${day.toISOString()}-${idx}`}
                    className={`text-xs p-1.5 rounded ${event.color} text-white cursor-pointer`}
                    onClick={() => handleEventClick(event, day)}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium truncate">{event.title}</span>
                      {event.completed && <Check className="w-3 h-3" />}
                    </div>
                    <div className="text-white/80 truncate">{event.time}</div>
                  </div>
                ))}
                
                {events.length > 2 && (
                  <button 
                    className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1"
                    onClick={() => {
                      setIsExpanded(true);
                      setCurrentDate(day);
                    }}
                  >
                    <MoreHorizontal className="w-3 h-3 mr-1" /> 
                    {events.length - 2} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Mobile-friendly calendar view
  const MobileCalendarView = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden h-full">
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold dark:text-white">Today's Schedule</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(prev => subDays(prev, 1))}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 dark:text-gray-300" />
            </button>
            <button
              onClick={() => setCurrentDate(date)}
              className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-xs dark:text-gray-300"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(prev => addDays(prev, 1))}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4 dark:text-gray-300" />
            </button>
          </div>
        </div>
        <div className="text-center mt-2">
          <div className="text-sm font-medium dark:text-gray-300">
            {format(currentDate, 'EEEE, MMMM d')}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="space-y-3">
          {getEventsForDay(currentDate).length > 0 ? (
            getEventsForDay(currentDate).map((event, idx) => (
              <div 
                key={`mobile-event-${idx}`}
                className="flex items-center p-3 rounded-lg border dark:border-gray-700 cursor-pointer"
                onClick={() => handleEventClick(event, currentDate)}
              >
                <div className={`w-2 h-full rounded-full mr-3 ${event.color}`}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium dark:text-white">{event.title}</span>
                    {event.completed && <Check className="w-4 h-4 text-green-500" />}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{event.time}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{event.category}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No events scheduled for today
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isMobileDevice ? <MobileCalendarView /> : <DesktopCalendarView />}
      
      {selectedSession && (
        <SessionCompletionModal
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          session={selectedSession.session}
          project={projects.find(p => p.id === selectedSession.projectId)!}
          date={selectedSession.date}
          onComplete={handleSessionComplete}
        />
      )}
      
      <AnimatePresence>
        {isExpanded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsExpanded(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 20 }}
              className="relative w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl dark:bg-gray-800"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold dark:text-white">
                    {format(currentDate, 'EEEE, MMMM d')}
                  </h2>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 dark:text-gray-300" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-3">
                {getEventsForDay(currentDate).map((event, idx) => (
                  <div 
                    key={`expanded-event-${idx}`}
                    className={`p-3 rounded-lg ${event.color} text-white cursor-pointer`}
                    onClick={() => handleEventClick(event, currentDate)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{event.title}</span>
                      {event.completed && <Check className="w-4 h-4" />}
                    </div>
                    <div className="text-white/80">{event.time}</div>
                    <div className="text-white/60 text-sm">{event.category}</div>
                  </div>
                ))}
                
                {getEventsForDay(currentDate).length === 0 && (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No events scheduled for this day
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}