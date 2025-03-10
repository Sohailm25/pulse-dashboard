import { motion } from 'framer-motion';
import { format, subDays, isToday } from 'date-fns';
import type { Project } from '@/types/project';

interface MVGStreakProps {
  projects: Project[];
}

export function MVGStreak({ projects }: MVGStreakProps) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => format(subDays(today, i), 'yyyy-MM-dd')).reverse();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-4 mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">MVG Streaks</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="w-2 h-2 rounded-full bg-gray-100" /> Not completed
          <span className="w-2 h-2 rounded-full bg-amber-100 border border-amber-300" /> At risk
        </div>
      </div>
      <div className="space-y-3">
        {projects.map(project => {
          const todayStr = format(today, 'yyyy-MM-dd');
          const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');
          
          const hasCompletedToday = project.mvg.completionHistory?.find(
            h => h.date === todayStr
          )?.completed;

          const hasCompletedYesterday = project.mvg.completionHistory?.find(
            h => h.date === yesterdayStr
          )?.completed;

          const isAtRisk = !hasCompletedToday && hasCompletedYesterday && project.mvg.streak > 0;

          return (
            <div key={project.id} className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-48">
                <div className={`w-2 h-2 rounded-full ${project.color}`} />
                <h3 className="font-medium truncate">{project.title}</h3>
                {project.mvg.streak > 0 && (
                  <div className="flex items-center gap-1 text-orange-500">
                    <span className="text-xs">🔥</span>
                    <span className="text-sm font-medium">{project.mvg.streak}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-1 flex-1">
                {days.map(date => {
                  const completion = project.mvg.completionHistory?.find(h => h.date === date);
                  const isTodays = todayStr === date;
                  
                  return (
                    <div
                      key={date}
                      className={`h-6 flex-1 rounded flex items-center justify-center text-xs ${
                        isTodays && !completion?.completed && isAtRisk
                          ? 'bg-amber-100 border border-amber-300'
                          : completion?.completed
                          ? `${project.color} text-white`
                          : 'bg-gray-100'
                      }`}
                      title={format(new Date(date), 'MMM d, yyyy')}
                    >
                      {completion?.completed ? '✓' : '·'}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}