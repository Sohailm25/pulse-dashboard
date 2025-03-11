import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Calendar, BarChart2, PieChart, TrendingUp } from 'lucide-react';

interface ViewNavigationProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  hidden?: boolean;
}

export type DashboardView = 'holistic' | 'daily' | 'weekly' | 'monthly' | 'quarterly';

const views: Array<{
  id: DashboardView;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'holistic', label: 'Holistic', icon: LayoutDashboard },
  { id: 'daily', label: 'Daily', icon: Calendar },
  { id: 'weekly', label: 'Weekly', icon: BarChart2 },
  { id: 'monthly', label: 'Monthly', icon: PieChart },
  { id: 'quarterly', label: 'Quarterly', icon: TrendingUp }
];

export function ViewNavigation({ activeView, onViewChange, hidden = false }: ViewNavigationProps) {
  if (hidden) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-6 z-50 pointer-events-none">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto w-full max-w-2xl mx-4"
      >
        <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-between px-2 py-1.5">
          {views.map((view) => {
            const Icon = view.icon;
            const isActive = activeView === view.id;
            
            return (
              <button
                key={view.id}
                onClick={() => onViewChange(view.id)}
                className="relative px-4 py-2 rounded-full flex items-center gap-2 transition-colors"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-view"
                    className="absolute inset-0 bg-primary rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                  <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'} hidden sm:inline`}>
                    {view.label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}