export interface Phase {
  id: string;
  title: string;
  description?: string;
  targetDate?: Date;
  completed: boolean;
  subgoals: Subgoal[];
}

export interface Subgoal {
  id: string;
  title: string;
  completed: boolean;
}

export interface RecurringSession {
  id: string;
  title: string;
  days: string[];
  startTime: string;
  endTime: string;
  completions?: {
    date: string;
    completed: boolean;
    notes?: string;
  }[];
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  taskCount: number;
  progress: number;
  collaborators: number;
  color: string;
  startDate?: Date;
  endDate?: Date;
  phases: Phase[];
  recurringSessions: RecurringSession[];
  mvg: {
    description: string;
    completed: boolean;
    completionHistory?: {
      date: string;
      completed: boolean;
    }[];
    streak: number;
  };
  nextAction?: string;
}