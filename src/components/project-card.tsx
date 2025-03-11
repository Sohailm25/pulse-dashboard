import { Check, Clock } from 'lucide-react';
import { Progress } from './ui/progress';
import { useState } from 'react';
import { ProjectModal } from './project-modal';
import { MVGModal } from './project/mvg-modal';
import type { Project } from '@/types/project';
import type { WorkSession } from './schedule/work-session';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, differenceInMinutes, parse } from 'date-fns';
import { motion } from 'framer-motion';

interface ProjectCardProps extends Project {
  onUpdate?: (project: Project) => void;
  sessions?: WorkSession[];
  onSessionAdd?: (session: Omit<WorkSession, 'id'>) => void;
  allProjects: Project[];
}

export function ProjectCard({
  id,
  title,
  progress,
  color,
  phases,
  recurringSessions,
  mvg,
  nextAction,
  ...props
}: ProjectCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMVGModalOpen, setIsMVGModalOpen] = useState(false);

  const calculateTotalHours = () => {
    let totalMinutes = 0;
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    if (!recurringSessions || !Array.isArray(recurringSessions)) {
      return 0;
    }

    recurringSessions.forEach(session => {
      if (!session) return;
      
      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const completions = session.completions || [];
        const completion = completions.find(c => c?.date === dateStr);
        
        if (completion?.completed) {
          try {
            const startTime = parse(session.startTime, 'HH:mm', day);
            const endTime = parse(session.endTime, 'HH:mm', day);
            totalMinutes += differenceInMinutes(endTime, startTime);
          } catch (err) {
            console.warn('Error calculating time difference:', err);
          }
        }
      });
    });

    return Math.round(totalMinutes / 60);
  };

  const handleMVGComplete = (completed: boolean) => {
    if (props.onUpdate) {
      const safeMvg = mvg || {
        description: 'Define your minimum viable goal',
        completed: false,
        streak: 0,
        completionHistory: []
      };
      
      props.onUpdate({
        ...props,
        id,
        title,
        progress,
        color,
        phases: phases || [],
        recurringSessions: recurringSessions || [],
        mvg: { ...safeMvg, completed },
        nextAction,
      });
    }
    setIsMVGModalOpen(false);
  };
  
  // Handle project updates from the modal
  const handleProjectUpdate = (updatedProject: Project) => {
    console.log('ProjectCard received update:', updatedProject);
    
    // Ensure recurringSessions is properly formatted before passing to parent
    if (!Array.isArray(updatedProject.recurringSessions)) {
      updatedProject.recurringSessions = [];
    }
    
    // Deep clone to avoid reference issues
    const safeProject = JSON.parse(JSON.stringify(updatedProject));
    
    if (props.onUpdate) {
      props.onUpdate(safeProject);
    }
  };

  const totalHours = calculateTotalHours();

  // Ensure recurringSessions is properly formatted before passing to ProjectModal
  const safeRecurringSessions = Array.isArray(recurringSessions) ? recurringSessions : [];

  return (
    <>
      <motion.div 
        className={`relative rounded-lg p-4 ${color} text-white cursor-pointer`}
        onClick={() => setIsModalOpen(true)}
        initial="initial"
        whileHover="hover"
        variants={{
          initial: {
            transform: "none"
          },
          hover: {
            transform: "translateY(-2px)",
            transition: {
              duration: 0.3,
              ease: [0.23, 1, 0.32, 1]
            }
          }
        }}
      >
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          variants={{
            initial: {
              opacity: 0,
              background: "radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)"
            },
            hover: {
              opacity: 1,
              background: "radial-gradient(circle at center, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
              transition: {
                duration: 0.3
              }
            }
          }}
        />
        
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMVGModalOpen(true);
            }}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            title="Toggle MVG Status"
          >
            <div className={`w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${mvg?.completed ? 'bg-white' : ''}`}>
              {mvg?.completed && <Check className="w-3 h-3 text-primary" />}
            </div>
          </button>
        </div>

        <div className="mb-4 pr-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className="flex items-center gap-1 text-white/80">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{totalHours}h</span>
            </div>
          </div>
          {nextAction && (
            <div className="bg-white/10 rounded-lg p-2 text-sm">
              <div className="text-white/60 mb-1 text-xs">Next Action</div>
              <p className="text-white line-clamp-2">{nextAction}</p>
            </div>
          )}
        </div>

        <div className="mt-auto">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="bg-white/20" />
        </div>
      </motion.div>

      <ProjectModal
        project={{ 
          id, 
          title, 
          progress, 
          color,
          phases: phases || [],
          recurringSessions: safeRecurringSessions,
          mvg,
          nextAction,
          ...props 
        }}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={handleProjectUpdate}
        sessions={props.sessions}
        onSessionAdd={props.onSessionAdd}
        allProjects={props.allProjects}
      />

      <MVGModal
        isOpen={isMVGModalOpen}
        onClose={() => setIsMVGModalOpen(false)}
        mvg={mvg}
        onComplete={handleMVGComplete}
        projectTitle={title}
      />
    </>
  );
}