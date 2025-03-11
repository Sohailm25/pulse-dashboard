import { motion } from 'framer-motion';
import { format, startOfQuarter, endOfQuarter, eachMonthOfInterval, isSameQuarter } from 'date-fns';
import { useProjectStore } from '@/stores/project-store';
import { useHabitStore } from '@/stores/habit-store';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, TrendingUp, ArrowUp, ArrowDown, Zap } from 'lucide-react';
import { ProjectChart } from '@/components/analytics/project-chart';

export function QuarterlyView() {
  const { projects } = useProjectStore();
  const { habits } = useHabitStore();
  const today = new Date();
  const quarterStart = startOfQuarter(today);
  const quarterEnd = endOfQuarter(today);
  const monthsInQuarter = eachMonthOfInterval({ start: quarterStart, end: quarterEnd });

  // Initialize with safe defaults when projects array is empty or undefined
  const safeProjects = projects?.length ? projects : [];
  const safeHabits = habits?.length ? habits : [];

  // Calculate quarterly project achievements with defensive coding
  const projectAchievements = safeProjects.map(project => {
    // Ensure phases is always an array
    const projectPhases = project.phases || [];
    
    const completedPhases = projectPhases.filter(phase => 
      phase?.subgoals?.every?.(subgoal => subgoal?.completed) || false
    ).length;

    return {
      ...project,
      completedPhases,
      totalPhases: projectPhases.length,
      completionRate: projectPhases.length ? (completedPhases / projectPhases.length) * 100 : 0
    };
  }).sort((a, b) => b.completionRate - a.completionRate);

  // Calculate habit streaks and consistency
  const habitAnalytics = safeHabits.map(habit => {
    // Ensure completionHistory is always an array
    const completionHistory = habit.completionHistory || [];
    
    const quarterlyCompletions = completionHistory.filter(h => 
      h?.date && isSameQuarter(new Date(h.date), today) && h.completed
    ).length;

    const consistency = (quarterlyCompletions / 90) * 100; // Approximate days in quarter

    return {
      ...habit,
      quarterlyCompletions,
      consistency,
      streak: habit.streak || 0
    };
  }).sort((a, b) => b.consistency - a.consistency);

  // Generate quarterly progress chart data
  const quarterlyProgressData = {
    labels: monthsInQuarter.map(month => format(month, 'MMM')),
    datasets: projects.map(project => {
      const monthlyProgress = monthsInQuarter.map(() => project.progress);
      
      return {
        label: project.title,
        data: monthlyProgress,
        borderColor: `rgb(${getComputedStyle(document.documentElement)
          .getPropertyValue(project.color.replace('bg-', '--'))
          .trim()})`,
        backgroundColor: `rgba(${getComputedStyle(document.documentElement)
          .getPropertyValue(project.color.replace('bg-', '--'))
          .trim()}, 0.1)`,
        fill: true,
        tension: 0.4,
        borderWidth: 2
      };
    })
  };

  // Calculate focus areas and recommendations
  const focusAreas = [
    {
      title: 'Habit Consistency',
      score: Math.round(habitAnalytics.reduce((acc, h) => acc + h.consistency, 0) / habits.length),
      recommendation: 'Focus on maintaining daily habits',
      trend: 'up',
      icon: <Zap className="w-5 h-5 text-yellow-500" />
    },
    {
      title: 'Project Completion',
      score: Math.round(projectAchievements.reduce((acc, p) => acc + p.completionRate, 0) / projects.length),
      recommendation: 'Prioritize completing current project phases',
      trend: 'down',
      icon: <Target className="w-5 h-5 text-blue-500" />
    },
    {
      title: 'Overall Progress',
      score: Math.round((habitAnalytics[0]?.consistency || 0 + (projectAchievements[0]?.completionRate || 0)) / 2),
      recommendation: 'Maintain balance between habits and projects',
      trend: 'up',
      icon: <TrendingUp className="w-5 h-5 text-green-500" />
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Achievement Summary */}
      <div className="grid grid-cols-3 gap-6">
        {focusAreas.map(area => (
          <Card key={area.title} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">{area.title}</h3>
              {area.icon}
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{area.score}%</span>
                <span className={`flex items-center gap-1 text-sm ${
                  area.trend === 'up' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {area.trend === 'up' ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                  vs Last Quarter
                </span>
              </div>
              <Progress value={area.score} className="h-2" />
              <p className="text-sm text-gray-600">{area.recommendation}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Project Milestones */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Quarterly Project Progress</h3>
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
        <div className="space-y-6">
          <div className="h-[300px]">
            <ProjectChart data={quarterlyProgressData} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            {projectAchievements.map(project => (
              <div key={project.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${project.color}`} />
                    <span className="font-medium">{project.title}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {project.completedPhases} of {project.totalPhases} phases
                  </span>
                </div>
                <Progress value={project.completionRate} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Habit Analysis */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Quarterly Habit Performance</h3>
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-6">
          {habitAnalytics.map(habit => (
            <div key={habit.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{habit.name}</h4>
                  <p className="text-sm text-gray-500">{habit.identity}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500">🔥</span>
                    <span className="font-medium">{habit.streak} days</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {habit.quarterlyCompletions} completions
                  </p>
                </div>
              </div>
              <Progress value={habit.consistency} className="h-1.5" />
            </div>
          ))}
        </div>
      </Card>

      {/* Focus Areas */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-6">Next Quarter Focus Areas</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-600">Strengths</h4>
            <ul className="space-y-2">
              {habitAnalytics.slice(0, 3).map(habit => (
                <li key={habit.id} className="flex items-center gap-2 text-green-600">
                  <ArrowUp className="w-4 h-4" />
                  <span>{habit.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-gray-600">Areas for Improvement</h4>
            <ul className="space-y-2">
              {habitAnalytics.slice(-3).reverse().map(habit => (
                <li key={habit.id} className="flex items-center gap-2 text-amber-600">
                  <ArrowDown className="w-4 h-4" />
                  <span>{habit.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}