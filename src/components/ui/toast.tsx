import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  isVisible: boolean;
  onClose: () => void;
}

export function Toast({ 
  message, 
  type = 'success', 
  duration = 3000, 
  isVisible, 
  onClose 
}: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'info':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-white dark:bg-gray-800';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50"
        >
          <div
            className={`${getBgColor()} flex items-center gap-3 rounded-lg shadow-lg border px-4 py-3 min-w-[300px]`}
            role="alert"
          >
            {getIcon()}
            <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>
            <button
              className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// This context will help manage toast notifications globally
export function useToast() {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'error' | 'info'>('success');
  const [duration, setDuration] = useState(3000);

  const showToast = (
    newMessage: string,
    newType: 'success' | 'error' | 'info' = 'success',
    newDuration = 3000
  ) => {
    setMessage(newMessage);
    setType(newType);
    setDuration(newDuration);
    setIsVisible(true);
  };

  const hideToast = () => {
    setIsVisible(false);
  };

  return {
    showToast,
    hideToast,
    toastProps: {
      message,
      type,
      duration,
      isVisible,
      onClose: hideToast
    }
  };
} 