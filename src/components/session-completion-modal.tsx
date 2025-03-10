import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';
import type { Project, RecurringSession } from '@/types/project';
import { format } from 'date-fns';

interface SessionCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: RecurringSession;
  project: Project;
  date: Date;
  onComplete: (completed: boolean, notes?: string) => void;
}

export function SessionCompletionModal({
  isOpen,
  onClose,
  session,
  project,
  date,
  onComplete,
}: SessionCompletionModalProps) {
  const [notes, setNotes] = useState('');
  const formattedDate = format(date, 'EEEE, MMMM d');
  const existingCompletion = session.completions?.find(
    c => c.date === format(date, 'yyyy-MM-dd')
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20 }}
            className="relative w-[500px] bg-white rounded-xl shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-6 border-b ${project.color} text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{session.title}</h2>
                  <p className="text-white/80">{formattedDate}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add any notes about this session..."
                  className="w-full h-32 p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                {existingCompletion?.completed ? (
                  <button
                    onClick={() => onComplete(false)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Mark as Incomplete
                  </button>
                ) : (
                  <>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => onComplete(true, notes)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                      Complete Session
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}