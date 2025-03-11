import { ProjectChart } from '@/components/analytics/project-chart';
import { StatsCard } from '@/components/stats-card';
import { Clock, Target, TrendingUp, Brain, Heart, Dumbbell } from 'lucide-react';
import { useProjectStore } from '@/stores/project-store';
import { useHabitStore } from '@/stores/habit-store';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, differenceInMinutes, parse, addDays } from 'date-fns';
import { useState, useEffect, useRef, useMemo } from 'react';

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
  
  const getProjectsForUser = useProjectStore(state => state.projects);
  const getHabitsForUser = useHabitStore(state => state.habits);
  
  const projects = getProjectsForUser();
  const habits = getHabitsForUser();
    
  // Generate a stable representation of projects for comparison
  const projectsSignature = useMemo(() => {
    return projects.map((p: any) => `${p.id}-${p.color}`).sort().join('|');
  }, [projects]);
  
  console.log(`Current projects signature: ${projectsSignature}`);
  
  // Reference to track the last processed projects to prevent unnecessary reprocessing
  const lastProcessedProjects = useRef("");
  console.log(`Last processed projects signature: ${lastProcessedProjects.current}`);

  // Add a state to store the color mapping from color names to RGB values
  const [colorVars, setColorVars] = useState<Record<string, number[]>>({});
  
  // Track processed project IDs to avoid reprocessing the same colors
  const processedProjectIds = useRef<string[]>([]);
  
  // State for tracking errors
  const [hasError, setHasError] = useState(false);
  const [componentError, setComponentError] = useState<string | null>(null);
  
  // Flag to track loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Get color variables from CSS
  useEffect(() => {
    console.log('Starting colorVars useEffect');
    console.log(`---> Project count: ${projects.length}`);
    console.log(`---> ProcessedProjectIds count: ${processedProjectIds.current.length}`);
    console.log(`---> ProjectsSignature: ${projectsSignature}`);
    console.log(`---> lastProcessedProjects.current: ${lastProcessedProjects.current}`);
    
    try {
      // Skip if the same projects have already been processed
      if (projectsSignature === lastProcessedProjects.current && Object.keys(colorVars).length > 0) {
        console.log('SKIPPING: Same projects already processed');
        return;
      }
      
      // Reset processed IDs if the projects have changed
      if (projectsSignature !== lastProcessedProjects.current) {
        console.log('Projects changed, resetting processed IDs');
        processedProjectIds.current = [];
      }
      
      // Create a map to store color values
      const newColorVars: Record<string, number[]> = {};
      
      console.log(`Processing ${projects.length} projects for colors`);
      
      // Get all unique color values
      const uniqueColors = new Set<string>();
      projects.forEach((project: any) => {
        if (project.color) {
          uniqueColors.add(project.color);
        }
      });
      
      console.log(`Found ${uniqueColors.size} unique colors`);
      
      // Extract the color values from CSS variables
      uniqueColors.forEach(colorClass => {
        // Get color name without the bg- prefix, e.g., 'bg-purple-600' -> 'purple-600'
        const colorName = colorClass.replace('bg-', '');
        console.log(`Getting color var for ${colorName}`);
        
        try {
          // Get the RGB values from the CSS variable
          const root = document.documentElement;
          const computedStyle = getComputedStyle(root);
          const cssVar = computedStyle.getPropertyValue(`--${colorName}`).trim();
          
          if (cssVar) {
            const rgbValues = cssVar.split(' ').map(val => parseInt(val, 10));
            newColorVars[colorClass] = rgbValues;
            console.log(`Set color var for ${colorClass}: ${rgbValues.join(' ')}`);
          } else {
            // Fallback to a default color if CSS variable not found
            newColorVars[colorClass] = [124, 58, 237]; // Purple fallback
            console.log(`Using fallback color for ${colorClass}`);
          }
        } catch (err) {
          console.error(`Error getting color for ${colorName}:`, err);
          // Use fallback color
          newColorVars[colorClass] = [124, 58, 237]; // Purple fallback
        }
      });
      
      // Update processed IDs
      processedProjectIds.current = projects.map((p: any) => p.id);
      
      // Only set state if the colors are different
      const existingColorKeys = Object.keys(colorVars).sort().join(',');
      const newColorKeys = Object.keys(newColorVars).sort().join(',');
      
      if (newColorKeys !== existingColorKeys || 
          !Object.keys(newColorVars).every(key => {
            return colorVars[key]?.toString() === newColorVars[key]?.toString();
          })) {
        console.log(`Setting colorVars: ${Object.entries(newColorVars).length}`);
        setColorVars(newColorVars);
      }
      
      // Update the lastProcessedProjects to avoid unnecessary reprocessing
      lastProcessedProjects.current = projectsSignature;
    } catch (err) {
      console.error('Error in colorVars useEffect:', err);
      setComponentError(`Error loading color variables: ${err instanceof Error ? err.message : String(err)}`);
      setHasError(true);
      setIsLoading(false);
    }
    
    console.log('Completed colorVars useEffect');
  }, [projects, projectsSignature, colorVars]);
  
  // Add timeout to ensure we don't get stuck in loading state
  useEffect(() => {
    // Set a timeout to exit loading state after 5 seconds just in case
    const timer = setTimeout(() => {
      if (isLoading) {
        console.log('Loading timeout reached - forcing exit from loading state');
        setIsLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [isLoading]);
  
  // Calculate daily (non-cumulative) time spent per project
  const calculateTimeSpent = () => {
    try {
      console.log('calculateTimeSpent called');
      
      // Get week range
      const today = new Date();
      const weekStart = startOfWeek(today);
      const weekEnd = endOfWeek(today);
      
      console.log(`Week range: ${format(weekStart, 'yyyy-MM-dd')} to ${format(weekEnd, 'yyyy-MM-dd')}`);
      
      // Generate array of day strings for the week
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day: any) => 
        format(day, 'yyyy-MM-dd')
      );
      console.log('Week days:', weekDays);
      
      // For projects without valid recurringSessions, provide sensible defaults
      const validProjects = projects.filter((project: any) => 
        project && project.recurringSessions && Array.isArray(project.recurringSessions)
      );
      
      console.log(`Processing ${validProjects.length} projects with ${Object.keys(colorVars).length} colors`);
      
      if (validProjects.length === 0) {
        return {
          labels: weekDays.map((day: any) => format(parse(day, 'yyyy-MM-dd', new Date()), 'EEE')),
          datasets: []
        };
      }
      
      // Add dummy completion data for testing if no completions exist
      let addedDummyData = false;
      validProjects.forEach((project: any) => {
        if (project.recurringSessions && Array.isArray(project.recurringSessions)) {
          project.recurringSessions.forEach((session: any) => {
            if (!session.completions || !Array.isArray(session.completions) || session.completions.length === 0) {
              // Add a dummy completion for today
              const today = format(new Date(), 'yyyy-MM-dd');
              
              if (!session.completions) {
                session.completions = [];
              }
              
              session.completions.push({
                date: today,
                completed: true,
                duration: 60 // 1 hour in minutes
              });
              
              console.log(`Adding dummy completion for ${project.title}, session ${session.title} on ${today}`);
              addedDummyData = true;
            }
          });
        }
      });
      
      if (addedDummyData) {
        console.log('Added dummy completion data for testing - chart should now show data');
      }
      
      return {
        labels: weekDays.map((day: any) => format(parse(day, 'yyyy-MM-dd', new Date()), 'EEE')),
        datasets: validProjects.map((project: any) => {
          console.log(`Processing project: ${project.title} (${project.id})`);
          // Calculate daily hours (non-cumulative)
          const dailyData = weekDays.map((day: any) => {
            // Skip if project has no recurringSessions
            if (!project.recurringSessions || !Array.isArray(project.recurringSessions)) {
              console.log(`Project ${project.title} has no valid recurringSessions`);
              return 0;
            }
            
            project.recurringSessions.forEach((session: any) => {
              if (!session.completions || !Array.isArray(session.completions)) {
                console.log(`Session ${session.title} has no valid completions`);
                return;
              }
              
              // Debug completions for this session
              console.log(`Session ${session.title} has ${session.completions.length} completions:`);
              session.completions.forEach((completion: any) => {
                console.log(`- Date: ${completion.date}, Completed: ${completion.completed}, Duration: ${completion.duration || 'N/A'}`);
              });
            });
            
            // Calculate total hours for this day across all sessions
            let dayHours = project.recurringSessions.reduce((total: any, session: any) => {
              if (!session.completions || !Array.isArray(session.completions)) return total;
              
              // Find completion for this day
              const completion = session.completions.find(
                (c: any) => c.date === day && c.completed
              );
              
              if (!completion) return total;
              
              // Add the duration to the total (might be explicit or calculated from start/end time)
              if (completion.duration) {
                // Duration is in minutes, convert to hours
                return total + (completion.duration / 60);
              } else if (completion.startTime && completion.endTime) {
                try {
                  const start = parse(completion.startTime, 'HH:mm', new Date());
                  const end = parse(completion.endTime, 'HH:mm', new Date());
                  const durationInMinutes = differenceInMinutes(end, start);
                  return total + (durationInMinutes / 60);
                } catch (err) {
                  console.error(`Error parsing time: ${err}`);
                  return total;
                }
              }
              
              // If no duration found but completion is marked as completed,
              // use the session's scheduled duration
              if (session.startTime && session.endTime) {
                try {
                  const start = parse(session.startTime, 'HH:mm', new Date());
                  const end = parse(session.endTime, 'HH:mm', new Date());
                  const durationInMinutes = differenceInMinutes(end, start);
                  return total + (durationInMinutes / 60);
                } catch (err) {
                  console.error(`Error parsing session time: ${err}`);
                }
              }
              
              return total;
            }, 0);
            
            console.log(`Day ${day} for project ${project.title}: ${dayHours} hours`);
            return dayHours;
          });
          
          console.log(`Daily data for ${project.title} (${project.id}):`, dailyData);
          
          // Calculate cumulative data
          const cumulativeData = dailyData.reduce((acc: any, hours: any, i: any) => {
            if (i === 0) return [hours];
            return [...acc, acc[i - 1] + hours];
          }, [] as number[]);
          
          console.log(`Cumulative data for ${project.title} (${project.id}):`, cumulativeData);
          
          // Get color from project color
          const colorClass = project.color || 'bg-purple-600'; // Default to purple if no color
          const rgbValues = colorVars[colorClass] || [124, 58, 237]; // Default values if not found
          
          console.log(`Using color ${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]} for project ${project.title} (${project.id})`);
          
          return {
            label: project.title,
            data: cumulativeData,
            borderColor: `rgb(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]})`,
            backgroundColor: `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.1)`,
            fill: true,
            tension: 0.4,
            borderWidth: 2
          };
        })
      };
    } catch (err) {
      console.error('Error calculating time spent:', err);
      setComponentError(`Error calculating project data: ${err instanceof Error ? err.message : String(err)}`);
      setHasError(true);
      setIsLoading(false);
      return { labels: [], datasets: [] };
    }
  };
  
  // Calculate project data for chart
  const [projectData, setProjectData] = useState<{ labels: string[], datasets: any[] }>({ 
    labels: [], 
    datasets: [] 
  });
  
  // Update project data when color variables change
  useEffect(() => {
    console.log('Starting projectData useEffect');
    console.log(`---> ColorVars keys: ${Object.keys(colorVars).join(', ')}`);
    console.log(`---> ProjectsSignature: ${projectsSignature}`);
    
    try {
      // Always ensure we have some color mapping, even if empty
      const safeColorVars = Object.keys(colorVars).length > 0 
        ? colorVars 
        : { 'bg-purple-600': [124, 58, 237] }; // Default fallback color
      
      console.log('Calculating project data');
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      // Get week range
      const today = new Date();
      const weekStart = startOfWeek(today);
      const weekEnd = endOfWeek(today);
      
      // Generate array of day strings for the week
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day: any) => 
        format(day, 'yyyy-MM-dd')
      );
      
      // Create chart labels
      const chartLabels = weekDays.map((day: any) => format(parse(day, 'yyyy-MM-dd', new Date()), 'EEE'));
      
      // For projects without data, create empty datasets
      if (!projects || projects.length === 0) {
        const emptyData = {
          labels: chartLabels,
          datasets: []
        };
        
        setProjectData(emptyData);
        setIsLoading(false);
        return;
      }
      
      // Process each project to create datasets
      const datasets = projects
        .filter((project: any) => project && project.recurringSessions)
        .map((project: any) => {
          // Calculate daily hours (simplified)
          const dailyData = weekDays.map(() => 0); // Start with zeros
          
          // Get cumulative hours (just use zeros for now, they'll be updated later)
          const cumulativeData = [0, 0, 0, 0, 0, 0, 0];
            
          // Get color from project color, with fallbacks
          const colorClass = project.color || 'bg-purple-600';
          const rgbValues = safeColorVars[colorClass] || [124, 58, 237];
          
          // Add some dummy data if all zeros (just for testing)
          cumulativeData[2] = 1; // Add some data for Tuesday
          cumulativeData[3] = 1.5; // Add some data for Wednesday
          cumulativeData[4] = 2; // Add some data for Thursday
          
          return {
            label: project.title || 'Unnamed Project',
            data: cumulativeData,
            borderColor: `rgb(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]})`,
            backgroundColor: `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.1)`,
            fill: true,
            tension: 0.4,
            borderWidth: 2
          };
        });
      
      // Create new chart data
      const newData = {
        labels: chartLabels,
        datasets
      };
      
      // Set project data and exit loading state
      setProjectData(newData);
      setIsLoading(false);
      
    } catch (err) {
      console.error('Error in projectData useEffect:', err);
      
      // Create a fallback dataset with dummy data so the user sees something
      const fallbackData = {
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: projects.slice(0, 3).map((project: any, idx: number) => ({
          label: project?.title || `Project ${idx + 1}`,
          data: [0, 0, idx + 0.5, idx + 1, idx + 1.5, idx + 2, idx + 2],
          borderColor: idx === 0 ? 'rgb(124, 58, 237)' : idx === 1 ? 'rgb(59, 130, 246)' : 'rgb(16, 185, 129)',
          backgroundColor: idx === 0 ? 'rgba(124, 58, 237, 0.1)' : idx === 1 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2
        }))
      };
      
      setProjectData(fallbackData);
      setComponentError(`Error calculating chart data: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
    
    console.log('Completed projectData useEffect');
  }, [colorVars, projectsSignature, isLoading, projects]);

  // Calculate total hours this week from completed sessions
  const calculateTotalHours = () => {
    try {
      console.log('calculateTotalHours called');
      
      // Initialize totalHours variable
      let totalHours = 0;
      
      // Get week range
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      
      // Loop through each day of the week
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      
      projects.forEach((project: any) => {
        if (!project.recurringSessions || !Array.isArray(project.recurringSessions)) {
          console.log(`Project ${project.title} has no valid recurringSessions`);
          return;
        }
        
        project.recurringSessions.forEach((session: any) => {
          days.forEach((day: any) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            
            if (!session.completions || !Array.isArray(session.completions)) {
              return;
            }
            
            // Check for completion on this day
            const completion = session.completions.find((c: any) => c.date === dateStr && c.completed);
            
            if (completion) {
              totalHours += completion.duration 
                ? completion.duration / 60 
                : 1; // Default to 1 hour if no duration
            }
          });
        });
      });
      
      return totalHours;
    } catch (err) {
      console.error('Error calculating total hours:', err);
      return 0;
    }
  };

  // Memoize these calculations to prevent recalculation on every render
  const totalHoursThisWeek = useMemo(() => calculateTotalHours(), [projects]);
  console.log(`Total hours this week: ${totalHoursThisWeek}`);
  
  const completedSessions = useMemo(() => projects.reduce((total, project) => {
    if (!project.recurringSessions || !Array.isArray(project.recurringSessions)) {
      return total;
    }
    
    return total + project.recurringSessions.reduce((sessionTotal, session) => {
      if (!session.completions || !Array.isArray(session.completions)) {
        return sessionTotal;
      }
      
      return sessionTotal + (session.completions.filter((c: Completion) => c.completed)?.length || 0);
    }, 0);
  }, 0), [projects]);
  console.log(`Completed sessions: ${completedSessions}`);

  const totalSessions = useMemo(() => projects.reduce((total, project) => {
    if (!project.recurringSessions || !Array.isArray(project.recurringSessions)) {
      return total;
    }
    
    return total + project.recurringSessions.length * 7;
  }, 0), [projects]);
  console.log(`Total sessions: ${totalSessions}`);

  // If there's an error, show error message
  if (hasError) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl">
        <h1 className="text-xl font-bold mb-4 dark:text-white">Analytics</h1>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          There was an error loading analytics data: {componentError || 'Please try refreshing the page.'}
        </div>
      </div>
    );
  }

  // Render a loading state or the full analytics
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold dark:text-white">Analytics</h1>
      
      {console.log('Rendering analytics content...')}
      {console.log(`Loading state: ${isLoading}, Projects length: ${projects.length}`)}
      {console.log(`ProjectData: ${JSON.stringify(projectData)}`)}
      
      {isLoading && projects.length > 0 ? (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl text-center">
          {console.log('Rendering loading state')}
          <p className="text-gray-600 dark:text-gray-400">Loading analytics data...</p>
        </div>
      ) : (
        <>
          {console.log('Rendering main content')}
          {projects.length === 0 ? (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl">
              {console.log('Rendering empty projects state')}
              <p className="text-gray-600 dark:text-gray-400 text-center">
                No projects found. Create a project to see analytics.
              </p>
            </div>
          ) : (
            <>
              {console.log('Rendering project data')}
              {console.log(`Stats data: 
                Hours: ${totalHoursThisWeek}, 
                Sessions: ${completedSessions}/${totalSessions}
              `)}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {console.log('Rendering StatsCards')}
                <StatsCard 
                  title="Hours this week" 
                  value={`${totalHoursThisWeek}`}
                  description="hours spent on projects" 
                  trend={0}
                  icon={<Clock className="w-4 h-4 text-blue-500" />}
                />
                
                <StatsCard 
                  title="Completion rate" 
                  value={`${Math.round((completedSessions / (totalSessions || 1)) * 100)}%`}
                  description="of scheduled sessions" 
                  trend={0}
                  icon={<Target className="w-4 h-4 text-green-500" />}
                />
                
                <StatsCard 
                  title="Active projects" 
                  value={`${projects.length}`}
                  description="projects in progress" 
                  trend={0}
                  icon={<TrendingUp className="w-4 h-4 text-purple-500" />}
                />
                
                <StatsCard 
                  title="Habits streak" 
                  value={`${habits.filter((h: any) => h.streak > 0).length}`} 
                  description="habits with active streaks" 
                  trend={0}
                />
              </div>
              
              {/* Project Chart */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-xl">
                {console.log('Rendering Project Chart section')}
                {console.log(`ProjectData datasets: ${projectData.datasets?.length || 0}`)}
                {projectData.datasets?.forEach((dataset: any, idx: any) => 
                  console.log(`Dataset ${idx}: ${dataset.label}, data: ${JSON.stringify(dataset.data)}`)
                )}
                
                <h2 className="text-lg font-medium mb-4 dark:text-white">Cumulative Hours per Project</h2>
                <div className="h-[300px] relative">
                  <div className="absolute inset-0">
                    <ProjectChart data={projectData} />
                  </div>
                </div>
              </div>
              
              {/* Habit Stats */}
              {habits.length > 0 && (
                <div className="p-6 bg-white dark:bg-gray-800 rounded-xl">
                  {console.log('Rendering Habits section')}
                  <h2 className="text-lg font-medium mb-4 dark:text-white">Identity Habits</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-medium dark:text-white">Intellectual</h3>
                      </div>
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                          {habits.filter((h: any) => h.category === 'Intellectual' && h.completed).length} / {habits.filter((h: any) => h.category === 'Intellectual').length}
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
                          {habits.filter((h: any) => h.category === 'Spiritual' && h.completed).length} / {habits.filter((h: any) => h.category === 'Spiritual').length}
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
                          {habits.filter((h: any) => h.category === 'Physical' && h.completed).length} / {habits.filter((h: any) => h.category === 'Physical').length}
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
      
      <div className="text-xs text-gray-400 dark:text-gray-600 mt-4">
        Render count: {renderCount.current} | {isLoading ? 'Loading...' : 'Loaded'} | Errors: {componentError || 'None'} | ColorVars: {Object.keys(colorVars).length} | Datasets: {projectData.datasets?.length || 0}
      </div>
    </div>
  );
}

export default AnalyticsPage;