import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card } from 'react-native-paper';
import { useAuth } from './context/AuthContext';

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.card}>
                <Card.Title title="Welcome" />
                <Card.Content>
                    <Text style={styles.welcomeText}>Welcome back, {user?.name}!</Text>
                    <Text style={styles.subtitle}>
                        Use the tabs below to access different features:
                    </Text>
                    <View style={styles.featureList}>
                        <Text style={styles.feature}>• Dashboard - Overview and main features</Text>
                        <Text style={styles.feature}>• Volunteer - Track and manage volunteer activities</Text>
                        <Text style={styles.feature}>• Parking - Manage campus parking</Text>
                    </View>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    card: {
        marginBottom: 16,
    },
    welcomeText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 12,
        color: '#666',
    },
    featureList: {
        marginTop: 8,
    },
    feature: {
        fontSize: 16,
        marginBottom: 8,
        color: '#333',
    },
}); 