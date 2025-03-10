import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useAuthStore } from './stores/auth-store';
import { useProjectStore } from './stores/project-store';
import { useHabitStore } from './stores/habit-store';

// Initialize the application by checking authentication and fetching data
const initializeApp = async () => {
  const { checkAuth } = useAuthStore.getState();
  const { fetchProjects } = useProjectStore.getState();
  const { fetchHabits } = useHabitStore.getState();
  
  // Check if the user is authenticated
  await checkAuth();
  
  // If authenticated, fetch projects and habits
  const user = useAuthStore.getState().user;
  if (user) {
    await Promise.all([
      fetchProjects(),
      fetchHabits()
    ]);
  }
  
  // Render the application
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Start the application
initializeApp();
