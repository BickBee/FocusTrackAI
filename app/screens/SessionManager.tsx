import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { websocketService } from '../services/websocket';
import { ScheduledSession, CurrentSession } from '../types';

export default function SessionManager() {
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([]);
  const [currentSessions, setCurrentSessions] = useState<CurrentSession[]>([]);
  const [selectedChild, setSelectedChild] = useState(0);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CurrentSession | null>(null);
  const [newNote, setNewNote] = useState('');
  const [newSchedule, setNewSchedule] = useState<Partial<ScheduledSession>>({
    subject: '',
    startTime: new Date(),
    duration: 60,
    isRecurring: false,
  });
  const [selectedChildForSchedule, setSelectedChildForSchedule] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleUpdate = (data: any) => {
      setScheduledSessions(data.scheduledSessions || []);
      setCurrentSessions(data.currentSessions || []);
    };

    websocketService.subscribe('update', handleUpdate);

    return () => {
      websocketService.unsubscribe('update', handleUpdate);
    };
  }, []);

  const handleScheduleSession = () => {
    if (!newSchedule.subject || !newSchedule.startTime || !newSchedule.duration || !selectedChildForSchedule) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const session: ScheduledSession = {
        id: Date.now().toString(),
        childId: selectedChildForSchedule,
        subject: newSchedule.subject,
        startTime: newSchedule.startTime,
        duration: newSchedule.duration,
        notes: newSchedule.notes,
        isRecurring: newSchedule.isRecurring || false,
        recurringDays: newSchedule.recurringDays,
      };

      websocketService.scheduleSession(session);
      
      // Show success message
      Alert.alert('Success', 'Session scheduled successfully');
      
      // Reset form
      setShowScheduleModal(false);
      setNewSchedule({
        subject: '',
        startTime: new Date(),
        duration: 60,
        isRecurring: false,
      });
      setSelectedChildForSchedule('');
    } catch (error) {
      console.error('Error scheduling session:', error);
      Alert.alert('Error', 'An error occurred while scheduling the session');
    }
  };

  const handleAddNote = () => {
    if (!selectedSession || !newNote.trim()) return;

    const note = {
      id: Date.now().toString(),
      sessionId: selectedSession.id,
      content: newNote.trim(),
      timestamp: new Date(),
    };

    websocketService.addSessionNote(selectedSession.id, note);
    setShowNotesModal(false);
    setNewNote('');
  };

  const getChildName = (childId: string) => {
    return user?.children.find(child => child.id === childId)?.name || 'Unknown Child';
  };

  const renderScheduleModal = () => (
    <Modal
      visible={showScheduleModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Schedule Study Session</Text>
          
          <Text style={styles.label}>Select Child</Text>
          <View style={styles.childSelector}>
            {user?.children.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={[
                  styles.childButton,
                  selectedChildForSchedule === child.id && styles.selectedChild,
                ]}
                onPress={() => setSelectedChildForSchedule(child.id)}
              >
                <Text style={[
                  styles.childButtonText,
                  selectedChildForSchedule === child.id && styles.selectedChildText,
                ]}>
                  {child.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Subject"
            value={newSchedule.subject}
            onChangeText={(text) => setNewSchedule({ ...newSchedule, subject: text })}
          />

          <Text style={styles.label}>Select Date & Time</Text>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateTimeButtonText}>
              {newSchedule.startTime ? newSchedule.startTime.toLocaleString() : 'Select Date & Time'}
            </Text>
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={newSchedule.startTime || new Date()}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) setNewSchedule({ ...newSchedule, startTime: date });
              }}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Duration (minutes)"
            value={newSchedule.duration?.toString()}
            onChangeText={(text) => setNewSchedule({ ...newSchedule, duration: parseInt(text) || 60 })}
            keyboardType="numeric"
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Notes (optional)"
            value={newSchedule.notes}
            onChangeText={(text) => setNewSchedule({ ...newSchedule, notes: text })}
            multiline
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowScheduleModal(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleScheduleSession}
            >
              <Text style={styles.buttonText}>Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderNotesModal = () => (
    <Modal
      visible={showNotesModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Session Notes</Text>
          
          <ScrollView style={styles.notesList}>
            {selectedSession?.notes.map((note) => (
              <View key={note.id} style={styles.noteItem}>
                <Text style={styles.noteContent}>{note.content}</Text>
                <Text style={styles.noteTime}>
                  {new Date(note.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </ScrollView>

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add a note..."
            value={newNote}
            onChangeText={setNewNote}
            multiline
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowNotesModal(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleAddNote}
            >
              <Text style={styles.buttonText}>Add Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Study Sessions</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowScheduleModal(true)}
        >
          <MaterialIcons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Sessions</Text>
        {currentSessions.map((session) => (
          <TouchableOpacity
            key={session.id}
            style={styles.sessionCard}
            onPress={() => {
              setSelectedSession(session);
              setShowNotesModal(true);
            }}
          >
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionSubject}>
                {getChildName(session.childId)} - {session.subject || 'Study Session'}
              </Text>
              <Text style={styles.sessionDuration}>{session.duration}</Text>
            </View>
            <View style={styles.sessionDetails}>
              <Text style={styles.sessionFocus}>
                Focus: {session.focusLevel}
              </Text>
              <Text style={styles.sessionDistractions}>
                Distractions: {session.distractions}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scheduled Sessions</Text>
        {scheduledSessions.map((session) => (
          <View key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionSubject}>
                {getChildName(session.childId)} - {session.subject}
              </Text>
              <Text style={styles.sessionTime}>
                {new Date(session.startTime).toLocaleString()}
              </Text>
            </View>
            <Text style={styles.sessionDuration}>
              Duration: {session.duration} minutes
            </Text>
            {session.notes && (
              <Text style={styles.sessionNotes}>{session.notes}</Text>
            )}
          </View>
        ))}
      </View>

      {renderScheduleModal()}
      {renderNotesModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    backgroundColor: '#4CAF50',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 8,
  },
  sessionSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  sessionDuration: {
    fontSize: 14,
    color: '#666666',
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sessionFocus: {
    fontSize: 14,
    color: '#4CAF50',
  },
  sessionDistractions: {
    fontSize: 14,
    color: '#FFC107',
  },
  sessionTime: {
    fontSize: 14,
    color: '#666666',
  },
  sessionNotes: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notesList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  noteItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  noteContent: {
    fontSize: 14,
    color: '#333333',
  },
  noteTime: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  label: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
  },
  childSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  childButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
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
  dateTimeButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  dateTimeButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 