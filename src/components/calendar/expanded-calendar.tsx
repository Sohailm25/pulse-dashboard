import { motion } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  category: string;
  color: string;
}

interface ExpandedCalendarProps {
  events: Event[];
  onClose: () => void;
}

export function ExpandedCalendar({ events, onClose }: ExpandedCalendarProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-white p-6"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">Calendar</h2>
            <button className="flex items-center gap-1 text-sm text-gray-600">
              {format(new Date(), 'MMMM yyyy')}
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border rounded-xl overflow-hidden">
          <div className="grid grid-cols-8 border-b">
            <div className="p-4 border-r" />
            {days.map(day => (
              <div
                key={day}
                className="p-4 text-sm font-medium text-center border-r"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-8">
            <div className="border-r">
              {hours.map(hour => (
                <div
                  key={hour}
                  className="h-20 border-b p-2 text-xs text-gray-500"
                >
                  {format(new Date().setHours(hour), 'ha')}
                </div>
              ))}
            </div>

            {days.map(day => (
              <div key={day} className="border-r">
                {hours.map(hour => (
                  <div key={hour} className="h-20 border-b" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}