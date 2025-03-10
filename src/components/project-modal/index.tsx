import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Project, Phase, RecurringSession } from '@/types/project';
import { PhaseCard } from '../project/phase-card';
import { RecurringSessionCard } from '../project/recurring-session';
import { ColorPicker } from '../ui/color-picker';
import { Textarea } from '../ui/textarea';
import type { WorkSession } from '../schedule/work-session';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, differenceInMinutes, parse } from 'date-fns';

interface ProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (project: Project) => void;
  sessions?: WorkSession[];
  onSessionAdd?: (session: Omit<WorkSession, 'id'>) => void;
  allProjects: Project[];
}

export function ProjectModal({
  project: initialProject,
  isOpen,
  onClose,
  onUpdate,
  sessions = [],
  onSessionAdd,
  allProjects,
}: ProjectModalProps) {
  const [project, setProject] = useState(initialProject);
  const [isDirty, setIsDirty] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [isMobile] = useState(window.innerWidth <= 768);

  // Calculate total hours this week
  const calculateTotalHours = () => {
    let totalMinutes = 0;
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    project.recurringSessions.forEach(session => {
      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const completion = session.completions?.find(c => c.date === dateStr);
        if (completion?.completed) {
          const startTime = parse(session.startTime, 'HH:mm', day);
          const endTime = parse(session.endTime, 'HH:mm', day);
          totalMinutes += differenceInMinutes(endTime, startTime);
        }
      });
    });

    return Math.round(totalMinutes / 60);
  };

  // Reset project state when modal is opened with new project
  useEffect(() => {
    if (isOpen) {
      setProject(initialProject);
      setIsDirty(false);
      setShowSavedMessage(false);
    }
  }, [initialProject, isOpen]);

  // Handle updates with debounce
  useEffect(() => {
    if (!isDirty || !onUpdate) return;

    const timeoutId = setTimeout(() => {
      onUpdate(project);
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 2000);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [project, isDirty, onUpdate]);

  // Handle escape key and save on close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isDirty, project, onUpdate]);

  const handleClose = () => {
    if (isDirty && onUpdate) {
      onUpdate(project);
      setShowSavedMessage(true);
    }
    onClose();
  };

  const handleChange = (field: keyof Project, value: any) => {
    setProject(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const calculateProgress = () => {
    if (!project.phases?.length) return 0;
    const completedPhases = project.phases.filter(phase => 
      phase.subgoals.every(subgoal => subgoal.completed)
    ).length;
    return Math.round((completedPhases / project.phases.length) * 100);
  };

  const handlePhaseUpdate = (phaseId: string, updatedPhase: Phase) => {
    const updatedPhases = project.phases.map(phase =>
      phase.id === phaseId ? updatedPhase : phase
    );
    handleChange('phases', updatedPhases);
    handleChange('progress', calculateProgress());
  };

  const addPhase = () => {
    const newPhase: Phase = {
      id: crypto.randomUUID(),
      title: 'New Phase',
      completed: false,
      subgoals: [],
      targetDate: new Date()
    };
    handleChange('phases', [...(project.phases || []), newPhase]);
  };

  const handleSessionUpdate = (sessionId: string, updatedSession: RecurringSession) => {
    const updatedSessions = project.recurringSessions.map(session =>
      session.id === sessionId ? updatedSession : session
    );
    handleChange('recurringSessions', updatedSessions);
  };

  const addRecurringSession = () => {
    const newSession: RecurringSession = {
      id: crypto.randomUUID(),
      title: 'New Session',
      days: [],
      startTime: '09:00',
      endTime: '10:00',
    };
    handleChange('recurringSessions', [...(project.recurringSessions || []), newSession]);
  };

  const deleteRecurringSession = (sessionId: string) => {
    handleChange(
      'recurringSessions',
      project.recurringSessions.filter(session => session.id !== sessionId)
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20 }}
            className={`relative ${isMobile ? 'w-full h-full' : 'w-[80vw] max-h-[90vh]'} bg-white dark:bg-gray-800 overflow-y-auto ${isMobile ? '' : 'rounded-xl shadow-xl'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <input
                    type="text"
                    value={project.title}
                    onChange={e => handleChange('title', e.target.value)}
                    className="text-2xl font-bold bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 -ml-2 dark:text-white w-full sm:w-auto"
                  />
                  <div className="flex-shrink-0">
                    <ColorPicker
                      value={project.color}
                      onChange={color => handleChange('color', color)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span className="text-sm">Hours this week:</span>
                    <span className="font-semibold">{calculateTotalHours()}h</span>
                  </div>
                  {showSavedMessage && (
                    <motion.span
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-sm text-green-600 dark:text-green-400"
                    >
                      Changes saved
                    </motion.span>
                  )}
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-medium dark:text-white">Project Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <Textarea
                      value={project.description || ''}
                      onChange={e => handleChange('description', e.target.value)}
                      placeholder="Add project description..."
                      rows={1}
                      className="resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Next Action
                    </label>
                    <Textarea
                      value={project.nextAction || ''}
                      onChange={e => handleChange('nextAction', e.target.value)}
                      placeholder="What's the next concrete action to move this project forward?"
                      rows={1}
                      className="resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Viable Goal (MVG)
                    </label>
                    <Textarea
                      value={project.mvg.description}
                      onChange={e => handleChange('mvg', { ...project.mvg, description: e.target.value })}
                      placeholder="Define the minimum viable goal for this project..."
                      rows={1}
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={project.startDate?.toISOString().split('T')[0]}
                    onChange={e => handleChange('startDate', new Date(e.target.value))}
                    className="w-full p-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                  <input
                    type="date"
                    value={project.endDate?.toISOString().split('T')[0]}
                    onChange={e => handleChange('endDate', new Date(e.target.value))}
                    className="w-full p-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium dark:text-white">Project Phases</h3>
                  <button
                    onClick={addPhase}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                    Add Phase
                  </button>
                </div>
                <div className="space-y-4">
                  {project.phases?.map(phase => (
                    <PhaseCard
                      key={phase.id}
                      phase={phase}
                      onUpdate={updatedPhase => handlePhaseUpdate(phase.id, updatedPhase)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium dark:text-white">Recurring Work Sessions</h3>
                  <button
                    onClick={addRecurringSession}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                    Add Session
                  </button>
                </div>
                <div className="space-y-4">
                  {project.recurringSessions?.map(session => (
                    <RecurringSessionCard
                      key={session.id}
                      session={session}
                      onUpdate={updatedSession => handleSessionUpdate(session.id, updatedSession)}
                      onDelete={deleteRecurringSession}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium dark:text-white">Progress</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium dark:text-white">{project.progress}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}