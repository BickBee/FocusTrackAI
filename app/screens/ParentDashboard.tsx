import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { websocketService } from '../services/websocket';
import { router } from 'expo-router';
import { DashboardData } from '../types';

// Initial mock data
const initialData: DashboardData = {
  currentSession: {
    id: 'empty',
    childId: '',
    startTime: new Date(),
    duration: '00:00',
    focusLevel: 'Not Started',
    distractions: 0,
    alerts: [],
    notes: [],
  },
  studyGoals: {
    daily: 120,
    weekly: 600,
    current: 0,
  },
  recentAlerts: [],
  currentSessions: [],
  sessionHistory: {},
  isInitialized: false,
  scheduledSessions: [],
};

const ParentDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChild, setSelectedChild] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user, logout } = useAuth();

  useEffect(() => {
    // Start a session for the selected child
    if (user?.children[selectedChild]) {
      websocketService.startSession(user.children[selectedChild].id);
    }

    // Subscribe to WebSocket updates
    websocketService.subscribe('update', handleWebSocketUpdate);

    return () => {
      websocketService.unsubscribe('update', handleWebSocketUpdate);
    };
  }, [selectedChild]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleWebSocketUpdate = (newData: DashboardData) => {
    if (user?.children[selectedChild]) {
      const childId = user.children[selectedChild].id;
      const childSession = newData.currentSessions.find(s => s.childId === childId);
      const childHistory = newData.sessionHistory[childId] || [];
      
      // Calculate weekly study time from history
      let weeklyStudyMinutes = 0;
      
      if (childId) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        // Sum up study time from historical sessions in the past week
        for (const session of childHistory) {
          const sessionDate = new Date(session.startTime);
          if (sessionDate >= oneWeekAgo) {
            // Convert duration from string format (mm:ss) to minutes
            const [minutes, _] = session.duration.split(':').map(Number);
            weeklyStudyMinutes += minutes;
          }
        }
        
        // Add current session time if any
        if (childSession) {
          const [minutes, _] = childSession.duration.split(':').map(Number);
          weeklyStudyMinutes += minutes;
        }
      }

      setData({
        ...newData,
        currentSession: childSession || {
          id: 'empty',
          childId,
          startTime: new Date(),
          duration: '00:00',
          focusLevel: 'Not Started',
          distractions: 0,
          alerts: [],
          notes: [],
        },
        sessionHistory: { [childId]: childHistory },
        studyGoals: {
          ...newData.studyGoals,
          // Get this child's daily/weekly goals from the user context
          daily: user.children[selectedChild].dailyGoal,
          weekly: user.children[selectedChild].weeklyGoal,
          current: newData.studyGoals.current, // Daily progress
          weeklyProgress: weeklyStudyMinutes, // Weekly progress
        }
      });
      setIsLoading(false);
    }
  };

  const handleChildSelect = (index: number) => {
    setIsLoading(true);
    setSelectedChild(index);
    // Start a new session for the selected child
    if (user?.children[index]) {
      websocketService.startSession(user.children[index].id);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: () => {
            // First disconnect the WebSocket service
            websocketService.disconnect();
            // Then logout
            logout();
            // Finally navigate to the root route (login screen)
            setTimeout(() => {
              router.replace('/');
            }, 100);
          },
        },
      ]
    );
  };

  const renderChildSelector = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.childSelectorContainer}
    >
      <View style={styles.childSelector}>
        {user?.children.map((child, index) => (
          <TouchableOpacity
            key={child.id}
            style={[
              styles.childButton,
              selectedChild === index && styles.selectedChild,
            ]}
            onPress={() => handleChildSelect(index)}
          >
            <Text style={[
              styles.childButtonText,
              selectedChild === index && styles.selectedChildText,
            ]}>
              {child.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={styles.loadingText}>Loading study data...</Text>
    </View>
  );

  const renderStatusCard = () => (
    <View style={styles.card}>
      <Text style={[styles.cardTitle, styles.headerStyle]}>Current Study Session</Text>
      <View style={styles.statusGrid}>
        <View style={styles.statusItem}>
          <MaterialIcons name="timer" size={24} color="#4CAF50" />
          <Text style={styles.statusValue}>{data?.currentSession.duration}</Text>
          <Text style={styles.statusLabel}>Duration</Text>
        </View>
        <View style={styles.statusItem}>
          <MaterialIcons name="psychology" size={24} color="#2196F3" />
          <Text style={[
            styles.statusValue,
            data?.currentSession.focusLevel === 'High' && styles.highFocus,
            data?.currentSession.focusLevel === 'Medium' && styles.mediumFocus,
            data?.currentSession.focusLevel === 'Low' && styles.lowFocus,
          ]}>
            {data?.currentSession.focusLevel}
          </Text>
          <Text style={styles.statusLabel}>Focus Level</Text>
        </View>
        <View style={styles.statusItem}>
          <MaterialIcons name="warning" size={24} color="#FFC107" />
          <Text style={styles.statusValue}>{data?.currentSession.distractions}</Text>
          <Text style={styles.statusLabel}>Distractions</Text>
        </View>
      </View>
    </View>
  );

  const renderGoalsCard = () => (
    <View style={styles.card}>
      <Text style={[styles.cardTitle, styles.headerStyle]}>Study Goals</Text>
      <View style={styles.goalsContainer}>
        <View style={styles.goalItem}>
          <Text style={styles.goalLabel}>Daily Goal</Text>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { width: `${Math.min(100, ((data?.studyGoals?.current || 0) / (data?.studyGoals?.daily || 120)) * 100)}%` }
            ]} />
          </View>
          <Text style={styles.goalValue}>{data?.studyGoals?.current || 0}/{data?.studyGoals?.daily || 120} min</Text>
        </View>
        <View style={styles.goalItem}>
          <Text style={styles.goalLabel}>Weekly Goal</Text>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { width: `${Math.min(100, ((data?.studyGoals?.weeklyProgress || 0) / (data?.studyGoals?.weekly || 600)) * 100)}%` }
            ]} />
          </View>
          <Text style={styles.goalValue}>{data?.studyGoals?.weeklyProgress || 0}/{data?.studyGoals?.weekly || 600} min</Text>
        </View>
      </View>
    </View>
  );

  const renderAlertsCard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, styles.headerStyle]}>Recent Alerts</Text>
        <TouchableOpacity onPress={() => setData(prev => prev ? { ...prev, recentAlerts: [] } : null)}>
          <MaterialIcons name="clear-all" size={24} color="#666666" />
        </TouchableOpacity>
      </View>
      {data?.recentAlerts && data.recentAlerts.length > 0 ? (
        data.recentAlerts.map((alert) => (
          <View key={alert.id} style={styles.alertItem}>
            <MaterialIcons
              name={alert.type === 'distraction' ? 'warning' : 'timer'}
              size={20}
              color={alert.type === 'distraction' ? '#FFC107' : '#4CAF50'}
            />
            <View style={styles.alertContent}>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertTime}>{alert.time}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.noAlerts}>No recent alerts</Text>
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Demo Parent</Text>
          <Text style={styles.headerTime}>
            {currentTime.toLocaleTimeString()}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => router.push('/screens/History')} 
            style={styles.headerButton}
          >
            <MaterialIcons name="history" size={24} color="#666666" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push('/screens/SessionManager')} 
            style={styles.headerButton}
          >
            <MaterialIcons name="event" size={24} color="#666666" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push('/screens/Settings')} 
            style={styles.headerButton}
          >
            <MaterialIcons name="settings" size={24} color="#666666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
            <MaterialIcons name="logout" size={24} color="#666666" />
          </TouchableOpacity>
        </View>
      </View>

      {renderChildSelector()}
      
      {isLoading ? (
        renderLoadingState()
      ) : (
        <>
          {renderStatusCard()}
          {renderGoalsCard()}
          {renderAlertsCard()}
        </>
      )}

      {/* <View style={styles.buttonContainer}>
        <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/volunteer')}
        >
            <MaterialIcons name="volunteer-activism" size={24} color="#fff" />
            <Text style={styles.buttonText}>Volunteer Activities</Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/parking')}
        >
            <MaterialIcons name="local-parking" size={24} color="#fff" />
            <Text style={styles.buttonText}>Parking</Text>
        </TouchableOpacity>
      </View> */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  headerTime: {
    fontSize: 16,
    color: '#666666',
    marginTop: 5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  childSelectorContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  childSelector: {
    flexDirection: 'row',
    padding: 16,
  },
  childButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  selectedChild: {
    backgroundColor: '#4CAF50',
  },
  childButtonText: {
    color: '#666666',
    fontWeight: '500',
  },
  selectedChildText: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  headerStyle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 8,
  },
  highFocus: {
    color: '#4CAF50',
  },
  mediumFocus: {
    color: '#FFC107',
  },
  lowFocus: {
    color: '#F44336',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  goalsContainer: {
    gap: 16,
  },
  goalItem: {
    marginBottom: 12,
  },
  goalLabel: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  goalValue: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  alertContent: {
    marginLeft: 12,
    flex: 1,
  },
  alertMessage: {
    fontSize: 16,
    color: '#333333',
  },
  alertTime: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  noAlerts: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 16,
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ParentDashboard; 