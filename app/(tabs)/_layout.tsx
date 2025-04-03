import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function TabsLayout() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return null;
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopColor: '#E0E0E0',
                },
                tabBarActiveTintColor: '#4CAF50',
                tabBarInactiveTintColor: '#666666',
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="dashboard" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="volunteer"
                options={{
                    title: 'Volunteer',
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="volunteer-activism" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="parking"
                options={{
                    title: 'Parking',
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="local-parking" size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
} 