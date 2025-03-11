import { ProjectChart } from '@/components/analytics/project-chart';
import { StatsCard } from '@/components/stats-card';
import { Clock, Target, TrendingUp, Brain, Heart, Dumbbell } from 'lucide-react';
import { useProjectStore } from '@/stores/project-store';
import { useHabitStore } from '@/stores/habit-store';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, differenceInMinutes, parse, addDays } from 'date-fns';
import { useState, useEffect, useRef } from 'react';

console.log('AnalyticsPage component loaded');

// Define the completion interface for type safety
interface Completion {
  date: string;
  completed: boolean;
  notes?: string;
}

export function AnalyticsPage() {
  console.log('AnalyticsPage rendering');
  
  // Add render counter for debugging
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`AnalyticsPage render count: ${renderCount.current}`);
  
  const { getProjectsForUser } = useProjectStore();
  const { getHabitsForUser } = useHabitStore();
  
  const projects = getProjectsForUser();
  const habits = getHabitsForUser();
  const [colorVars, setColorVars] = useState<Record<string, string>>({});
  const [projectData, setProjectData] = useState<any>({ labels: [], datasets: [] });

  console.log('Projects:', JSON.stringify(projects));
  console.log('Habits:', JSON.stringify(habits));

  // Extract color values from CSS variables safely in useEffect
  useEffect(() => {
    console.log('Starting colorVars useEffect');
    if (typeof document === 'undefined') {
      console.log('Document is undefined, skipping colorVars calculation');
      return;
    }
    
    const vars: Record<string, string> = {};
    try {
      console.log(`Processing ${projects.length} projects for colors`);
      projects.forEach(project => {
        if (!project.color) {
          console.log(`Project ${project.id} has no color defined`);
          return;
        }
        
        const colorParts = project.color.split('-');
        if (colorParts.length >= 2) {
          const colorType = colorParts[1]; // e.g., "purple" from "bg-purple-600"
          console.log(`Getting color var for ${colorType}-600`);
          const colorVar = getComputedStyle(document.documentElement)
            .getPropertyValue(`--${colorType}-600`)
            .trim();
          vars[project.color] = colorVar;
          console.log(`Set color var for ${project.color}: ${colorVar}`);
        } else {
          console.log(`Invalid color format: ${project.color}`);
        }
      });
      console.log('Final colorVars:', vars);
      setColorVars(vars);
    } catch (error) {
      console.error('Error accessing CSS variables:', error);
    }
    console.log('Completed colorVars useEffect');
  }, [projects]);

  // Calculate daily (non-cumulative) time spent per project
  const calculateTimeSpent = () => {
    console.log('calculateTimeSpent called');
    try {
      const today = new Date();
      const weekStart = startOfWeek(today);
      const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      console.log('Week days:', weekDays.map(d => format(d, 'yyyy-MM-dd')));

      return projects.map(project => {
        console.log(`Processing project: ${project.title}`);
        // Calculate daily hours (non-cumulative)
        const dailyData = weekDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          let dailyMinutes = 0;

          if (!project.recurringSessions || !Array.isArray(project.recurringSessions)) {
            console.log(`Project ${project.title} has no valid recurringSessions`);
            return 0;
          }

          project.recurringSessions.forEach(session => {
            if (!session.completions || !Array.isArray(session.completions)) {
              console.log(`Session ${session.title} has no valid completions`);
              return;
            }
            
            const completion = session.completions.find((c: Completion) => c.date === dateStr);
            if (completion?.completed) {
              try {
                const startTime = parse(session.startTime, 'HH:mm', day);
                const endTime = parse(session.endTime, 'HH:mm', day);
                dailyMinutes += differenceInMinutes(endTime, startTime);
                console.log(`Added ${differenceInMinutes(endTime, startTime)} minutes for ${session.title} on ${dateStr}`);
              } catch (error) {
                console.error(`Error parsing time for session ${session.title}:`, error);
              }
            }
          });

          return Math.round((dailyMinutes / 60) * 100) / 100; // Convert to hours and round to 2 decimals
        });

        console.log(`Daily data for ${project.title}:`, dailyData);

        // Calculate cumulative hours
        const cumulativeData = dailyData.reduce((acc: number[], hours: number) => {
          const lastValue = acc.length > 0 ? acc[acc.length - 1] : 0;
          acc.push(lastValue + hours);
          return acc;
        }, []);

        console.log(`Cumulative data for ${project.title}:`, cumulativeData);

        const colorVar = colorVars[project.color] || '0, 0, 0'; // Default to black if color not found
        console.log(`Using color ${colorVar} for project ${project.title}`);

        return {
          label: project.title,
          data: cumulativeData,
          borderColor: `rgb(${colorVar})`,
          backgroundColor: `rgba(${colorVar}, 0.1)`,
          fill: true,
          tension: 0.4,
          borderWidth: 2
        };
      });
    } catch (error) {
      console.error('Error calculating time spent:', error);
      return [];
    }
  };

  // Calculate project data in useEffect to avoid doing it during render
  useEffect(() => {
    console.log('Starting projectData useEffect');
    console.log('colorVars keys:', Object.keys(colorVars));
    
    if (Object.keys(colorVars).length === 0) {
      console.log('No colorVars available yet, skipping projectData calculation');
      return;
    }
    
    try {
      console.log('Calculating project data');
      const data = {
        labels: Array.from({ length: 7 }, (_, i) => 
          format(addDays(startOfWeek(new Date()), i), 'EEE')
        ),
        datasets: calculateTimeSpent()
      };
      console.log('Setting projectData:', JSON.stringify(data));
      setProjectData(data);
    } catch (error) {
      console.error('Error setting project data:', error);
    }
    console.log('Completed projectData useEffect');
  }, [colorVars, projects]);

  // Calculate total hours this week from completed sessions
  const calculateTotalHours = () => {
    console.log('calculateTotalHours called');
    try {
      let totalMinutes = 0;
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

      projects.forEach(project => {
        if (!project.recurringSessions || !Array.isArray(project.recurringSessions)) {
          console.log(`Project ${project.title} has no valid recurringSessions`);
          return;
        }
        
        project.recurringSessions.forEach(session => {
          days.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            
            if (!session.completions || !Array.isArray(session.completions)) {
              console.log(`Session ${session.title} has no valid completions`);
              return;
            }
            
            const completion = session.completions.find((c: Completion) => c.date === dateStr);
            if (completion?.completed) {
              try {
                const startTime = parse(session.startTime, 'HH:mm', day);
                const endTime = parse(session.endTime, 'HH:mm', day);
                totalMinutes += differenceInMinutes(endTime, startTime);
              } catch (error) {
                console.error(`Error parsing time for session ${session.title}:`, error);
              }
            }
          });
        });
      });

      const result = Math.round(totalMinutes / 60);
      console.log(`Total hours calculated: ${result}`);
      return result;
    } catch (error) {
      console.error('Error calculating total hours:', error);
      return 0;
    }
  };

  const totalHoursThisWeek = calculateTotalHours();
  console.log(`Total hours this week: ${totalHoursThisWeek}`);
  
  const completedSessions = projects.reduce((total, project) => {
    if (!project.recurringSessions || !Array.isArray(project.recurringSessions)) {
      return total;
    }
    
    return total + project.recurringSessions.reduce((sessionTotal, session) => {
      if (!session.completions || !Array.isArray(session.completions)) {
        return sessionTotal;
      }
      
      return sessionTotal + (session.completions.filter((c: Completion) => c.completed)?.length || 0);
    }, 0);
  }, 0);
  console.log(`Completed sessions: ${completedSessions}`);

  const totalSessions = projects.reduce((total, project) => {
    if (!project.recurringSessions || !Array.isArray(project.recurringSessions)) {
      return total;
    }
    
    return total + project.recurringSessions.length * 7;
  }, 0);
  console.log(`Total sessions: ${totalSessions}`);

  // Calculate habit completion rates by category
  const habitStats = {
    Spiritual: {
      total: habits.filter(h => h.category === 'Spiritual').length,
      completed: habits.filter(h => h.category === 'Spiritual' && h.completed).length,
      icon: <Heart className="w-5 h-5 text-red-500" />
    },
    Physical: {
      total: habits.filter(h => h.category === 'Physical').length,
      completed: habits.filter(h => h.category === 'Physical' && h.completed).length,
      icon: <Dumbbell className="w-5 h-5 text-blue-500" />
    },
    Intellectual: {
      total: habits.filter(h => h.category === 'Intellectual').length,
      completed: habits.filter(h => h.category === 'Intellectual' && h.completed).length,
      icon: <Brain className="w-5 h-5 text-purple-500" />
    }
  };
  console.log('Habit stats:', habitStats);

  // Define the habit completion interface for type safety
  interface HabitCompletion {
    date: string;
    completed: boolean;
  }

  // Calculate habit streaks data
  const habitStreakData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: Object.entries(habitStats).map(([category, _]) => {
      const categoryHabits = habits.filter(h => h.category === category);
      const dailyCompletions = Array(7).fill(0);
      
      categoryHabits.forEach(habit => {
        if (!habit.completionHistory || !Array.isArray(habit.completionHistory)) {
          console.log(`Habit ${habit.name} has no valid completionHistory`);
          return;
        }
        
        habit.completionHistory.forEach((completion: HabitCompletion) => {
          try {
            const dayIndex = new Date(completion.date).getDay();
            if (completion.completed) {
              dailyCompletions[dayIndex]++;
            }
          } catch (error) {
            console.error(`Error processing habit completion for ${habit.name}:`, error);
          }
        });
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
  console.log('Habit streak data:', JSON.stringify(habitStreakData));

  console.log('AnalyticsPage rendering complete, returning JSX');
  return (
    <div className="space-y-6">
      {/* Project Stats */}
      <div className="grid grid-cols-3 gap-6">
        <StatsCard
          value={`${totalHoursThisWeek}h`}
          label="Hours This Week"
          icon={<Clock className="w-5 h-5 text-purple-500" />}
        />
        <StatsCard
          value={completedSessions}
          label="Sessions Completed"
          icon={<Target className="w-5 h-5 text-orange-500" />}
        />
        <StatsCard
          value={`${Math.round((completedSessions / totalSessions) * 100)}%`}
          label="Completion Rate"
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
        />
      </div>

      {/* Project Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-6 dark:text-white">Cumulative Hours per Project</h2>
        <ProjectChart data={projectData} />
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-3 gap-6">
        {projects.map(project => {
          const projectStats = projectData.datasets.find((d: any) => d.label === project.title);
          const totalHours = projectStats?.data[projectStats.data.length - 1] || 0;
          const colorVar = colorVars[project.color] || '0, 0, 0';
          
          return (
            <div
              key={project.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-6"
            >
              <h3 className="font-medium mb-4 dark:text-white">{project.title}</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="dark:text-gray-300">Total hours</span>
                  <span className="dark:text-gray-300">{totalHours}h</span>
                </div>
                <div
                  className="h-2 rounded-full"
                  style={{
                    background: `rgba(${colorVar}, 0.1)`
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(totalHours / (totalHoursThisWeek || 1)) * 100}%`,
                      backgroundColor: `rgb(${colorVar})`
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Habit Stats */}
      <div className="grid grid-cols-3 gap-6">
        {Object.entries(habitStats).map(([category, stats]) => (
          <div key={category} className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium dark:text-white">{category} Habits</h3>
              {stats.icon}
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="dark:text-gray-300">Completion Rate</span>
                <span className="dark:text-gray-300">
                  {Math.round((stats.completed / (stats.total || 1)) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-primary"
                  style={{
                    width: `${(stats.completed / (stats.total || 1)) * 100}%`
                  }}
                />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {stats.completed} of {stats.total} habits completed today
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Habit Streaks Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-6 dark:text-white">Weekly Habit Completion</h2>
        <ProjectChart data={habitStreakData} />
      </div>
    </div>
  );
}

export default AnalyticsPage;