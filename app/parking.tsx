import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SmartParkView } from './components/SmartParkView';

export default function ParkingPage() {
    return (
        <View style={styles.container}>
            <SmartParkView />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
}); 