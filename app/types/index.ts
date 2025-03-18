export type Alert = {
  id: number;
  type: 'distraction' | 'break';
  message: string;
  time: string;
};

export type SessionNote = {
  id: string;
  sessionId: string;
  content: string;
  timestamp: Date;
};

export type ScheduledSession = {
  id: string;
  childId: string;
  subject: string;
  startTime: Date;
  duration: number; // in minutes
  notes?: string;
  isRecurring: boolean;
  recurringDays?: number[]; // 0-6 for Sunday-Saturday
};

export type CurrentSession = {
  id: string;
  childId: string;
  startTime: Date;
  endTime?: Date;
  duration: string;
  focusLevel: 'High' | 'Medium' | 'Low' | 'Not Started';
  distractions: number;
  alerts: Alert[];
  subject?: string;
  notes: SessionNote[];
};

export type StudyGoals = {
  daily: number;
  weekly: number;
  current: number;
  weeklyProgress?: number; // Weekly study time in minutes
};

export type DashboardData = {
  currentSessions: CurrentSession[];
  currentSession: CurrentSession;
  studyGoals: StudyGoals;
  recentAlerts: Alert[];
  sessionHistory: Record<string, CurrentSession[]>;
  isInitialized: boolean;
  scheduledSessions: ScheduledSession[];
};

export type ChildSettings = {
  id: string;
  name: string;
  grade: string;
  dailyGoal: number;
  weeklyGoal: number;
  breakReminders: boolean;
  distractionAlerts: boolean;
  emailReports: boolean;
};

export type User = {
  id: string;
  email: string;
  name: string;
  children: ChildSettings[];
}; 