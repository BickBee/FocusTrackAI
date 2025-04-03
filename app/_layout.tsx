import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const router = useRouter();

    return (
        <SafeAreaProvider>
            <AuthProvider>
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
                                    style={{ marginLeft: 16 }}
                                    onPress={() => router.back()}
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
                            title: 'Login',
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="(tabs)"
                        options={{
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="screens"
                        options={{
                            headerShown: true,
                            title: 'Settings',
                        }}
                    />
                </Stack>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
