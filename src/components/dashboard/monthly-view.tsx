import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { useProjectStore } from '@/stores/project-store';
import { useHabitStore } from '@/stores/habit-store';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target, Brain, Heart, Dumbbell } from 'lucide-react';
import { ProjectChart } from '@/components/analytics/project-chart';

export function MonthlyView() {
  const { projects } = useProjectStore();
  const { habits } = useHabitStore();
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Ensure projects and habits arrays exist
  const safeProjects = projects?.length ? projects : [];
  const safeHabits = habits?.length ? habits : [];

  // Calculate habit completion rates for the month
  const habitStats = {
    Spiritual: {
      total: safeHabits.filter(h => h?.category === 'Spiritual').length * daysInMonth.length,
      completed: safeHabits.filter(h => h?.category === 'Spiritual').reduce((acc, habit) => 
        acc + (habit?.completionHistory || []).filter(h => 
          h?.date && isSameMonth(new Date(h.date), today) && h.completed
        ).length, 0
      ),
      icon: <Heart className="w-5 h-5 text-red-500" />
    },
    Physical: {
      total: safeHabits.filter(h => h?.category === 'Physical').length * daysInMonth.length,
      completed: safeHabits.filter(h => h?.category === 'Physical').reduce((acc, habit) => 
        acc + (habit?.completionHistory || []).filter(h => 
          h?.date && isSameMonth(new Date(h.date), today) && h.completed
        ).length, 0
      ),
      icon: <Dumbbell className="w-5 h-5 text-blue-500" />
    },
    Mental: {
      total: safeHabits.filter(h => h?.category === 'Mental').length * daysInMonth.length,
      completed: safeHabits.filter(h => h?.category === 'Mental').reduce((acc, habit) => 
        acc + (habit?.completionHistory || []).filter(h => 
          h?.date && isSameMonth(new Date(h.date), today) && h.completed
        ).length, 0
      ),
      icon: <Brain className="w-5 h-5 text-purple-500" />
    }
  };

  // Generate data for habit completion chart
  const habitCompletionData = {
    labels: daysInMonth.map(day => format(day, 'd')),
    datasets: Object.entries(habitStats).map(([category, _]) => {
      const categoryHabits = safeHabits.filter(h => h?.category === category);
      const dailyCompletions = daysInMonth.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        
        // Safely calculate completed habits for this day
        const completed = categoryHabits.reduce((acc, habit) => {
          // Ensure the habit has a completionHistory array
          const habitCompletions = habit?.completionHistory || [];
          // Check if any completion matches this day and is completed
          const isCompletedToday = habitCompletions.some(h => h?.date === dateStr && h.completed);
          return acc + (isCompletedToday ? 1 : 0);
        }, 0);
        
        // Avoid division by zero
        const categoryHabitCount = Math.max(categoryHabits.length, 1);
        return (completed / categoryHabitCount) * 100;
      });

      return {
        label: category,
        data: dailyCompletions,
        borderColor: category === 'Spiritual' ? 'rgb(239, 68, 68)' :
                    category === 'Physical' ? 'rgb(59, 130, 246)' :
                    'rgb(168, 85, 247)',
        backgroundColor: category === 'Spiritual' ? 'rgba(239, 68, 68, 0.1)' :
                        category === 'Physical' ? 'rgba(59, 130, 246, 0.1)' :
                        'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2
      };
    })
  };

  // Generate data for project milestone chart
  const projectMilestoneData = {
    labels: daysInMonth.map(day => format(day, 'd')),
    datasets: safeProjects.map(project => {
      const progressPoints = daysInMonth.map(() => project?.progress || 0);
      
      // Default color if project.color is undefined or can't be processed
      let borderColor = 'rgb(107, 114, 128)'; // Default gray
      let backgroundColor = 'rgba(107, 114, 128, 0.1)';
      
      try {
        if (project?.color) {
          const colorVar = getComputedStyle(document.documentElement)
            .getPropertyValue(project.color.replace('bg-', '--'))
            .trim();
            
          if (colorVar) {
            borderColor = `rgb(${colorVar})`;
            backgroundColor = `rgba(${colorVar}, 0.1)`;
          }
        }
      } catch (err) {
        console.warn('Error processing color for project:', project?.title, err);
      }
      
      return {
        label: project?.title || 'Unnamed Project',
        data: progressPoints,
        borderColor,
        backgroundColor,
        fill: true,
        tension: 0.4,
        borderWidth: 2
      };
    })
  };

  // Generate energy heatmap data
  const energyHeatmap = daysInMonth.map(day => ({
    date: day,
    energy: Math.random() * 100 // This would be replaced with actual energy data
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Monthly Overview */}
      <div className="grid grid-cols-3 gap-6">
        {Object.entries(habitStats).map(([category, stats]) => (
          <Card key={category} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">{category} Habits</h3>
              {stats.icon}
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Monthly Completion</span>
                <span>{Math.round((stats.completed / stats.total) * 100)}%</span>
              </div>
              <Progress 
                value={Math.round((stats.completed / stats.total) * 100)} 
                className="h-2"
              />
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{stats.completed} completed</span>
                <span>of {stats.total} total</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Habit Analytics */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Habit Completion Trends</h3>
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div className="h-[300px]">
          <ProjectChart data={habitCompletionData} />
        </div>
      </Card>

      {/* Project Timeline */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Project Milestones</h3>
          <Target className="w-5 h-5 text-blue-500" />
        </div>
        <div className="h-[300px]">
          <ProjectChart data={projectMilestoneData} />
        </div>
      </Card>

      {/* Energy Patterns */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-6">Energy Patterns</h3>
        <div className="grid grid-cols-7 gap-2">
          {energyHeatmap.map(({ date, energy }) => (
            <div
              key={date.toISOString()}
              className={`aspect-square rounded-lg p-2 ${
                isToday(date) ? 'ring-2 ring-primary' : ''
              }`}
              style={{
                backgroundColor: `rgba(var(--primary), ${energy / 100})`
              }}
            >
              <div className="text-center">
                <span className="text-xs font-medium">
                  {format(date, 'd')}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="text-sm text-gray-500">Energy Level:</div>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded bg-primary/20" />
            <div className="w-4 h-4 rounded bg-primary/40" />
            <div className="w-4 h-4 rounded bg-primary/60" />
            <div className="w-4 h-4 rounded bg-primary/80" />
            <div className="w-4 h-4 rounded bg-primary" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}