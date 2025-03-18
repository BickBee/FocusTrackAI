import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { websocketService } from '../services/websocket';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { CurrentSession } from '../types';

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<CurrentSession[]>([]);
  const [selectedChild, setSelectedChild] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const handleUpdate = (data: any) => {
      if (user?.children[selectedChild]) {
        const childId = user.children[selectedChild].id;
        setSessions(data.sessionHistory[childId] || []);
        setIsLoading(false);
      }
    };

    websocketService.subscribe('update', handleUpdate);

    return () => {
      websocketService.unsubscribe('update', handleUpdate);
    };
  }, [selectedChild]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFocusColor = (level: string) => {
    switch (level) {
      case 'High':
        return '#4CAF50';
      case 'Medium':
        return '#FFC107';
      case 'Low':
        return '#F44336';
      default:
        return '#666666';
    }
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
            onPress={() => {
              setIsLoading(true);
              setSelectedChild(index);
            }}
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
      <Text style={styles.loadingText}>Loading study history...</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="history" size={48} color="#666666" />
      <Text style={styles.emptyStateText}>No study sessions yet</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {renderChildSelector()}
      
      <View style={styles.header}>
        <Text style={styles.title}>Study History</Text>
        <Text style={styles.subtitle}>
          {sessions.length} completed sessions
        </Text>
      </View>

      {isLoading ? (
        renderLoadingState()
      ) : sessions.length === 0 ? (
        renderEmptyState()
      ) : (
        sessions.map((session) => (
          <View key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionDate}>
                {formatDate(session.startTime)}
              </Text>
              <View style={styles.sessionDuration}>
                <MaterialIcons name="timer" size={16} color="#666666" />
                <Text style={styles.durationText}>{session.duration}</Text>
              </View>
            </View>

            <View style={styles.sessionDetails}>
              <View style={styles.detailItem}>
                <MaterialIcons
                  name="psychology"
                  size={20}
                  color={getFocusColor(session.focusLevel)}
                />
                <Text style={[styles.detailText, { color: getFocusColor(session.focusLevel) }]}>
                  {session.focusLevel} Focus
                </Text>
              </View>

              <View style={styles.detailItem}>
                <MaterialIcons name="warning" size={20} color="#FFC107" />
                <Text style={styles.detailText}>
                  {session.distractions} Distractions
                </Text>
              </View>
            </View>

            {session.alerts.length > 0 && (
              <View style={styles.alertsContainer}>
                <Text style={styles.alertsTitle}>Session Alerts</Text>
                {session.alerts.map((alert) => (
                  <View key={alert.id} style={styles.alertItem}>
                    <MaterialIcons
                      name={alert.type === 'distraction' ? 'warning' : 'timer'}
                      size={16}
                      color={alert.type === 'distraction' ? '#FFC107' : '#4CAF50'}
                    />
                    <Text style={styles.alertText}>{alert.message}</Text>
                    <Text style={styles.alertTime}>{alert.time}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  sessionCard: {
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
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  sessionDuration: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    marginLeft: 4,
    color: '#666666',
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
  },
  alertsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  alertsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666666',
    marginBottom: 8,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333333',
  },
  alertTime: {
    fontSize: 12,
    color: '#666666',
  },
}); 