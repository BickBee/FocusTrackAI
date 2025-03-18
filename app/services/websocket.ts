import { Platform } from 'react-native';
import { Alert, CurrentSession, ScheduledSession, SessionNote } from '../types';

type StudySession = CurrentSession;

// Mock WebSocket service for demo
class WebSocketService {
  private listeners: Map<string, Set<Function>> = new Map();
  private mockDataInterval: NodeJS.Timeout | null = null;
  private currentSessions: Map<string, StudySession> = new Map();
  private sessionHistory: Map<string, StudySession[]> = new Map();
  private totalStudyTime: Map<string, number> = new Map();
  private activeChildIds: Set<string> = new Set();
  private isInitialized: boolean = false;
  private studyGoals: Map<string, { daily: number; weekly: number }> = new Map();
  private recentAlerts: Map<string, Alert[]> = new Map();
  private scheduledSessions: Map<string, ScheduledSession> = new Map();

  constructor() {
    this.initializeMockData();
    
    // Instead of clearing everything, just clear sessions and alerts
    this.currentSessions.clear();
    this.sessionHistory.clear();
    this.recentAlerts.clear();
    this.totalStudyTime.clear();
    
    // Let's keep the scheduled sessions from initializeMockData()
    // this.scheduledSessions.clear();
    
    // Apply our custom profiles
    this.setupCustomChildProfiles();
    this.startMockDataStream();
  }

  private initializeMockData() {
    // Generate 3-9 past sessions for each child
    const childIds = ['child1', 'child2', 'child3'] as const;
    const childGoals: Record<string, { daily: number; weekly: number }> = {
      'child1': { daily: 120, weekly: 600 }, // Alex
      'child2': { daily: 90, weekly: 450 },  // Sarah
      'child3': { daily: 60, weekly: 300 },  // Michael
    };
    
    childIds.forEach(childId => {
      // Initialize study goals for each child based on their settings
      this.studyGoals.set(childId, childGoals[childId]);
      
      // Initialize total study time trackers
      this.totalStudyTime.set(childId, 0);

      // Generate past sessions
      const numSessions = Math.floor(Math.random() * 7) + 3;
      const sessions: StudySession[] = [];
      
      for (let i = 0; i < numSessions; i++) {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - Math.floor(Math.random() * 7));
        startTime.setHours(Math.floor(Math.random() * 12) + 8);
        
        const duration = Math.floor(Math.random() * 7200) + 1800;
        const distractions = Math.floor(Math.random() * 5);
        
        sessions.push({
          id: `past-${Date.now()}-${i}`,
          childId,
          startTime,
          endTime: new Date(startTime.getTime() + duration * 1000),
          duration: this.formatDuration(duration),
          focusLevel: this.getFocusLevel(this.computeFocusScore(duration, distractions)),
          distractions,
          alerts: this.generateMockAlerts(startTime, duration, distractions),
          notes: [],
        });
      }
      
      this.sessionHistory.set(childId, sessions);
      this.recentAlerts.set(childId, []);

      // Generate scheduled sessions
      const numScheduledSessions = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < numScheduledSessions; i++) {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + Math.floor(Math.random() * 7) + 1);
        startTime.setHours(Math.floor(Math.random() * 12) + 8);
        
        const subjects = ['Mathematics', 'Science', 'English', 'History', 'Geography'];
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        
        const session: ScheduledSession = {
          id: `scheduled-${Date.now()}-${i}`,
          childId,
          subject,
          startTime,
          duration: Math.floor(Math.random() * 120) + 30, // 30-150 minutes
          notes: `Scheduled ${subject} study session`,
          isRecurring: Math.random() < 0.3, // 30% chance of being recurring
          recurringDays: Math.random() < 0.3 ? [1, 3, 5] : undefined, // Monday, Wednesday, Friday if recurring
        };
        
        this.scheduledSessions.set(session.id, session);
      }
    });
    
    this.isInitialized = true;
  }

  private setupCustomChildProfiles() {
    // Child 1: Alex - 4 minutes into session, 20% daily goal, 75% weekly goal, medium focus
    const child1Id = 'child1';
    const child1Goals = this.studyGoals.get(child1Id) || { daily: 120, weekly: 600 };
    
    // Create current session (4 minutes in)
    const child1Session: StudySession = {
      id: `current-${Date.now()}-${child1Id}`,
      childId: child1Id,
      startTime: new Date(Date.now() - 4 * 60 * 1000), // 4 minutes ago
      duration: '4:00',
      focusLevel: 'Medium',
      distractions: 2,
      alerts: [
        {
          id: Date.now(),
          type: 'distraction',
          message: 'Phone detected during study time',
          time: new Date(Date.now() - 2 * 60 * 1000).toLocaleTimeString(), // 2 minutes ago
        },
        {
          id: Date.now() + 1,
          type: 'distraction',
          message: 'Social media notification detected',
          time: new Date(Date.now() - 3 * 60 * 1000).toLocaleTimeString(), // 3 minutes ago
        }
      ],
      notes: [],
    };
    
    this.currentSessions.set(child1Id, child1Session);
    this.activeChildIds.add(child1Id);
    
    // Set up daily goal progress (20%)
    const dailyMinutesNeeded = Math.floor(child1Goals.daily * 0.2); // 20% of daily goal
    this.totalStudyTime.set(child1Id, 4 * 60); // 4 minutes = 240 seconds
    
    // Set up weekly goal progress (75%) by adding historical sessions
    const weeklyMinutesNeeded = Math.floor(child1Goals.weekly * 0.75); // 75% of weekly goal
    const weeklyMinutesToAdd = weeklyMinutesNeeded - dailyMinutesNeeded;
    
    // Add historical sessions to make up the rest of the weekly goal
    const history = this.sessionHistory.get(child1Id) || [];
    // Clear existing mock history
    history.length = 0;
    
    // Add several sessions across the week to reach the weekly goal
    const days = [1, 2, 3, 5]; // Days ago (yesterday, 2 days ago, etc.)
    let remainingMinutes = weeklyMinutesToAdd;
    
    days.forEach((daysAgo, index) => {
      // Calculate session duration - distribute remaining minutes across days
      const sessionMinutes = Math.floor(remainingMinutes / (days.length - index));
      remainingMinutes -= sessionMinutes;
      
      if (sessionMinutes > 0) {
        const pastSession: StudySession = {
          id: `past-${Date.now()}-${daysAgo}`,
          childId: child1Id,
          startTime: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 + sessionMinutes * 60 * 1000),
          duration: this.formatDuration(sessionMinutes * 60),
          focusLevel: 'Medium',
          distractions: Math.floor(Math.random() * 3) + 1,
          alerts: [
            {
              id: Date.now() + 100 + index,
              type: 'break',
              message: 'Time for a 5-minute break',
              time: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toLocaleTimeString(),
            },
            {
              id: Date.now() + 200 + index,
              type: 'distraction',
              message: 'Phone detected during study time',
              time: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toLocaleTimeString(),
            }
          ],
          notes: [],
        };
        history.push(pastSession);
      }
    });
    
    this.sessionHistory.set(child1Id, history);
    
    // Set up recent alerts - directly use the session alerts
    const recentAlerts = this.recentAlerts.get(child1Id) || [];
    recentAlerts.length = 0;
    child1Session.alerts.forEach(alert => recentAlerts.push(alert));
    this.recentAlerts.set(child1Id, recentAlerts);
    
    // Add scheduled sessions for Alex
    const mathSession: ScheduledSession = {
      id: `scheduled-${Date.now()}-math-alex`,
      childId: child1Id,
      subject: 'Mathematics',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      duration: 60, // 60 minutes
      notes: 'Algebra homework session',
      isRecurring: true,
      recurringDays: [1, 3, 5], // Monday, Wednesday, Friday
    };
    
    const scienceSession: ScheduledSession = {
      id: `scheduled-${Date.now()}-science-alex`,
      childId: child1Id,
      subject: 'Science',
      startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
      duration: 45, // 45 minutes
      notes: 'Physics lab preparation',
      isRecurring: false,
    };
    
    this.scheduledSessions.set(mathSession.id, mathSession);
    this.scheduledSessions.set(scienceSession.id, scienceSession);
    
    // Child 2: Sarah - 12 minutes into session, 80% daily goal, high focus
    const child2Id = 'child2';
    const child2Goals = this.studyGoals.get(child2Id) || { daily: 90, weekly: 450 };
    
    // Create current session (12 minutes in)
    const child2Session: StudySession = {
      id: `current-${Date.now()}-${child2Id}`,
      childId: child2Id,
      startTime: new Date(Date.now() - 12 * 60 * 1000), // 12 minutes ago
      duration: '12:00',
      focusLevel: 'High',
      distractions: 0,
      alerts: [
        {
          id: Date.now() + 2,
          type: 'break',
          message: 'Time for a 5-minute break',
          time: new Date().toLocaleTimeString(),
        }
      ],
      notes: [],
    };
    
    this.currentSessions.set(child2Id, child2Session);
    this.activeChildIds.add(child2Id);
    
    // Set up daily goal progress (80%)
    const child2DailyMinutes = Math.floor(child2Goals.daily * 0.8);
    this.totalStudyTime.set(child2Id, 12 * 60); // Current 12 minutes
    
    // Set up weekly goal progress (50% from earlier sessions + today's progress)
    const history2 = this.sessionHistory.get(child2Id) || [];
    history2.length = 0;
    
    // Add one session earlier today
    const earlierTodaySession: StudySession = {
      id: `past-${Date.now()}-today`,
      childId: child2Id,
      startTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      endTime: new Date(Date.now() - 4 * 60 * 60 * 1000 + (child2DailyMinutes - 12) * 60 * 1000),
      duration: this.formatDuration((child2DailyMinutes - 12) * 60),
      focusLevel: 'High',
      distractions: 0,
      alerts: [
        {
          id: Date.now() + 300,
          type: 'break',
          message: 'Time for a 5-minute break',
          time: new Date(Date.now() - 3 * 60 * 60 * 1000).toLocaleTimeString(),
        }
      ],
      notes: [],
    };
    history2.push(earlierTodaySession);
    
    // Add sessions from earlier in the week to reach 50% weekly goal
    const weeklyMinutesTarget = Math.floor(child2Goals.weekly * 0.5) - child2DailyMinutes;
    
    if (weeklyMinutesTarget > 0) {
      const pastSession: StudySession = {
        id: `past-${Date.now()}-4`,
        childId: child2Id,
        startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + weeklyMinutesTarget * 60 * 1000),
        duration: this.formatDuration(weeklyMinutesTarget * 60),
        focusLevel: 'High',
        distractions: 1,
        alerts: [
          {
            id: Date.now() + 400,
            type: 'break',
            message: 'Time for a 5-minute break',
            time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toLocaleTimeString(),
          },
          {
            id: Date.now() + 401,
            type: 'distraction',
            message: 'Brief distraction detected',
            time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 75 * 60 * 1000).toLocaleTimeString(),
          }
        ],
        notes: [],
      };
      history2.push(pastSession);
    }
    
    this.sessionHistory.set(child2Id, history2);
    
    // Set up recent alerts
    const recentAlerts2 = this.recentAlerts.get(child2Id) || [];
    recentAlerts2.length = 0;
    recentAlerts2.push(...child2Session.alerts);
    this.recentAlerts.set(child2Id, recentAlerts2);
    
    // Add scheduled sessions for Sarah
    const englishSession: ScheduledSession = {
      id: `scheduled-${Date.now()}-english-sarah`,
      childId: child2Id,
      subject: 'English',
      startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      duration: 90, // 90 minutes
      notes: 'Essay writing session',
      isRecurring: false,
    };
    
    const historySession: ScheduledSession = {
      id: `scheduled-${Date.now()}-history-sarah`,
      childId: child2Id,
      subject: 'History',
      startTime: new Date(Date.now() + 36 * 60 * 60 * 1000), // 1.5 days from now
      duration: 60, // 60 minutes
      notes: 'Prepare for history test',
      isRecurring: true,
      recurringDays: [2, 4], // Tuesday, Thursday
    };
    
    this.scheduledSessions.set(englishSession.id, englishSession);
    this.scheduledSessions.set(historySession.id, historySession);
    
    // Child 3: Michael - No current session, 5% daily goal, low focus
    const child3Id = 'child3';
    const child3Goals = this.studyGoals.get(child3Id) || { daily: 60, weekly: 300 };
    
    // No current session for child 3
    if (this.currentSessions.has(child3Id)) {
      this.currentSessions.delete(child3Id);
      this.activeChildIds.delete(child3Id);
    }
    
    // Set up daily goal progress (5%)
    const child3DailyMinutes = Math.floor(child3Goals.daily * 0.05);
    this.totalStudyTime.set(child3Id, child3DailyMinutes * 60);
    
    // Set up history with one short, poor session today
    const history3 = this.sessionHistory.get(child3Id) || [];
    history3.length = 0;
    
    // Add one short session today
    const shortSession: StudySession = {
      id: `past-${Date.now()}-short`,
      childId: child3Id,
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      endTime: new Date(Date.now() - 2 * 60 * 60 * 1000 + child3DailyMinutes * 60 * 1000),
      duration: this.formatDuration(child3DailyMinutes * 60),
      focusLevel: 'Low',
      distractions: 4,
      alerts: [
        {
          id: Date.now() + 500,
          type: 'distraction',
          message: 'Playing games during study time',
          time: new Date(Date.now() - 2 * 60 * 60 * 1000 + 1 * 60 * 1000).toLocaleTimeString(),
        },
        {
          id: Date.now() + 501,
          type: 'distraction',
          message: 'Text message interruption',
          time: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2 * 60 * 1000).toLocaleTimeString(),
        },
        {
          id: Date.now() + 502,
          type: 'distraction',
          message: 'Social media browsing detected',
          time: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2.5 * 60 * 1000).toLocaleTimeString(),
        },
        {
          id: Date.now() + 503,
          type: 'distraction',
          message: 'YouTube video watching detected',
          time: new Date(Date.now() - 2 * 60 * 60 * 1000 + 3 * 60 * 1000).toLocaleTimeString(),
        }
      ],
      notes: [],
    };
    history3.push(shortSession);
    
    // Add another poor session from earlier in the week (10% of weekly goal)
    const weeklyMinutes = Math.floor(child3Goals.weekly * 0.1);
    const poorSession: StudySession = {
      id: `past-${Date.now()}-poor`,
      childId: child3Id,
      startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      endTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + weeklyMinutes * 60 * 1000),
      duration: this.formatDuration(weeklyMinutes * 60),
      focusLevel: 'Low',
      distractions: 3,
      alerts: [
        {
          id: Date.now() + 600,
          type: 'distraction',
          message: 'Multiple distractions detected',
          time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toLocaleTimeString(),
        }
      ],
      notes: [],
    };
    history3.push(poorSession);
    this.sessionHistory.set(child3Id, history3);
    
    // Set up recent alerts from the short session
    const recentAlerts3 = this.recentAlerts.get(child3Id) || [];
    recentAlerts3.length = 0;
    recentAlerts3.push(...shortSession.alerts);
    this.recentAlerts.set(child3Id, recentAlerts3);
    
    // Add scheduled session for Michael (just one, since he's struggling)
    const mathTutoringSession: ScheduledSession = {
      id: `scheduled-${Date.now()}-math-michael`,
      childId: child3Id,
      subject: 'Mathematics',
      startTime: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
      duration: 30, // 30 minutes
      notes: 'Math tutoring session',
      isRecurring: false,
    };
    
    this.scheduledSessions.set(mathTutoringSession.id, mathTutoringSession);
  }

  private generateMockAlerts(startTime: Date, duration: number, distractions: number): Alert[] {
    const alerts: Alert[] = [];
    const sessionEnd = new Date(startTime.getTime() + duration * 1000);
    
    // Add break alerts every 45 minutes
    let currentTime = new Date(startTime);
    while (currentTime < sessionEnd) {
      currentTime.setMinutes(currentTime.getMinutes() + 45);
      if (currentTime < sessionEnd) {
        alerts.push({
          id: Date.now() + alerts.length,
          type: 'break' as const,
          message: 'Time for a 5-minute break',
          time: currentTime.toLocaleTimeString(),
        });
      }
    }
    
    // Add distraction alerts
    for (let i = 0; i < distractions; i++) {
      const randomTime = new Date(startTime.getTime() + Math.random() * duration * 1000);
      alerts.push({
        id: Date.now() + alerts.length,
        type: 'distraction' as const,
        message: 'Phone detected during study time',
        time: randomTime.toLocaleTimeString(),
      });
    }
    
    return alerts;
  }

  private startMockDataStream() {
    // Simulate real-time data updates
    this.mockDataInterval = setInterval(() => {
      this.updateAllSessions();
      this.notifyListeners('update', this.getCurrentData());
    }, 1000); // Update every second for real-time feel
  }

  private updateAllSessions() {
    // Update each child's session
    this.currentSessions.forEach((session, childId) => {
      this.updateSession(childId);
    });
  }

  private updateSession(childId: string) {
    const session = this.currentSessions.get(childId);
    if (!session) return;

    // Preserve original focus level for custom profiles
    const originalFocusLevel = session.focusLevel;

    // Update elapsed time
    const elapsedSeconds = Math.floor((new Date().getTime() - session.startTime.getTime()) / 1000);
    session.duration = this.formatDuration(elapsedSeconds);

    // Update total study time for this child
    const currentTotal = this.totalStudyTime.get(childId) || 0;
    this.totalStudyTime.set(childId, currentTotal + 1);

    // Only compute focus level for non-custom sessions
    // For custom profiles, maintain their original focus level
    if (childId === 'child1') {
      session.focusLevel = 'Medium';
    } else if (childId === 'child2') {
      session.focusLevel = 'High';
    } else if (childId === 'child3') {
      session.focusLevel = 'Low';
    } else {
      // Compute focus level based on duration and distractions
      const focusScore = this.computeFocusScore(elapsedSeconds, session.distractions);
      session.focusLevel = this.getFocusLevel(focusScore);
    }

    // Add break alerts every 45 minutes, but respect custom profiles
    if (elapsedSeconds % 2700 === 0) {
      const alert: Alert = {
        id: Date.now(),
        type: 'break',
        message: 'Time for a 5-minute break',
        time: new Date().toLocaleTimeString(),
      };
      session.alerts.push(alert);
      
      // Update recent alerts for this child
      const childAlerts = this.recentAlerts.get(childId) || [];
      childAlerts.unshift(alert);
      if (childAlerts.length > 10) childAlerts.pop(); // Keep only last 10 alerts
      this.recentAlerts.set(childId, childAlerts);
    }
  }

  private computeFocusScore(duration: number, distractions: number): number {
    // Base score starts at 100
    let score = 100;
    
    // Deduct points for distractions (each distraction reduces score by 10)
    score -= distractions * 10;
    
    // Add points for sustained study time (bonus points after 30 minutes)
    if (duration > 1800) { // 30 minutes
      score += Math.min(20, Math.floor((duration - 1800) / 300)); // Max 20 bonus points
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private getFocusLevel(score: number): 'High' | 'Medium' | 'Low' | 'Not Started' {
    if (score >= 80) return 'High';
    if (score >= 50) return 'Medium';
    if (score > 0) return 'Low';
    return 'Not Started';
  }

  private endSession(childId: string) {
    const session = this.currentSessions.get(childId);
    if (session) {
      session.endTime = new Date();
      const history = this.sessionHistory.get(childId) || [];
      history.push(session);
      this.sessionHistory.set(childId, history);
      this.currentSessions.delete(childId);
      this.activeChildIds.delete(childId);
    }
  }

  public startSession(childId: string) {
    // Only start a new session if there isn't one already active
    if (!this.currentSessions.has(childId) && !this.activeChildIds.has(childId)) {
      // Randomly decide if we should start a new session (30% chance)
      if (Math.random() < 0.3) {
        const newSession: StudySession = {
          id: Date.now().toString(),
          childId,
          startTime: new Date(),
          duration: '00:00',
          focusLevel: 'Not Started',
          distractions: 0,
          alerts: [],
          notes: [],
        };
        this.currentSessions.set(childId, newSession);
        this.activeChildIds.add(childId);
      }
    }
  }

  public scheduleSession(session: ScheduledSession) {
    try {
      console.log('Scheduling session:', session);
      // Ensure the ID is set
      if (!session.id) {
        session.id = `scheduled-${Date.now()}`;
      }
      // Add to scheduled sessions map
      this.scheduledSessions.set(session.id, session);
      // Notify UI of update
      this.notifyListeners('update', this.getCurrentData());
      return true;
    } catch (error) {
      console.error('Error in scheduleSession:', error);
      return false;
    }
  }

  public addSessionNote(sessionId: string, note: SessionNote) {
    const session = this.currentSessions.get(sessionId);
    if (session) {
      session.notes.push(note);
      this.notifyListeners('update', this.getCurrentData());
    }
  }

  private getCurrentData() {
    const currentSessions = Array.from(this.currentSessions.values());
    const sessionHistory = Array.from(this.sessionHistory.entries()).reduce((acc, [childId, sessions]) => {
      acc[childId] = sessions;
      return acc;
    }, {} as Record<string, StudySession[]>);

    // Get current child's data
    const currentChildId = currentSessions[0]?.childId;
    const currentChildGoals = currentChildId ? this.studyGoals.get(currentChildId) : { daily: 120, weekly: 600 };
    const currentChildAlerts = currentChildId ? this.recentAlerts.get(currentChildId) || [] : [];
    
    // Calculate study times
    let dailyStudyMinutes = 0;
    let weeklyStudyMinutes = 0;
    
    if (currentChildId) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const childSessions = this.sessionHistory.get(currentChildId) || [];
      
      // Process historical sessions
      for (const session of childSessions) {
        const sessionDate = new Date(session.startTime);
        
        // Convert duration from string format (mm:ss) to minutes
        const [minutes, _] = session.duration.split(':').map(Number);
        
        // Add to weekly total if within past week
        if (sessionDate >= oneWeekAgo) {
          weeklyStudyMinutes += minutes;
          
          // Add to daily total if from today
          if (sessionDate >= today) {
            dailyStudyMinutes += minutes;
          }
        }
      }
      
      // Add current session time
      const currentSessionMinutes = Math.floor((this.totalStudyTime.get(currentChildId) || 0) / 60);
      dailyStudyMinutes += currentSessionMinutes;
      weeklyStudyMinutes += currentSessionMinutes;
      
      // Use override values for specific children
      if (currentChildId === 'child1') {
        dailyStudyMinutes = Math.floor((currentChildGoals?.daily || 120) * 0.2); // 20% of daily
        weeklyStudyMinutes = Math.floor((currentChildGoals?.weekly || 600) * 0.75); // 75% of weekly
      } else if (currentChildId === 'child2') {
        dailyStudyMinutes = Math.floor((currentChildGoals?.daily || 90) * 0.8); // 80% of daily
        weeklyStudyMinutes = Math.floor((currentChildGoals?.weekly || 450) * 0.5); // 50% of weekly
      } else if (currentChildId === 'child3') {
        dailyStudyMinutes = Math.floor((currentChildGoals?.daily || 60) * 0.05); // 5% of daily
        weeklyStudyMinutes = Math.floor((currentChildGoals?.weekly || 300) * 0.1); // 10% of weekly
      }
    }

    return {
      currentSessions,
      studyGoals: {
        daily: currentChildGoals?.daily || 120,
        weekly: currentChildGoals?.weekly || 600,
        current: currentChildId === 'child1' || currentChildId === 'child2' || currentChildId === 'child3' 
          ? dailyStudyMinutes // For custom profiles, show daily progress in the UI
          : weeklyStudyMinutes, // For other children, show weekly progress
        weeklyProgress: weeklyStudyMinutes, // Always include the weekly progress
      },
      recentAlerts: currentChildAlerts,
      sessionHistory,
      isInitialized: this.isInitialized,
      scheduledSessions: Array.from(this.scheduledSessions.values()),
    };
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  public subscribe(type: string, callback: Function) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(callback);
  }

  public unsubscribe(type: string, callback: Function) {
    this.listeners.get(type)?.delete(callback);
  }

  private notifyListeners(type: string, data: any) {
    this.listeners.get(type)?.forEach(callback => callback(data));
  }

  public disconnect() {
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
    }
  }

  public clearAlerts(childId: string) {
    this.recentAlerts.set(childId, []);
  }

  public updateStudyGoals(childId: string, daily: number, weekly: number) {
    this.studyGoals.set(childId, { daily, weekly });
    // Notify listeners of the update so the UI refreshes
    this.notifyListeners('update', this.getCurrentData());
  }
}

export const websocketService = new WebSocketService(); 