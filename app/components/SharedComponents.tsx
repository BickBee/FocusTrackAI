import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

export const Header = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const { logout } = useAuth();

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleLogout = () => {
        logout();
        router.replace('/');
    };

    return (
        <View style={styles.header}>
            <View>
                <Text style={styles.headerTitle}>Demo Parent</Text>
                <Text style={styles.headerTime}>
                    {currentTime.toLocaleTimeString()}
                </Text>
            </View>
            <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
                    <MaterialIcons name="logout" size={24} color="#666666" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export const ChildSelector = ({ selectedChild, onChildSelect }: { 
    selectedChild: number;
    onChildSelect: (index: number) => void;
}) => {
    const { user } = useAuth();

    return (
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
                        onPress={() => onChildSelect(index)}
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
};

export const ContentCard = ({ title, children }: {
    title: string;
    children: React.ReactNode;
}) => (
    <Card style={styles.card}>
        <Card.Title titleStyle={styles.cardTitle} title={title} />
        <Card.Content>
            {children}
        </Card.Content>
    </Card>
);

export const styles = StyleSheet.create({
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
    card: {
        margin: 16,
        marginTop: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666666',
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
    cardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333333',
    },
}); 