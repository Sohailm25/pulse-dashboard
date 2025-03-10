import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useHabitStore } from '@/stores/habit-store';
import { Battery, BatteryLow, BatteryMedium, BatteryFull, Clock } from 'lucide-react';
import { useState } from 'react';

interface EnergyEntry {
  time: string;
  level: number;
}

export function DailyView() {
  const { habits } = useHabitStore();
  const [energyEntries, setEnergyEntries] = useState<EnergyEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(3);

  const timeOfDay = new Date().getHours();
  const periods = {
    morning: habits.filter(h => h.category === 'Physical'),
    afternoon: habits.filter(h => h.category === 'Intellectual'),
    evening: habits.filter(h => h.category === 'Spiritual')
  };

  const addEnergyEntry = () => {
    const newEntry = {
      time: format(new Date(), 'HH:mm'),
      level: selectedLevel
    };
    setEnergyEntries([...energyEntries, newEntry]);
  };

  const getEnergyIcon = (level: number) => {
    switch (level) {
      case 1: return <BatteryLow className="w-5 h-5" />;
      case 2: return <BatteryMedium className="w-5 h-5" />;
      case 3: return <Battery className="w-5 h-5" />;
      case 4: return <BatteryFull className="w-5 h-5" />;
      default: return <Battery className="w-5 h-5" />;
    }
  };

  const averageEnergy = energyEntries.length
    ? Math.round(energyEntries.reduce((sum, entry) => sum + entry.level, 0) / energyEntries.length)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{format(new Date(), 'EEEE, MMMM d')}</h2>
          <div className="text-sm text-gray-500">
            {timeOfDay < 12 ? 'Morning' : timeOfDay < 17 ? 'Afternoon' : 'Evening'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {Object.entries(periods).map(([period, habits]) => (
            <div key={period} className="space-y-4">
              <h3 className="text-lg font-medium capitalize">{period}</h3>
              <div className="space-y-2">
                {habits.map(habit => (
                  <div
                    key={habit.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                        habit.completed
                          ? 'bg-primary text-white'
                          : 'border-2 border-gray-200'
                      }`}
                    >
                      {habit.completed && '✓'}
                    </div>
                    <div>
                      <p className="font-medium">{habit.name}</p>
                      {habit.streak > 0 && (
                        <div className="flex items-center gap-1 text-orange-500 text-sm">
                          <span>🔥</span>
                          <span>{habit.streak} days</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6">
        <h3 className="text-lg font-medium mb-4">Energy Tracker</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {[1, 2, 3, 4].map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`p-3 rounded-lg flex items-center gap-2 transition-colors ${
                    selectedLevel === level
                      ? 'bg-primary text-white'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {getEnergyIcon(level)}
                  <span className="font-medium">Level {level}</span>
                </button>
              ))}
            </div>
            <button
              onClick={addEnergyEntry}
              className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Add Energy Entry
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Average Energy Today</span>
              <div className="flex items-center gap-2">
                {getEnergyIcon(averageEnergy)}
                <span className="font-medium">Level {averageEnergy}</span>
              </div>
            </div>
            <div className="space-y-2">
              {energyEntries.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{entry.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getEnergyIcon(entry.level)}
                    <span className="font-medium">Level {entry.level}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}