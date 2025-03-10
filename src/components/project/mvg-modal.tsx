import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

interface MVGModalProps {
  isOpen: boolean;
  onClose: () => void;
  mvg: {
    description: string;
    completed: boolean;
  };
  onComplete: (completed: boolean) => void;
  projectTitle: string;
}

export function MVGModal({
  isOpen,
  onClose,
  mvg,
  onComplete,
  projectTitle
}: MVGModalProps) {
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
            className="relative w-[500px] bg-white rounded-xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold">Minimum Viable Goal</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-medium mb-2">Project</h4>
                <p className="text-gray-600">{projectTitle}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Goal Description</h4>
                <p className="text-gray-600">{mvg.description}</p>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${mvg.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm text-gray-600">
                    {mvg.completed ? 'Completed' : 'Not Completed'}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onComplete(!mvg.completed)}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      mvg.completed
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {mvg.completed ? (
                      'Mark as Incomplete'
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Mark as Complete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}