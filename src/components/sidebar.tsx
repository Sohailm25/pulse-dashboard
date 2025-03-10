import { NavLink } from 'react-router-dom';
import { Home, BarChart2, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export function Sidebar({ className, isExpanded, onToggle }: SidebarProps) {
  return (
    <div 
      className={cn(
        "bg-white py-6 flex flex-col transition-all duration-300 ease-in-out",
        isExpanded ? "w-64 px-6" : "w-20 px-4",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-8">
        <div className="w-6 h-6 bg-primary rounded flex-shrink-0" />
        {isExpanded && <span className="text-xl font-semibold">Chaart</span>}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-center mb-6">
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop"
            alt="Profile"
            className={cn(
              "rounded-full mx-auto mb-2",
              isExpanded ? "w-16 h-16" : "w-10 h-10"
            )}
          />
          {isExpanded && (
            <>
              <h3 className="font-medium">Sarah Connor</h3>
              <p className="text-sm text-gray-600">sarahc@gmail.com</p>
              <div className="mt-2 inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-600">28h</span>
              </div>
            </>
          )}
        </div>

        <NavItem to="/" icon={Home} label="Dashboard" isExpanded={isExpanded} />
        <NavItem to="/analytics" icon={BarChart2} label="Analytics" isExpanded={isExpanded} />
        <NavItem to="/settings" icon={Settings} label="Settings" isExpanded={isExpanded} />
      </div>

      <button
        onClick={onToggle}
        className="mt-auto mx-auto p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isExpanded ? (
          <ChevronLeft className="w-5 h-5" />
        ) : (
          <ChevronRight className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  to: string;
  isExpanded: boolean;
}

function NavItem({ icon: Icon, label, to, isExpanded }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-4 py-2 rounded-lg w-full transition-colors",
          isActive ? "bg-gray-100 text-primary" : "hover:bg-gray-50 text-gray-600"
        )
      }
    >
      <Icon className="w-5 h-5" />
      {isExpanded && <span>{label}</span>}
    </NavLink>
  );
}