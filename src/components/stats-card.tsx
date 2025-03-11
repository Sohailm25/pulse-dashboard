import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: number; // positive = up, negative = down, 0 = neutral
  icon?: LucideIcon; // Now expecting Lucide icon component
}

export function StatsCard({ title, value, description, trend = 0, icon: Icon }: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        {Icon && <Icon className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-semibold dark:text-white">{value}</p>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
        
        {trend !== 0 && (
          <div className={`flex items-center ${
            trend > 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {trend > 0 ? (
              <ArrowUpIcon className="w-4 h-4 mr-1" />
            ) : (
              <ArrowDownIcon className="w-4 h-4 mr-1" />
            )}
            <span className="text-sm font-medium">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}