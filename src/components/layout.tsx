import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Plus, LayoutDashboard, BarChart2, Moon, Sun, LogOut, BookOpen } from 'lucide-react';
import { getGreeting } from '@/lib/utils';
import { useProjectStore } from '@/stores/project-store';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { motion, AnimatePresence } from 'framer-motion';

export function Layout() {
  const addProject = useProjectStore(state => state.addProject);
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const { signOut, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const today = new Date();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth <= 768);
      const handleResize = () => setIsMobile(window.innerWidth <= 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDark]);

  const handleAddProject = () => {
    const newProject = {
      id: crypto.randomUUID(),
      title: 'New Project',
      description: '',
      taskCount: 0,
      progress: 0,
      collaborators: 1,
      color: 'bg-purple-600',
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      mvg: {
        description: 'Define your minimum viable goal',
        completed: false,
        streak: 0,
        completionHistory: []
      },
      phases: [
        {
          id: crypto.randomUUID(),
          title: 'Planning',
          completed: false,
          subgoals: [
            { id: crypto.randomUUID(), title: 'Define Requirements', completed: false }
          ]
        }
      ],
      recurringSessions: []
    };
    
    addProject(newProject);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const navigationItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/analytics", icon: BarChart2, label: "Analytics" },
    { to: "/reference", icon: BookOpen, label: "Reference" }
  ];

  const Navigation = () => (
    <div className="space-y-2">
      {navigationItems.map(item => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                isActive 
                  ? 'bg-primary text-white' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`
            }
            title={item.label}
            onClick={() => {
              console.log(`Navigating to: ${item.to}`);
            }}
          >
            <Icon className="w-5 h-5" />
          </NavLink>
        );
      })}

      <button
        onClick={toggleTheme}
        className="w-10 h-10 flex items-center justify-center rounded-xl transition-all text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        title={isDark ? "Light Mode" : "Dark Mode"}
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div
              key="sun"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.2 }}
            >
              <Sun className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ scale: 0, rotate: 180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: -180 }}
              transition={{ duration: 0.2 }}
            >
              <Moon className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <button
        onClick={handleLogout}
        className="w-10 h-10 flex items-center justify-center rounded-xl transition-all text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
        title="Logout"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  );

  console.log('Current location:', location.pathname);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {!isMobile && (
        <nav className="fixed top-6 left-6 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-3 space-y-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <Navigation />
          </div>
        </nav>
      )}
      
      <main className={`${isMobile ? 'px-4' : 'pl-28 pr-8'} py-8 pb-24`}>
        <header className="flex items-center justify-between mb-8 mobile-stack gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {getGreeting()}, {user?.name || 'User'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Today is {today.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
          
          <button
            onClick={handleAddProject}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 mobile-full justify-center"
          >
            <Plus className="w-4 h-4" />
            Add New Project
          </button>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {isMobile && (
        <nav className="mobile-nav dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-around">
            <Navigation />
          </div>
        </nav>
      )}
    </div>
  );
}