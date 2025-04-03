import React from 'react';
import { View, StyleSheet } from 'react-native';
import { VolunteerActivity } from './components/VolunteerActivity';

export default function VolunteerPage() {
    return (
        <View style={styles.container}>
            <VolunteerActivity />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
}); 