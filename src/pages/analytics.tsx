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
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Add a ref to track if colorVars has been populated - prevents infinite loops
  const colorVarsPopulated = useRef(false);

  console.log('Projects:', projects.length);
  console.log('Habits:', habits.length);

  // Extract color values from CSS variables safely in useEffect
  useEffect(() => {
    console.log('Starting colorVars useEffect');
    if (typeof document === 'undefined') {
      console.log('Document is undefined, skipping colorVars calculation');
      return;
    }
    
    // Skip if we've already populated colorVars and they match the project count
    // This prevents infinite re-renders
    if (colorVarsPopulated.current && Object.keys(colorVars).length >= projects.length) {
      console.log('ColorVars already populated, skipping');
      return;
    }
    
    const vars: Record<string, string> = {};
    try {
      console.log(`Processing ${projects.length} projects for colors`);
      
      // If no projects, set an empty object and return
      if (!projects.length) {
        setColorVars({});
        colorVarsPopulated.current = true;
        return;
      }
      
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
          vars[project.color] = colorVar || '0, 0, 0'; // Default to black if not found
          console.log(`Set color var for ${project.color}: ${colorVar}`);
        } else {
          console.log(`Invalid color format: ${project.color}`);
        }
      });
      
      console.log('Setting colorVars:', Object.keys(vars));
      setColorVars(vars);
      colorVarsPopulated.current = true;
    } catch (error) {
      console.error('Error accessing CSS variables:', error);
      setHasError(true);
    }
    console.log('Completed colorVars useEffect');
  }, [projects]); // Only depend on projects

  // Calculate daily (non-cumulative) time spent per project
  const calculateTimeSpent = () => {
    console.log('calculateTimeSpent called');
    try {
      const today = new Date();
      const weekStart = startOfWeek(today);
      const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      console.log('Week days:', weekDays.map(d => format(d, 'yyyy-MM-dd')));

      // If no projects or no colorVars, return empty array
      if (!projects.length || !Object.keys(colorVars).length) {
        console.log('No projects or colorVars, returning empty dataset');
        return [];
      }

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

        // Use defined color for project or fallback
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
    
    // Skip if colorVars is empty
    if (!colorVarsPopulated.current || Object.keys(colorVars).length === 0) {
      console.log('No colorVars available yet, skipping projectData calculation');
      return;
    }
    
    try {
      console.log('Calculating project data');
      setIsLoading(true);
      
      const datasets = calculateTimeSpent();
      
      const data = {
        labels: Array.from({ length: 7 }, (_, i) => 
          format(addDays(startOfWeek(new Date()), i), 'EEE')
        ),
        datasets
      };
      
      console.log('Setting projectData with datasets:', data.datasets.length);
      setProjectData(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error setting project data:', error);
      setHasError(true);
      setIsLoading(false);
    }
    console.log('Completed projectData useEffect');
  }, [colorVars]); // Only depend on colorVars

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

  // If there's an error, show error message
  if (hasError) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl">
        <h1 className="text-xl font-bold mb-4 dark:text-white">Analytics</h1>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          There was an error loading analytics data. Please try refreshing the page.
        </div>
      </div>
    );
  }

  // Render a loading state or the full analytics
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold dark:text-white">Analytics</h1>
      
      {isLoading && projects.length > 0 ? (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading analytics data...</p>
        </div>
      ) : (
        <>
          {projects.length === 0 ? (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl">
              <p className="text-gray-600 dark:text-gray-400 text-center">
                No projects found. Create a project to see analytics.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard 
                  title="Hours this week" 
                  value={totalHoursThisWeek.toString()}
                  icon={Clock}
                  description={`${Math.round(totalHoursThisWeek / 7 * 10) / 10} hours per day`}
                  trend={10}
                />
                <StatsCard 
                  title="Completion rate" 
                  value={`${totalSessions === 0 ? 0 : Math.round(completedSessions / totalSessions * 100)}%`}
                  icon={Target}
                  description={`${completedSessions} of ${totalSessions} sessions`}
                  trend={5}
                />
                <StatsCard 
                  title="Most productive day" 
                  value="Wednesday"
                  icon={TrendingUp}
                  description="32% higher than average"
                  trend={32}
                />
                <StatsCard 
                  title="Active projects" 
                  value={projects.length.toString()}
                  icon={Target}
                  description="2 projects in progress"
                  trend={0}
                />
              </div>
              
              {/* Project Chart */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-xl">
                <h2 className="text-lg font-medium mb-4 dark:text-white">Cumulative Hours per Project</h2>
                {projectData.datasets.length > 0 ? (
                  <ProjectChart data={projectData} />
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400">No time data available for any projects</p>
                  </div>
                )}
              </div>
              
              {/* Habit Stats */}
              {habits.length > 0 && (
                <div className="p-6 bg-white dark:bg-gray-800 rounded-xl">
                  <h2 className="text-lg font-medium mb-4 dark:text-white">Identity Habits</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-medium dark:text-white">Intellectual</h3>
                      </div>
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                          {habits.filter(h => h.category === 'Intellectual' && h.completed).length} / {habits.filter(h => h.category === 'Intellectual').length}
                        </div>
                        <div className="text-sm text-indigo-600/80 dark:text-indigo-400/80">
                          habits completed today
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Heart className="w-5 h-5 text-pink-500" />
                        <h3 className="font-medium dark:text-white">Spiritual</h3>
                      </div>
                      <div className="bg-pink-50 dark:bg-pink-900/20 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                          {habits.filter(h => h.category === 'Spiritual' && h.completed).length} / {habits.filter(h => h.category === 'Spiritual').length}
                        </div>
                        <div className="text-sm text-pink-600/80 dark:text-pink-400/80">
                          habits completed today
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="w-5 h-5 text-green-500" />
                        <h3 className="font-medium dark:text-white">Physical</h3>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {habits.filter(h => h.category === 'Physical' && h.completed).length} / {habits.filter(h => h.category === 'Physical').length}
                        </div>
                        <div className="text-sm text-green-600/80 dark:text-green-400/80">
                          habits completed today
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default AnalyticsPage;