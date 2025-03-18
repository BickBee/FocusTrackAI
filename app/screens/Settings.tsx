import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { websocketService } from '../services/websocket';

export default function SettingsScreen() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState(0);
  const [dailyGoal, setDailyGoal] = useState('120');
  const [weeklyGoal, setWeeklyGoal] = useState('600');
  const [breakReminders, setBreakReminders] = useState(true);
  const [distractionAlerts, setDistractionAlerts] = useState(true);
  const [emailReports, setEmailReports] = useState(false);

  useEffect(() => {
    if (user?.children[selectedChild]) {
      const child = user.children[selectedChild];
      setDailyGoal(child.dailyGoal.toString());
      setWeeklyGoal(child.weeklyGoal.toString());
      setBreakReminders(child.breakReminders);
      setDistractionAlerts(child.distractionAlerts);
      setEmailReports(child.emailReports);
    }
  }, [selectedChild, user]);

  const handleSave = () => {
    if (!user || !user.children[selectedChild]) return;
    
    const childId = user.children[selectedChild].id;
    const daily = parseInt(dailyGoal);
    const weekly = parseInt(weeklyGoal);
    
    if (isNaN(daily) || isNaN(weekly)) {
      Alert.alert('Error', 'Please enter valid numbers for goals');
      return;
    }
    
    // Update study goals in the WebSocket service
    websocketService.updateStudyGoals(childId, daily, weekly);

    // In a real app, this would save to the backend
    Alert.alert('Success', 'Settings saved successfully');
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
            onPress={() => setSelectedChild(index)}
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Configure study monitoring preferences</Text>
      </View>

      {renderChildSelector()}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Study Goals</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Daily Study Goal (minutes)</Text>
          <TextInput
            style={styles.input}
            value={dailyGoal}
            onChangeText={setDailyGoal}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Weekly Study Goal (minutes)</Text>
          <TextInput
            style={styles.input}
            value={weeklyGoal}
            onChangeText={setWeeklyGoal}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monitoring Preferences</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Break Reminders</Text>
            <Text style={styles.settingDescription}>
              Send notifications for scheduled breaks
            </Text>
          </View>
          <Switch
            value={breakReminders}
            onValueChange={setBreakReminders}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={breakReminders ? '#4CAF50' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Distraction Alerts</Text>
            <Text style={styles.settingDescription}>
              Get notified when distractions are detected
            </Text>
          </View>
          <Switch
            value={distractionAlerts}
            onValueChange={setDistractionAlerts}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={distractionAlerts ? '#4CAF50' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Weekly Email Reports</Text>
            <Text style={styles.settingDescription}>
              Receive weekly study progress reports
            </Text>
          </View>
          <Switch
            value={emailReports}
            onValueChange={setEmailReports}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={emailReports ? '#4CAF50' : '#f4f3f4'}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

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
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666666',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 