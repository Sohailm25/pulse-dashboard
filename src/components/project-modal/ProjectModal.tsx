import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, ChangeEvent, useRef } from 'react';
import type { Project, Phase, RecurringSession } from '@/types/project';
import { PhaseCard } from '../project/phase-card';
import { RecurringSessionCard } from '../project/recurring-session';
import { ColorPicker } from '../ui/color-picker';
import { Textarea } from '../ui/textarea';
import type { WorkSession } from '../schedule/work-session';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, differenceInMinutes, parse, addDays } from 'date-fns';
import { SessionModal } from '../schedule/session-modal';
import { Toast, useToast } from '../ui/toast';

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
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { showToast, hideToast, toastProps } = useToast();
  // Add a state to track the last saved project
  const [lastSavedProject, setLastSavedProject] = useState<string>('');
  // Add state to track expanded phases for accordion UI
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});
  
  // Dialog ref for detecting outside clicks
  const dialogRef = useRef<HTMLDivElement>(null);
  
  // Add more detailed logging
  console.log('ProjectModal rendering', { 
    projectId: project.id, 
    title: project.title,
    recurringSessions: project.recurringSessions?.length || 0,
    recurringsessionData: JSON.stringify(project.recurringSessions),
    nextAction: project.nextAction
  });
  
  // Add a counter for debugging re-renders
  const renderCount = useRef(0);
  renderCount.current++;
  console.log(`ProjectModal render count: ${renderCount.current}`);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save the current scroll position
      const scrollY = window.scrollY;
      // Add styles to body to prevent scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflowY = 'hidden';
    } else {
      // Restore scrolling when modal closes
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflowY = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }
    return () => {
      // Cleanup in case component unmounts while modal is open
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflowY = '';
    };
  }, [isOpen]);

  // Deep clone for debugging
  useEffect(() => {
    console.log('initialProject updated:', JSON.stringify(initialProject));
    console.log('Initial recurring sessions:', initialProject.recurringSessions?.length || 0, 
                JSON.stringify(initialProject.recurringSessions));
    
    const clonedProject = JSON.parse(JSON.stringify(initialProject));
    
    // Ensure recurringSessions is always an array
    if (!Array.isArray(clonedProject.recurringSessions)) {
      clonedProject.recurringSessions = [];
    }
    
    setProject(clonedProject);
    setHasChanges(false); // Reset changes flag when initial project updates
    
    // Store the serialized version for comparison
    setLastSavedProject(JSON.stringify(clonedProject));
  }, [initialProject]);
  
  // Track project changes
  useEffect(() => {
    console.log('project state updated:', JSON.stringify(project));
    console.log('Current recurring sessions:', project.recurringSessions?.length || 0, 
                JSON.stringify(project.recurringSessions));
    
    // Check if we have actual changes by comparing with last saved state
    const currentSerialized = JSON.stringify(project);
    const hasActualChanges = currentSerialized !== lastSavedProject;
    
    console.log(`Project changed: ${hasActualChanges}`);
    
    // Only track changes after initial render and if actual changes exist
    if (renderCount.current > 1 && hasActualChanges) {
      setHasChanges(true);
    }
  }, [project, lastSavedProject]);

  // Auto-save when project changes after a delay
  useEffect(() => {
    if (!hasChanges) return;
    
    console.log('Setting up auto-save timer...');
    const saveTimer = setTimeout(() => {
      console.log('Auto-save timer triggered!');
      saveProject();
    }, 2000); // Auto-save after 2 seconds of inactivity
    
    return () => {
      console.log('Clearing auto-save timer');
      clearTimeout(saveTimer);
    };
  }, [hasChanges, project]);

  // Calculate total hours this week from completed sessions
  const calculateTotalHours = () => {
    let totalMinutes = 0;
    const weekStart = startOfWeek(new Date());
    const days = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'));

    try {
      project.recurringSessions.forEach(session => {
        days.forEach(dateStr => {
          const day = new Date(dateStr).getDay(); // 0 = Sunday, 1 = Monday, ...
          const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];
          
          // Check if this session is scheduled for this day
          if (session.days.includes(dayName)) {
            const completion = session.completions?.find(c => c.date === dateStr);
            if (completion?.completed) {
              // Parse times like "09:00" => hours and minutes
              const [startHour, startMinute] = session.startTime.split(':').map(Number);
              const [endHour, endMinute] = session.endTime.split(':').map(Number);
              
              // Calculate duration in minutes
              const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
              totalMinutes += durationMinutes;
            }
          }
        });
      });
    } catch (error) {
      console.error('Error calculating hours:', error);
    }
    
    return Math.round(totalMinutes / 60);
  };

  const dialogRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    
    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node) && isOpen) {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // New method to validate and save the project
  const saveProject = () => {
    if (!onUpdate) {
      console.error('Cannot save project: onUpdate function is not provided');
      return;
    }
    
    console.log('SAVING PROJECT WITH UPDATES:', JSON.stringify(project));
    console.log('Saving recurring sessions:', project.recurringSessions?.length || 0,
                JSON.stringify(project.recurringSessions));
    console.log('Saving nextAction:', project.nextAction);
    
    // Ensure we're using the latest state by creating a deep clone
    const updatedProject = JSON.parse(JSON.stringify(project));
    
    // Validate recurringSessions before passing to parent
    if (!Array.isArray(updatedProject.recurringSessions)) {
      console.warn('recurringSessions is not an array, fixing before update');
      updatedProject.recurringSessions = [];
    }
    
    // Validate each recurring session
    updatedProject.recurringSessions = updatedProject.recurringSessions.map(session => {
      if (!session.completions || !Array.isArray(session.completions)) {
        console.log('Fixing missing completions array for session:', session.id);
        session.completions = [];
      }
      if (!Array.isArray(session.days)) {
        console.log('Fixing missing days array for session:', session.id);
        session.days = [];
      }
      // Ensure all required fields exist
      if (!session.title) session.title = 'Untitled Session';
      if (!session.startTime) session.startTime = '09:00';
      if (!session.endTime) session.endTime = '10:00';
      
      return session;
    });
    
    // Call onUpdate with the validated project
    console.log('Calling onUpdate with:', JSON.stringify(updatedProject));
    onUpdate(updatedProject);
    setHasChanges(false);
    
    // Update lastSavedProject to reflect the saved state
    setLastSavedProject(JSON.stringify(updatedProject));
    
    // Show success toast
    showToast('Project details saved successfully', 'success');
  };

  const handleClose = () => {
    console.log('Modal closing, has changes:', hasChanges);
    
    if (hasChanges) {
      console.log('Saving changes before closing');
      saveProject();
    } else {
      console.log('No changes to save on close');
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
    if (!project.phases || project.phases.length === 0) return 0;
    
    const completedCount = project.phases.filter(phase => phase.completed).length;
    return Math.round((completedCount / project.phases.length) * 100);
  };

  const handlePhaseUpdate = (phaseId: string, updatedPhase: Phase) => {
    const updatedPhases = project.phases.map(phase =>
      phase.id === phaseId ? updatedPhase : phase
    );
    handleChange('phases', updatedPhases);
  };

  const addPhase = () => {
    const newPhase: Phase = {
      id: crypto.randomUUID(),
      title: 'New Phase',
      description: '',
      completed: false,
      subgoals: []
    };
    handleChange('phases', [...(project.phases || []), newPhase]);
  };

  const handleSessionUpdate = (sessionId: string, updatedSession: RecurringSession) => {
    console.log('handleSessionUpdate called', { sessionId, updatedSession });
    
    // Validate current recurringSessions
    if (!Array.isArray(project.recurringSessions)) {
      console.error('project.recurringSessions is not an array', project.recurringSessions);
      return;
    }
    
    const updatedSessions = project.recurringSessions.map(session =>
      session.id === sessionId ? updatedSession : session
    );
    
    console.log('Updated sessions array:', updatedSessions);
    
    handleChange('recurringSessions', updatedSessions);
  };

  // Toggle phase expansion for accordion UI
  const togglePhaseExpansion = (phaseId: string) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseId]: !prev[phaseId]
    }));
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

  // Function to dump the current state to console for debugging
  const dumpStateToConsole = () => {
    console.log('🔍 DEBUG - Current Project State:');
    console.log(JSON.stringify(project, null, 2));
    console.log('🔍 DEBUG - RecurringSessions Count:', project.recurringSessions?.length || 0);
    if (Array.isArray(project.recurringSessions)) {
      project.recurringSessions.forEach((session, i) => {
        console.log(`🔍 Session #${i+1}: ${session.title}`);
        console.log('  Days:', session.days);
        console.log('  Times:', session.startTime, '-', session.endTime);
        console.log('  Completions:', session.completions?.length || 0);
      });
    }
    showToast('Project state dumped to console', 'info');
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={handleClose} />
      
      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white dark:bg-gray-800 w-[900px] max-w-[95vw] max-h-[90vh] rounded-xl shadow-xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b dark:border-gray-700">
          <input
            type="text"
            value={project.title}
            onChange={e => handleChange('title', e.target.value)}
            className="text-lg sm:text-xl font-semibold bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 -ml-2 dark:text-white w-full"
          />
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={saveProject}
              className="px-2 sm:px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Save
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 dark:text-gray-300" />
            </button>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 overflow-y-auto h-full overscroll-contain">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left column for basic details */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={project.description || ''}
                  onChange={e => handleChange('description', e.target.value)}
                  className="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={project.startDate ? format(new Date(project.startDate), 'yyyy-MM-dd') : ''}
                    onChange={e => handleChange('startDate', e.target.value ? new Date(e.target.value) : null)}
                    className="w-full p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={project.endDate ? format(new Date(project.endDate), 'yyyy-MM-dd') : ''}
                    onChange={e => handleChange('endDate', e.target.value ? new Date(e.target.value) : null)}
                    className="w-full p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Next Action
                </label>
                <input
                  type="text"
                  value={project.nextAction || ''}
                  onChange={e => handleChange('nextAction', e.target.value)}
                  placeholder="What's the next concrete step?"
                  className="w-full p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'bg-purple-600',
                    'bg-blue-600',
                    'bg-green-600',
                    'bg-yellow-600',
                    'bg-red-600',
                    'bg-pink-600',
                    'bg-indigo-600'
                  ].map(color => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded-full ${color} ${
                        project.color === color ? 'ring-2 ring-offset-2 ring-gray-800' : ''
                      }`}
                      onClick={() => handleChange('color', color)}
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium dark:text-white">Minimum Viable Goal</h3>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 relative">
                  <textarea
                    value={project.mvg?.description || ''}
                    onChange={e => handleChange('mvg', { ...project.mvg, description: e.target.value })}
                    className="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                    rows={2}
                    placeholder="What's the minimum outcome that would make this project worthwhile?"
                  />
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      id="mvg-completed"
                      checked={project.mvg?.completed || false}
                      onChange={e => handleChange('mvg', { ...project.mvg, completed: e.target.checked })}
                      className="rounded text-primary focus:ring-primary/20 mr-2"
                    />
                    <label htmlFor="mvg-completed" className="text-sm text-gray-700 dark:text-gray-300">
                      Completed
                    </label>
                    <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                      Streak: {project.mvg?.streak || 0} days
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right column for phases */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium dark:text-white">Phases</h3>
                  <button
                    onClick={addPhase}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                    Add Phase
                  </button>
                </div>
                <div className="space-y-2">
                  {project.phases.map(phase => (
                    <div 
                      key={phase.id} 
                      className="bg-white dark:bg-gray-700 rounded-lg border dark:border-gray-600 overflow-hidden"
                    >
                      <div 
                        className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600"
                        onClick={() => togglePhaseExpansion(phase.id)}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={phase.completed}
                            onChange={(e) => {
                              e.stopPropagation();
                              handlePhaseUpdate(phase.id, { ...phase, completed: e.target.checked });
                            }}
                            className="rounded text-primary focus:ring-primary/20"
                          />
                          <h4 className="font-medium dark:text-white">{phase.title}</h4>
                        </div>
                        {expandedPhases[phase.id] ? (
                          <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                      
                      {expandedPhases[phase.id] && (
                        <div className="p-3 border-t dark:border-gray-600">
                          <PhaseCard
                            phase={phase}
                            onUpdate={updatedPhase => handlePhaseUpdate(phase.id, updatedPhase)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom section for recurring sessions */}
          <div className="mt-8 space-y-4">
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
            <div className="flex flex-wrap justify-center gap-4">
              {Array.isArray(project.recurringSessions) && project.recurringSessions.length > 0 ? (
                project.recurringSessions.map(session => {
                  console.log('Rendering session:', session.id, session.title);
                  return (
                    <div key={session.id} className="w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]">
                      <RecurringSessionCard
                        session={session}
                        onUpdate={updatedSession => handleSessionUpdate(session.id, updatedSession)}
                        onDelete={deleteRecurringSession}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="text-gray-500 dark:text-gray-400 text-center p-4 w-full">
                  No recurring sessions yet. Add one to get started.
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Toast {...toastProps} />
      </motion.div>
      
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
    </div>
  );
} 