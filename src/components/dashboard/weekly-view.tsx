import { motion } from 'framer-motion';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { useProjectStore } from '@/stores/project-store';
import { useHabitStore } from '@/stores/habit-store';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Target, TrendingUp, Scale } from 'lucide-react';

export function WeeklyView() {
  const { projects } = useProjectStore();
  const { habits } = useHabitStore();
  const weekStart = startOfWeek(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Calculate project progress and deadlines
  const projectProgress = projects.map(project => {
    const dueThisWeek = weekDays.some(day => 
      project.endDate && isSameDay(day, project.endDate)
    );

    return {
      ...project,
      dueThisWeek
    };
  });

  // Calculate habit completion per day
  const habitCompletion = weekDays.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const completedHabits = habits.filter(habit => 
      habit.completionHistory.some(h => h.date === dateStr && h.completed)
    ).length;
    return (completedHabits / habits.length) * 100;
  });

  // Calculate balance score (0-100)
  const calculateBalanceScore = () => {
    const habitScore = Math.round(
      (habits.filter(h => h.completed).length / habits.length) * 100
    );
    const projectScore = Math.round(
      projects.reduce((acc, proj) => acc + proj.progress, 0) / projects.length
    );
    return Math.round((habitScore + projectScore) / 2);
  };

  const balanceScore = calculateBalanceScore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Weekly Overview Stats */}
      <div className="grid grid-cols-3 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Balance Score</h3>
            <Scale className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{balanceScore}</span>
              </div>
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="44"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="8"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="44"
                  fill="none"
                  stroke="rgb(var(--primary))"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - balanceScore / 100)}`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Weekly Balance</p>
              <p className="text-sm">
                {balanceScore >= 80 ? 'Excellent' :
                 balanceScore >= 60 ? 'Good' :
                 balanceScore >= 40 ? 'Fair' : 'Needs Attention'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Project Progress</h3>
            <Target className="w-5 h-5 text-blue-500" />
          </div>
          <div className="space-y-4">
            {projectProgress.map(project => (
              <div key={project.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{project.title}</span>
                  <span className="text-gray-500">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-1.5" />
                {project.dueThisWeek && (
                  <p className="text-xs text-amber-500">Due this week</p>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Habit Completion</h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="space-y-1">
            {weekDays.map((day, index) => (
              <div key={day.toISOString()} className="flex items-center gap-3">
                <span className="w-8 text-sm text-gray-500">
                  {format(day, 'EEE')}
                </span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${habitCompletion[index]}%` }}
                  />
                </div>
                <span className="w-12 text-sm text-gray-500">
                  {Math.round(habitCompletion[index])}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Weekly Calendar Grid */}
      <Card className="p-6">
        <h3 className="font-medium mb-4">Weekly Schedule</h3>
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayHabits = habits.filter(habit => 
              habit.completionHistory.some(h => h.date === dateStr)
            );
            const dayProjects = projects.filter(project =>
              project.recurringSessions.some(session =>
                session.days.includes(format(day, 'EEE'))
              )
            );

            return (
              <div
                key={day.toISOString()}
                className="min-h-[200px] p-4 rounded-lg bg-gray-50"
              >
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-500">{format(day, 'EEE')}</p>
                  <p className="text-lg font-medium">{format(day, 'd')}</p>
                </div>

                <div className="space-y-2">
                  {dayHabits.map(habit => (
                    <div
                      key={habit.id}
                      className={`p-2 rounded text-sm ${
                        habit.completed ? 'bg-green-100 text-green-700' : 'bg-white'
                      }`}
                    >
                      {habit.name}
                    </div>
                  ))}
                  {dayProjects.map(project => (
                    <div
                      key={project.id}
                      className={`p-2 rounded text-sm ${project.color} text-white`}
                    >
                      {project.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
}