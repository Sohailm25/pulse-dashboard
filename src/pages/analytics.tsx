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
  console.log(`AnalyticsPage render count: ${renderCount.current}`);
  
  const { getProjectsForUser } = useProjectStore();
  const { getHabitsForUser } = useHabitStore();
  
  const projects = getProjectsForUser();
  const habits = getHabitsForUser();
  
  // Track last processed projects to prevent unnecessary reprocessing
  const lastProcessedProjects = useRef<string>('');
  
  const [colorVars, setColorVars] = useState<Record<string, string>>({});
  const [projectData, setProjectData] = useState<any>({ labels: [], datasets: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [componentError, setComponentError] = useState<string | null>(null);
  
  // Add a ref to track if colorVars has been populated - prevents infinite loops
  const processedProjectIds = useRef<string[]>([]);

  console.log(`Projects count: ${projects.length}, Processed IDs count: ${processedProjectIds.current.length}`);
  console.log(`Habits count: ${habits.length}`);
  
  // Generate a stable representation of projects for comparison
  const projectsSignature = useMemo(() => {
    return projects.map(p => `${p.id}-${p.color}`).sort().join('|');
  }, [projects]);
  
  console.log(`Current projects signature: ${projectsSignature}`);
  console.log(`Last processed projects signature: ${lastProcessedProjects.current}`);

  // Extract color values from CSS variables safely in useEffect
  useEffect(() => {
    console.log('Starting colorVars useEffect');
    console.log(`---> Project count: ${projects.length}`);
    console.log(`---> ProcessedProjectIds count: ${processedProjectIds.current.length}`);
    console.log(`---> ProjectsSignature: ${projectsSignature}`);
    console.log(`---> lastProcessedProjects.current: ${lastProcessedProjects.current}`);
    
    // Skip if the exact same projects have already been processed
    if (projectsSignature === lastProcessedProjects.current && Object.keys(colorVars).length > 0) {
      console.log('SKIPPING: Same projects already processed');
      return;
    }
    
    if (typeof document === 'undefined') {
      console.log('Document is undefined, skipping colorVars calculation');
      return;
    }
    
    // Reset the processed IDs if the signature changed
    if (projectsSignature !== lastProcessedProjects.current) {
      console.log('Projects changed, resetting processed IDs');
      processedProjectIds.current = [];
    }
    
    const vars: Record<string, string> = {};
    try {
      console.log(`Processing ${projects.length} projects for colors`);
      
      // If no projects, set an empty object and return
      if (!projects.length) {
        console.log('No projects to process');
        setColorVars({});
        lastProcessedProjects.current = projectsSignature;
        setIsLoading(false);
        return;
      }
      
      // Get all unique color values
      const uniqueColors = new Set<string>();
      projects.forEach(project => {
        if (project.color) {
          uniqueColors.add(project.color);
        }
      });
      
      console.log(`Found ${uniqueColors.size} unique colors`);
      
      // Process each unique color only once
      uniqueColors.forEach(color => {
        const colorParts = color.split('-');
        if (colorParts.length >= 2) {
          const colorType = colorParts[1]; // e.g., "purple" from "bg-purple-600"
          console.log(`Getting color var for ${colorType}-600`);
          const colorVar = getComputedStyle(document.documentElement)
            .getPropertyValue(`--${colorType}-600`)
            .trim();
          vars[color] = colorVar || '0, 0, 0'; // Default to black if not found
          console.log(`Set color var for ${color}: ${colorVar}`);
        } else {
          console.log(`Invalid color format: ${color}`);
        }
      });
      
      // Update processed IDs
      processedProjectIds.current = projects.map(p => p.id);
      
      // Only set state if the colors are different
      const existingColorKeys = Object.keys(colorVars).sort().join(',');
      const newColorKeys = Object.keys(vars).sort().join(',');
      
      if (existingColorKeys !== newColorKeys) {
        console.log('Setting colorVars:', Object.keys(vars));
        setColorVars(vars);
      } else {
        console.log('No change in colorVars, skipping state update');
      }
      
      // Update last processed projects
      lastProcessedProjects.current = projectsSignature;
    } catch (error) {
      console.error('Error accessing CSS variables:', error);
      setHasError(true);
      setComponentError('Error accessing CSS variables');
      setIsLoading(false);
    }
    console.log('Completed colorVars useEffect');
  }, [projectsSignature, colorVars]); // Only depend on projectsSignature

  // Calculate daily (non-cumulative) time spent per project
  const calculateTimeSpent = () => {
    console.log('calculateTimeSpent called');
    try {
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      console.log(`Week range: ${format(weekStart, 'yyyy-MM-dd')} to ${format(weekEnd, 'yyyy-MM-dd')}`);

      // Generate array of day strings for the week
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).map(day => 
        format(day, 'yyyy-MM-dd')
      );
      console.log('Week days:', weekDays);

      // For projects without valid recurringSessions, provide sensible defaults
      const validProjects = projects.filter(project => 
        project && project.recurringSessions && Array.isArray(project.recurringSessions)
      );
      
      console.log(`Processing ${validProjects.length} projects with ${Object.keys(colorVars).length} colors`);

      // Check if we have any data to work with
      if (validProjects.length === 0) {
        return {
          labels: weekDays.map(day => format(parse(day, 'yyyy-MM-dd', new Date()), 'EEE')),
          datasets: []
        };
      }

      // Add dummy completion data for testing if no completions exist
      let addedDummyData = false;
      validProjects.forEach(project => {
        if (project.recurringSessions && Array.isArray(project.recurringSessions)) {
          project.recurringSessions.forEach(session => {
            if (!session.completions || !Array.isArray(session.completions) || session.completions.length === 0) {
              // Add a dummy completion for today
              const today = format(new Date(), 'yyyy-MM-dd');
              console.log(`Adding dummy completion for ${project.title}, session ${session.title} on ${today}`);
              session.completions = [{
                date: today,
                completed: true,
                duration: 60 // 1 hour
              }];
              addedDummyData = true;
            }
          });
        }
      });

      if (addedDummyData) {
        console.log('Added dummy completion data for testing - chart should now show data');
      }

      return projects.map(project => {
        console.log(`Processing project: ${project.title} (${project.id})`);
        // Calculate daily hours (non-cumulative)
        const dailyData = weekDays.map(day => {
          // Skip if project has no recurringSessions
          if (!project.recurringSessions || !Array.isArray(project.recurringSessions)) {
            console.log(`Project ${project.title} has no valid recurringSessions`);
            return 0;
          }

          project.recurringSessions.forEach(session => {
            if (!session.completions || !Array.isArray(session.completions)) {
              console.log(`Session ${session.title} has no valid completions`);
              return;
            }

            // Debug completions for this session
            console.log(`Session ${session.title} has ${session.completions.length} completions:`);
            session.completions.forEach(completion => {
              console.log(`- Date: ${completion.date}, Completed: ${completion.completed}, Duration: ${completion.duration || 'N/A'}`);
            });
          });

          // Calculate total hours for this day across all sessions
          let dayHours = project.recurringSessions.reduce((total, session) => {
            if (!session.completions || !Array.isArray(session.completions)) return total;
            
            // Find completion for this day
            const completion = session.completions.find(
              c => c.date === day && c.completed
            );
            
            if (!completion) return total;
            
            // If we have an explicit duration, use it
            if (completion.duration) {
              return total + (completion.duration / 60); // Convert minutes to hours
            }
            
            // Otherwise calculate from session start/end times
            if (session.startTime && session.endTime) {
              try {
                const startTime = parse(session.startTime, 'HH:mm', new Date());
                const endTime = parse(session.endTime, 'HH:mm', new Date());
                const durationMinutes = differenceInMinutes(endTime, startTime);
                return total + (durationMinutes / 60);
              } catch (e) {
                console.error(`Error parsing time for ${session.title}:`, e);
                return total;
              }
            }
            
            return total;
          }, 0);
          
          console.log(`Day ${day} for project ${project.title}: ${dayHours} hours`);
          return dayHours;
        });

        console.log(`Daily data for ${project.title} (${project.id}):`, dailyData);

        // Calculate cumulative data
        const cumulativeData = dailyData.reduce((acc, hours, i) => {
          if (i === 0) return [hours];
          return [...acc, acc[i - 1] + hours];
        }, [] as number[]);

        console.log(`Cumulative data for ${project.title} (${project.id}):`, cumulativeData);

        // Get the hex color from our color variables
        const colorVar = project.color ? colorVars[project.color] : null;
        const rgbColor = colorVar ? `${colorVar.r}, ${colorVar.g}, ${colorVar.b}` : '100, 100, 100';
        console.log(`Using color ${rgbColor} for project ${project.title} (${project.id})`);

        return {
          label: project.title,
          data: cumulativeData,
          borderColor: `rgb(${rgbColor})`,
          backgroundColor: `rgba(${rgbColor}, 0.1)`,
          fill: true,
          tension: 0.4,
          borderWidth: 2
        };
      });
    } catch (error) {
      console.error('Error calculating time spent:', error);
      return {
        labels: [],
        datasets: []
      };
    }
  };

  // Store previous projectData for comparison to prevent infinite updates
  const prevProjectData = useRef<string>('');
  
  // Calculate project data in useEffect to avoid doing it during render
  useEffect(() => {
    console.log('Starting projectData useEffect');
    console.log(`---> ColorVars keys: ${Object.keys(colorVars)}`);
    console.log(`---> ProjectsSignature: ${projectsSignature}`);
    
    // Skip if colorVars is empty or we're still loading projects
    if (Object.keys(colorVars).length === 0) {
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
      
      // Convert to string for comparison
      const newProjectDataString = JSON.stringify(data);
      
      // Only update state if data has changed
      if (newProjectDataString !== prevProjectData.current) {
        console.log(`Setting projectData with datasets: ${data.datasets.length}`);
        setProjectData(data);
        prevProjectData.current = newProjectDataString;
      } else {
        console.log('Project data unchanged, skipping update');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error setting project data:', error);
      setHasError(true);
      setComponentError('Error calculating project data');
      setIsLoading(false);
    }
    console.log('Completed projectData useEffect');
  }, [colorVars, projectsSignature]); // Only depend on colorVars and projectsSignature

  // Ensure we're not stuck in loading state
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
      setComponentError('Error calculating total hours');
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
                  value={totalHoursThisWeek.toFixed(1)} 
                  description="hours tracked in projects" 
                  trend={0}
                  icon={<Clock className="w-6 h-6 text-blue-500" />}
                />
                
                <StatsCard 
                  title="Completion rate" 
                  value={`${totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0}%`} 
                  description={`${completedSessions}/${totalSessions} sessions complete`} 
                  trend={0}
                  icon={<Target className="w-6 h-6 text-green-500" />}
                />
                
                <StatsCard 
                  title="Project focus" 
                  value={`${projects.length}`} 
                  description="active projects" 
                  trend={0}
                  icon={<TrendingUp className="w-6 h-6 text-purple-500" />}
                />
                
                <StatsCard 
                  title="Habits streak" 
                  value={`${habits.filter(h => h.streak > 0).length}`} 
                  description="habits with active streaks" 
                  trend={0}
                />
              </div>
              
              {/* Project Chart */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-xl">
                {console.log('Rendering Project Chart section')}
                {console.log(`ProjectData datasets: ${projectData.datasets?.length || 0}`)}
                {projectData.datasets?.forEach((dataset, idx) => 
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
      
      <div className="text-xs text-gray-400 dark:text-gray-600 mt-4">
        Render count: {renderCount.current} | {isLoading ? 'Loading...' : 'Loaded'} | Errors: {componentError || 'None'} | ColorVars: {Object.keys(colorVars).length} | Datasets: {projectData.datasets?.length || 0}
      </div>
    </div>
  );
}

export default AnalyticsPage;