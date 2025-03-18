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
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for stored auth token
    const checkAuth = async () => {
      // In a real app, this would check for a valid token
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser = MOCK_USERS.find(
        u => u.email === email && u.password === password
      );

      if (mockUser) {
        const { password: _, ...userWithoutPassword } = mockUser;
        setUser(userWithoutPassword);
        return true;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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