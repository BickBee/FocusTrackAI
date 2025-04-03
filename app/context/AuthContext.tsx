import React, { createContext, useContext, useState, useEffect } from 'react';
import { ChildSettings } from '../types';

// Mock user data
const MOCK_USERS = [
  {
    id: '1',
    email: 'parent@demo.com',
    password: 'demo123',
    name: 'Demo Parent',
    children: [
      {
        id: 'child1',
        name: 'Alex Thompson',
        grade: '11th Grade',
        dailyGoal: 120,
        weeklyGoal: 600,
        breakReminders: true,
        distractionAlerts: true,
        emailReports: true,
      },
      {
        id: 'child2',
        name: 'Sarah Thompson',
        grade: '9th Grade',
        dailyGoal: 90,
        weeklyGoal: 450,
        breakReminders: true,
        distractionAlerts: true,
        emailReports: false,
      },
      {
        id: 'child3',
        name: 'Michael Thompson',
        grade: '7th Grade',
        dailyGoal: 60,
        weeklyGoal: 300,
        breakReminders: true,
        distractionAlerts: true,
        emailReports: true,
      },
    ],
  },
];

type User = {
  id: string;
  email: string;
  name: string;
  children: ChildSettings[];
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock login - in a real app, this would make an API call
    if (email === 'parent@demo.com' && password === 'demo123') {
      setUser({
        id: '1',
        email: 'parent@demo.com',
        name: 'Demo Parent',
        children: MOCK_USERS[0].children,
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 