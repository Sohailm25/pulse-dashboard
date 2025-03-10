import { formatTime } from '@/lib/utils';

interface ScheduleItemProps {
  time: Date;
  title: string;
  category: string;
  color: string;
}

export function ScheduleItem({ time, title, category, color }: ScheduleItemProps) {
  return (
    <div className="flex items-center gap-4 p-2">
      <div className="w-16 text-sm text-gray-600">{formatTime(time)}</div>
      <div className={`w-1 h-12 rounded ${color}`} />
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-gray-600">{category}</p>
      </div>
    </div>
  );
}