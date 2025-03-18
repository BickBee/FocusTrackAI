import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      // Redirect to login if not authenticated
      router.replace('/');
    } else {
      // Redirect to dashboard if authenticated
      router.replace('/screens/ParentDashboard');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
        },
        headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerLeft: ({ canGoBack }) => 
          canGoBack ? (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 16 }}
            >
              <MaterialIcons
                name="arrow-back"
                size={24}
                color={colorScheme === 'dark' ? '#fff' : '#000'}
              />
            </TouchableOpacity>
          ) : null,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'FocusTrack AI',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="screens/ParentDashboard"
        options={{
          title: 'Dashboard',
        }}
      />
      <Stack.Screen
        name="screens/Settings"
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="screens/History"
        options={{
          title: 'Study History',
        }}
      />
      <Stack.Screen
        name="screens/SessionManager"
        options={{
          title: 'Study Sessions',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
