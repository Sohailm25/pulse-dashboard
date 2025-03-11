import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { useState, useEffect, ChangeEvent, useRef } from 'react';
import type { Project, Phase, RecurringSession } from '@/types/project';
import { PhaseCard } from '../project/phase-card';
import { RecurringSessionCard } from '../project/recurring-session';
import { ColorPicker } from '../ui/color-picker';
import { Textarea } from '../ui/textarea';
import type { WorkSession } from '../schedule/work-session';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, differenceInMinutes, parse, addDays } from 'date-fns';
import { ProjectChart } from '../analytics/project-chart';
import { SessionModal } from '../schedule/session-modal';

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
  const [project, setProject] = useState<Project>(initialProject);
  const [isDirty, setIsDirty] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [isMobile] = useState(window.innerWidth <= 768);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  
  console.log('ProjectModal rendering', { 
    projectId: project.id, 
    recurringSessions: project.recurringSessions?.length || 0 
  });
  
  // Add a counter for debugging re-renders
  const renderCount = useRef(0);
  renderCount.current++;
  console.log(`ProjectModal render count: ${renderCount.current}`);

  // Deep clone for debugging
  useEffect(() => {
    console.log('initialProject updated:', JSON.stringify(initialProject));
    setProject(JSON.parse(JSON.stringify(initialProject)));
  }, [initialProject]);
  
  // Track project changes
  useEffect(() => {
    console.log('project state updated:', JSON.stringify(project));
  }, [project]);

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
    if (onUpdate) {
      console.log('Calling onUpdate before closing with project:', JSON.stringify(project));
      
      // Ensure we're using the latest state by creating a deep clone
      const updatedProject = JSON.parse(JSON.stringify(project));
      
      // Validate recurringSessions before passing to parent
      if (!Array.isArray(updatedProject.recurringSessions)) {
        console.warn('recurringSessions is not an array, fixing before update');
        updatedProject.recurringSessions = [];
      }
      
      // Call onUpdate with the validated project
      onUpdate(updatedProject);
    }
    onClose();
  };

  const handleChange = (field: keyof Project, value: any) => {
    console.log(`handleChange called for ${field}:`, value);
    
    // For recurringSessions, ensure we're creating a proper deep clone
    if (field === 'recurringSessions') {
      // Log the current state for debugging
      console.log('Before update:', JSON.stringify(project.recurringSessions));
      console.log('New value:', JSON.stringify(value));
      
      // Create new state with the updated field
      setProject(prev => {
        const newState = { ...prev, [field]: JSON.parse(JSON.stringify(value)) };
        console.log('Updated state:', JSON.stringify(newState.recurringSessions));
        return newState;
      });
    } else {
      // Handle other fields normally
      setProject(prev => ({ ...prev, [field]: value }));
    }
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
    console.log('handleSessionUpdate called', { sessionId, updatedSession });
    
    // Validate the current state of recurringSessions
    if (!Array.isArray(project.recurringSessions)) {
      console.error('project.recurringSessions is not an array', project.recurringSessions);
      return;
    }
    
    // Find the session being updated
    const targetSession = project.recurringSessions.find(session => session.id === sessionId);
    if (!targetSession) {
      console.error('Target session not found', { 
        sessionId, 
        availableSessions: project.recurringSessions.map(s => s.id) 
      });
      return;
    }
    
    const updatedSessions = project.recurringSessions.map(session =>
      session.id === sessionId ? updatedSession : session
    );
    
    console.log('Updating recurringSessions', {
      before: project.recurringSessions.length,
      after: updatedSessions.length
    });
    
    handleChange('recurringSessions', updatedSessions);
  };

  const addRecurringSession = () => {
    console.log('addRecurringSession called');
    
    // Validate current recurringSessions
    const currentSessions = Array.isArray(project.recurringSessions) ? project.recurringSessions : [];
    console.log('Current recurringSessions:', currentSessions);
    
    const newSession: RecurringSession = {
      id: crypto.randomUUID(),
      title: 'New Session',
      days: [],
      startTime: '09:00',
      endTime: '10:00',
      completions: [] // Initialize completions as an empty array
    };
    
    console.log('New session created:', newSession);
    
    // Create a deep copy of the current sessions and add the new one
    const updatedSessions = JSON.parse(JSON.stringify([...currentSessions, newSession]));
    console.log('Updated sessions array:', updatedSessions);
    
    // Update the project state with the new sessions array
    handleChange('recurringSessions', updatedSessions);
  };

  const deleteRecurringSession = (sessionId: string) => {
    console.log('deleteRecurringSession called', { sessionId });
    
    // Validate current recurringSessions
    if (!Array.isArray(project.recurringSessions)) {
      console.error('project.recurringSessions is not an array', project.recurringSessions);
      return;
    }
    
    const filteredSessions = project.recurringSessions.filter(session => session.id !== sessionId);
    
    console.log('Filtering recurringSessions', {
      before: project.recurringSessions.length,
      after: filteredSessions.length,
      removed: project.recurringSessions.length - filteredSessions.length
    });
    
    handleChange(
      'recurringSessions',
      filteredSessions
    );
  };

  // Calculate metrics for chart
  const chartData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{
      label: 'Progress',
      data: [
        Math.max(10, Math.min(30, calculateProgress())),
        Math.max(20, Math.min(45, calculateProgress())),
        Math.max(40, Math.min(60, calculateProgress())),
        calculateProgress()
      ],
      borderColor: 'rgb(124, 58, 237)',
      backgroundColor: 'rgba(124, 58, 237, 0.1)',
      fill: true
    }]
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
                  {Array.isArray(project.recurringSessions) && project.recurringSessions.length > 0 ? (
                    project.recurringSessions.map(session => {
                      console.log('Rendering session:', session.id, session.title);
                      return (
                        <RecurringSessionCard
                          key={session.id}
                          session={session}
                          onUpdate={updatedSession => handleSessionUpdate(session.id, updatedSession)}
                          onDelete={deleteRecurringSession}
                        />
                      );
                    })
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400 text-center p-4">
                      No recurring sessions yet. Add one to get started.
                    </div>
                  )}
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
      
      <SessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        onSave={sessionData => {
          if (onSessionAdd) onSessionAdd(sessionData);
          setIsSessionModalOpen(false);
        }}
        projects={allProjects}
        initialProjectId={project.id}
      />
    </AnimatePresence>
  );
}