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
  const renderCount = useRef(1);
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
  const lastProcessedProjects = useRef<string | null>(null);
  console.log(`Last processed projects signature: ${lastProcessedProjects.current}`);

  // Add a state to store the color mapping from color names to RGB values
  const [colorVars, setColorVars] = useState<{[key: string]: string}>({});
  
  // Track processed project IDs to avoid reprocessing the same colors
  const processedProjectIds = useRef<string[]>([]);
  
  // State for tracking errors
  const [hasError, setHasError] = useState(false);
  const [componentError, setComponentError] = useState<string | null>(null);
  
  // Flag to track loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Create safe fallback data for the project chart
  const [projectData, setProjectData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      fill: boolean;
      tension: number; 
      borderWidth: number;
    }[];
  }>({
    labels: [],
    datasets: []
  });
  
  // Safety timeout to prevent infinite loading state
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.log('Loading timeout triggered - forcing load completion');
        setIsLoading(false);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);
  
  // Extract colors from CSS variables with fallbacks
  useEffect(() => {
    try {
      console.log('Extracting colors from CSS variables...');
      
      if (!document || !document.documentElement) {
        console.log('Document not available yet');
        return;
      }
      
      const styles = getComputedStyle(document.documentElement);
      const extractColor = (name: string, fallback: string): string => {
        try {
          const color = styles.getPropertyValue(name).trim();
          return color || fallback;
        } catch (err) {
          console.error(`Error getting color ${name}:`, err);
          return fallback;
        }
      };
      
      const colors = {
        'purple': extractColor('--purple-600', '#9333ea'),
        'blue': extractColor('--blue-600', '#2563eb'),
        'green': extractColor('--green-600', '#16a34a'),
        'red': extractColor('--red-600', '#dc2626'),
        'yellow': extractColor('--yellow-600', '#ca8a04'),
        'pink': extractColor('--pink-600', '#db2777'),
        'indigo': extractColor('--indigo-600', '#4f46e5'),
      };
      
      console.log('Extracted color variables:', colors);
      setColorVars(colors);
      
      // Force isLoading to false after colors are loaded
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error extracting colors:', error);
      setComponentError('Error loading color theme. Please refresh the page.');
      setHasError(true);
      setIsLoading(false);
    }
  }, []);
  
  // Calculate project data for chart with better error handling
  useEffect(() => {
    try {
      console.log('Calculating project data for chart...');
      if (Object.keys(colorVars).length === 0) {
        console.log('Colors not loaded yet, waiting...');
        return;
      }
      
      // Calculate project data without animation initially
      const data = calculateTimeSpent();
      console.log('Calculated project data:', data);
      setProjectData(data);
    } catch (error) {
      console.error('Error calculating project data:', error);
      setComponentError('Error processing project data. Please refresh the page.');
      setHasError(true);
      setProjectData({
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: []
      });
    } finally {
      // Ensure loading state is resolved
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  }, [colorVars, projects]);
  
  // Calculate daily (non-cumulative) time spent per project
  const calculateTimeSpent = () => {
    try {
      console.log('Starting calculateTimeSpent...');
      const today = new Date();
      const start = startOfWeek(today, { weekStartsOn: 1 });
      const end = endOfWeek(today, { weekStartsOn: 1 });
      
      console.log(`Week range: ${start.toISOString()} to ${end.toISOString()}`);
      
      // Generate array of day strings
      const days = eachDayOfInterval({ start, end }).map(day => 
        format(day, 'EEE')
      );
      
      console.log('Days of week:', days);
      
      // Create labels array
      const labels = days;
      
      // Filter valid projects that have recurring sessions
      const validProjects = projects.filter(project => 
        project.recurringSessions && 
        Array.isArray(project.recurringSessions) && 
        project.recurringSessions.length > 0
      );
      
      console.log(`Valid projects count: ${validProjects.length}`);
      
      // Generate datasets
      const datasets = validProjects.map(project => {
        try {
          console.log(`Processing project: ${project.title}`);
          
          // Get color from CSS variable or use fallback
          const colorMatch = project.color.match(/bg-([a-z]+)-\d+/);
          const colorName = colorMatch ? colorMatch[1] : 'purple';
          const color = colorVars[colorName] || '#9333ea'; // Fallback color
          
          console.log(`Project ${project.title} - Color: ${colorName} -> ${color}`);
          
          // Prepare accumulative daily hours
          let accumulativeHours = Array(7).fill(0);
          
          // Process each session
          if (project.recurringSessions && Array.isArray(project.recurringSessions)) {
            project.recurringSessions.forEach(session => {
              if (!session.completions || !Array.isArray(session.completions)) {
                console.log(`No completions for session: ${session.title}`);
                return;
              }
              
              // Add dummy completions for testing if none exist
              const completions = session.completions.length > 0 
                ? session.completions 
                : [
                  { date: format(addDays(today, -3), 'yyyy-MM-dd'), completed: true, notes: 'Dummy completion' }
                ];
              
              console.log(`Session ${session.title} has ${completions.length} completions`);
              
              completions.forEach(completion => {
                if (!completion.date) {
                  console.log('Completion missing date, skipping');
                  return;
                }
                
                try {
                  // Parse date safely
                  const completionDate = typeof completion.date === 'string' 
                    ? parse(completion.date, 'yyyy-MM-dd', new Date())
                    : new Date(completion.date);
                  
                  if (isNaN(completionDate.getTime())) {
                    console.log(`Invalid date: ${completion.date}`);
                    return;
                  }
                  
                  // Check if date is within our week
                  if (completionDate >= start && completionDate <= end) {
                    const dayIndex = days.indexOf(format(completionDate, 'EEE'));
                    if (dayIndex === -1) {
                      console.log(`Day not found for date: ${format(completionDate, 'EEE')}`);
                      return;
                    }
                    
                    // Calculate duration in hours
                    let durationHours = 0;
                    
                    if (session.startTime && session.endTime) {
                      const startMinutes = session.startTime.split(':').map(Number);
                      const endMinutes = session.endTime.split(':').map(Number);
                      
                      if (startMinutes.length >= 2 && endMinutes.length >= 2) {
                        const start = new Date();
                        start.setHours(startMinutes[0], startMinutes[1], 0);
                        
                        const end = new Date();
                        end.setHours(endMinutes[0], endMinutes[1], 0);
                        
                        durationHours = differenceInMinutes(end, start) / 60;
                      }
                    }
                    
                    // Use 1 hour as fallback if calculation failed
                    if (durationHours <= 0) {
                      durationHours = 1;
                    }
                    
                    // Add to accumulated hours for the day
                    accumulativeHours[dayIndex] += durationHours;
                    
                    console.log(`Added ${durationHours} hours for ${project.title} on ${format(completionDate, 'EEE')}`);
                  }
                } catch (err) {
                  console.error('Error processing completion:', err);
                }
              });
            });
          }
          
          // Calculate cumulative data
          const cumulativeData = accumulativeHours.map((hours, index) => {
            let total = 0;
            for (let i = 0; i <= index; i++) {
              total += accumulativeHours[i];
            }
            return total;
          });
          
          return {
            label: project.title,
            data: cumulativeData,
            borderColor: color,
            backgroundColor: `${color}20`,
            fill: true,
            tension: 0.4,
            borderWidth: 2,
          };
        } catch (err) {
          console.error(`Error processing project ${project.title}:`, err);
          // Return fallback dataset
          return {
            label: project.title || 'Unknown',
            data: [0, 0, 0, 0, 0, 0, 0],
            borderColor: '#9333ea',
            backgroundColor: '#9333ea20',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
          };
        }
      });
      
      return {
        labels,
        datasets: datasets.length ? datasets : [
          // Provide fallback dataset if no data
          {
            label: 'No Data',
            data: [0, 0, 0, 0, 0, 0, 0],
            borderColor: '#9333ea',
            backgroundColor: '#9333ea20',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
          }
        ]
      };
    } catch (error) {
      console.error('Error in calculateTimeSpent:', error);
      // Return safe fallback data
      return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Error in calculation',
          data: [0, 0, 0, 0, 0, 0, 0],
          borderColor: '#9333ea',
          backgroundColor: '#9333ea20',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        }]
      };
    }
  };
  
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