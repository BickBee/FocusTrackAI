import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Button } from 'react-native-paper';
import { smartParkService, ParkingLot, ParkingReservation } from '../integrations/smartpark';
import { useAuth } from '../context/AuthContext';
import { ChildSelector, ContentCard, Header, styles as sharedStyles } from './SharedComponents';
import { MaterialIcons } from '@expo/vector-icons';

interface ParkingSpace {
    id: string;
    number: string;
    isOccupied: boolean;
    reservedBy?: string;
}

export const SmartParkView = () => {
    const { user } = useAuth();
    const [selectedChild, setSelectedChild] = useState<number>(0);
    const [lots, setLots] = useState<ParkingLot[]>([]);
    const [reservations, setReservations] = useState<ParkingReservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
    const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
    const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [cardNumber, setCardNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cvv, setCvv] = useState('');

    useEffect(() => {
        loadData();
    }, [selectedChild]);

    const loadData = async () => {
        try {
            const childId = user?.children[selectedChild]?.id;
            if (childId) {
                const [lotsData, reservationsData] = await Promise.all([
                    smartParkService.getAvailableLots(),
                    smartParkService.getReservations(childId)
                ]);
                setLots(lotsData);
                setReservations(reservationsData);
            }
        } catch (error) {
            console.error('Error loading parking data:', error);
            Alert.alert('Error', 'Failed to load parking information');
        } finally {
            setLoading(false);
        }
    };

    const handleShowSpaces = (lot: ParkingLot) => {
        setSelectedLot(lot);
        // Generate mock parking spaces for demonstration
        const spaces: ParkingSpace[] = Array.from({ length: 40 }, (_, i) => ({
            id: `space-${i + 1}`,
            number: `${String.fromCharCode(65 + Math.floor(i / 8))}${(i % 8) + 1}`,
            isOccupied: Math.random() < 0.3,
        }));
        setParkingSpaces(spaces);
        setSelectedSpace(null);
    };

    const handleSpaceSelection = (space: ParkingSpace) => {
        if (!space.isOccupied) {
            setSelectedSpace(space.id);
        }
    };

    const handleReservation = async () => {
        try {
            const childId = user?.children[selectedChild]?.id;
            if (!childId || !selectedLot || !selectedSpace) return;

            const selectedSpaceObj = parkingSpaces.find(space => space.id === selectedSpace);
            const startTime = new Date();
            startTime.setHours(startTime.getHours() + 1);
            const endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + 2);

            const reservation = await smartParkService.createReservation(
                childId,
                selectedLot.id,
                startTime.toISOString(),
                endTime.toISOString()
            );

            // Add the space number to the reservation
            const newReservation = {
                ...reservation,
                spaceNumber: selectedSpaceObj?.number
            };

            setReservations([...reservations, newReservation]);
            setSelectedLot(null);
            setSelectedSpace(null);
            Alert.alert('Success', 'Parking spot reserved successfully!');
        } catch (error) {
            console.error('Error creating reservation:', error);
            Alert.alert('Error', 'Failed to create reservation');
        }
    };

    const handleCancelReservation = async (reservationId: string) => {
        try {
            await smartParkService.cancelReservation(reservationId);
            setReservations(reservations.filter(r => r.id !== reservationId));
            Alert.alert('Success', 'Reservation cancelled successfully!');
        } catch (error) {
            console.error('Error cancelling reservation:', error);
            Alert.alert('Error', 'Failed to cancel reservation');
        }
    };

    const handlePaymentSubmit = () => {
        // Demo purposes - accept any input
        setShowPaymentModal(false);
        handleReservation();
    };

    const renderPaymentModal = () => (
        <Modal
            visible={showPaymentModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowPaymentModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Payment Details</Text>
                    <Text style={styles.modalSubtitle}>Demo Mode - Any card number will work</Text>
                    
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Card Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="1234 5678 9012 3456"
                            value={cardNumber}
                            onChangeText={setCardNumber}
                            keyboardType="numeric"
                            maxLength={19}
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.inputLabel}>Expiry Date</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="MM/YY"
                                value={expiryDate}
                                onChangeText={setExpiryDate}
                                maxLength={5}
                            />
                        </View>
                        <View style={[styles.inputContainer, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>CVV</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="123"
                                value={cvv}
                                onChangeText={setCvv}
                                keyboardType="numeric"
                                maxLength={3}
                            />
                        </View>
                    </View>

                    <View style={styles.modalButtons}>
                        <Button
                            mode="contained"
                            onPress={handlePaymentSubmit}
                            style={[styles.button, { backgroundColor: '#4CAF50', flex: 1, marginRight: 8 }]}
                            labelStyle={styles.buttonLabel}
                        >
                            Pay & Confirm
                        </Button>
                        <Button
                            mode="contained"
                            onPress={() => {
                                setShowPaymentModal(false);
                                setCardNumber('');
                                setExpiryDate('');
                                setCvv('');
                            }}
                            style={[styles.button, { backgroundColor: '#F44336', flex: 1 }]}
                            labelStyle={styles.buttonLabel}
                        >
                            Cancel
                        </Button>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderParkingLotDiagram = () => {
        if (!selectedLot || !parkingSpaces.length) return null;

        // Organize spaces into columns
        const columns = [
            parkingSpaces.slice(0, 5),     // Column 1
            parkingSpaces.slice(5, 10),    // Column 2
            parkingSpaces.slice(10, 15),   // Column 3
            parkingSpaces.slice(15, 20),   // Column 4
            parkingSpaces.slice(20, 25),   // Column 5
            parkingSpaces.slice(25, 30),   // Column 6
            parkingSpaces.slice(30, 35),   // Column 7
            parkingSpaces.slice(35, 40),   // Column 8
        ];

        return (
            <ContentCard title="Select a Parking Space">
                <ScrollView horizontal={true} style={styles.parkingLotContainer}>
                    <View style={styles.parkingLotDiagram}>
                        <View style={styles.parkingLayout}>
                            {/* Column 1 */}
                            <View style={styles.column}>
                                {columns[0].map((space) => (
                                    <TouchableOpacity
                                        key={space.id}
                                        style={[
                                            styles.parkingSpace,
                                            space.isOccupied && styles.occupiedSpace,
                                            selectedSpace === space.id && styles.selectedSpace,
                                        ]}
                                        onPress={() => handleSpaceSelection(space)}
                                        disabled={space.isOccupied}
                                    >
                                        <Text style={[
                                            styles.spaceNumber,
                                            space.isOccupied && styles.occupiedSpaceText,
                                            selectedSpace === space.id && styles.selectedSpaceText,
                                        ]}>
                                            {space.number}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Driving Lane 1 */}
                            <View style={styles.drivingLane}>
                                <MaterialIcons name="arrow-upward" size={24} color="#666666" />
                            </View>

                            {/* Columns 2-3 */}
                            <View style={styles.doubleColumnSection}>
                                <View style={styles.column}>
                                    {columns[1].map((space) => (
                                        <TouchableOpacity
                                            key={space.id}
                                            style={[
                                                styles.parkingSpace,
                                                space.isOccupied && styles.occupiedSpace,
                                                selectedSpace === space.id && styles.selectedSpace,
                                            ]}
                                            onPress={() => handleSpaceSelection(space)}
                                            disabled={space.isOccupied}
                                        >
                                            <Text style={[
                                                styles.spaceNumber,
                                                space.isOccupied && styles.occupiedSpaceText,
                                                selectedSpace === space.id && styles.selectedSpaceText,
                                            ]}>
                                                {space.number}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={styles.column}>
                                    {columns[2].map((space) => (
                                        <TouchableOpacity
                                            key={space.id}
                                            style={[
                                                styles.parkingSpace,
                                                space.isOccupied && styles.occupiedSpace,
                                                selectedSpace === space.id && styles.selectedSpace,
                                            ]}
                                            onPress={() => handleSpaceSelection(space)}
                                            disabled={space.isOccupied}
                                        >
                                            <Text style={[
                                                styles.spaceNumber,
                                                space.isOccupied && styles.occupiedSpaceText,
                                                selectedSpace === space.id && styles.selectedSpaceText,
                                            ]}>
                                                {space.number}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Driving Lane 2 */}
                            <View style={styles.drivingLane}>
                                <MaterialIcons name="arrow-upward" size={24} color="#666666" />
                            </View>

                            {/* Columns 4-5 */}
                            <View style={styles.doubleColumnSection}>
                                <View style={styles.column}>
                                    {columns[3].map((space) => (
                                        <TouchableOpacity
                                            key={space.id}
                                            style={[
                                                styles.parkingSpace,
                                                space.isOccupied && styles.occupiedSpace,
                                                selectedSpace === space.id && styles.selectedSpace,
                                            ]}
                                            onPress={() => handleSpaceSelection(space)}
                                            disabled={space.isOccupied}
                                        >
                                            <Text style={[
                                                styles.spaceNumber,
                                                space.isOccupied && styles.occupiedSpaceText,
                                                selectedSpace === space.id && styles.selectedSpaceText,
                                            ]}>
                                                {space.number}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={styles.column}>
                                    {columns[4].map((space) => (
                                        <TouchableOpacity
                                            key={space.id}
                                            style={[
                                                styles.parkingSpace,
                                                space.isOccupied && styles.occupiedSpace,
                                                selectedSpace === space.id && styles.selectedSpace,
                                            ]}
                                            onPress={() => handleSpaceSelection(space)}
                                            disabled={space.isOccupied}
                                        >
                                            <Text style={[
                                                styles.spaceNumber,
                                                space.isOccupied && styles.occupiedSpaceText,
                                                selectedSpace === space.id && styles.selectedSpaceText,
                                            ]}>
                                                {space.number}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Driving Lane 3 */}
                            <View style={styles.drivingLane}>
                                <MaterialIcons name="arrow-upward" size={24} color="#666666" />
                            </View>

                            {/* Columns 6-7 */}
                            <View style={styles.doubleColumnSection}>
                                <View style={styles.column}>
                                    {columns[5].map((space) => (
                                        <TouchableOpacity
                                            key={space.id}
                                            style={[
                                                styles.parkingSpace,
                                                space.isOccupied && styles.occupiedSpace,
                                                selectedSpace === space.id && styles.selectedSpace,
                                            ]}
                                            onPress={() => handleSpaceSelection(space)}
                                            disabled={space.isOccupied}
                                        >
                                            <Text style={[
                                                styles.spaceNumber,
                                                space.isOccupied && styles.occupiedSpaceText,
                                                selectedSpace === space.id && styles.selectedSpaceText,
                                            ]}>
                                                {space.number}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={styles.column}>
                                    {columns[6].map((space) => (
                                        <TouchableOpacity
                                            key={space.id}
                                            style={[
                                                styles.parkingSpace,
                                                space.isOccupied && styles.occupiedSpace,
                                                selectedSpace === space.id && styles.selectedSpace,
                                            ]}
                                            onPress={() => handleSpaceSelection(space)}
                                            disabled={space.isOccupied}
                                        >
                                            <Text style={[
                                                styles.spaceNumber,
                                                space.isOccupied && styles.occupiedSpaceText,
                                                selectedSpace === space.id && styles.selectedSpaceText,
                                            ]}>
                                                {space.number}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Driving Lane 4 */}
                            <View style={styles.drivingLane}>
                                <MaterialIcons name="arrow-upward" size={24} color="#666666" />
                            </View>

                            {/* Column 8 */}
                            <View style={styles.column}>
                                {columns[7].map((space) => (
                                    <TouchableOpacity
                                        key={space.id}
                                        style={[
                                            styles.parkingSpace,
                                            space.isOccupied && styles.occupiedSpace,
                                            selectedSpace === space.id && styles.selectedSpace,
                                        ]}
                                        onPress={() => handleSpaceSelection(space)}
                                        disabled={space.isOccupied}
                                    >
                                        <Text style={[
                                            styles.spaceNumber,
                                            space.isOccupied && styles.occupiedSpaceText,
                                            selectedSpace === space.id && styles.selectedSpaceText,
                                        ]}>
                                            {space.number}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Entrance/Exit area */}
                        <View style={styles.entranceArea}>
                            <Text style={styles.entranceText}>ENTRANCE/EXIT</Text>
                            <MaterialIcons name="arrow-downward" size={24} color="#666666" />
                        </View>
                    </View>
                </ScrollView>
                <Button
                    mode="contained"
                    onPress={() => setShowPaymentModal(true)}
                    disabled={!selectedSpace}
                    style={[styles.button, { backgroundColor: '#4CAF50' }]}
                    labelStyle={styles.buttonLabel}
                >
                    Confirm Reservation
                </Button>
                <Button
                    mode="contained"
                    onPress={() => {
                        setSelectedLot(null);
                        setSelectedSpace(null);
                    }}
                    style={[styles.button, { backgroundColor: '#F44336' }]}
                    labelStyle={styles.buttonLabel}
                >
                    Cancel
                </Button>
                {renderPaymentModal()}
            </ContentCard>
        );
    };

    if (!user?.children.length) {
        return (
            <View style={sharedStyles.container}>
                <Text>No children found</Text>
            </View>
        );
    }

    const selectedChildName = user.children[selectedChild]?.name || '';

    if (loading) {
        return (
            <View style={sharedStyles.loadingContainer}>
                <Text style={sharedStyles.loadingText}>Loading parking information...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={[sharedStyles.container, styles.container]}>
            <Header />
            <ChildSelector
                selectedChild={selectedChild}
                onChildSelect={setSelectedChild}
            />

            {!selectedLot ? (
                <ContentCard title={`Available Parking Lots for ${selectedChildName}`}>
                    {lots.map((lot) => (
                        <View key={lot.id} style={styles.lot}>
                            <Text style={styles.lotName}>{lot.name}</Text>
                            <Text style={styles.lotAddress}>{lot.location.address}</Text>
                            <View style={styles.lotDetails}>
                                <Text style={styles.lotInfo}>
                                    Available: {lot.availableSpaces}/{lot.totalSpaces}
                                </Text>
                                <Text style={styles.lotRate}>
                                    ${lot.hourlyRate}/hour
                                </Text>
                            </View>
                            <Button 
                                mode="contained" 
                                onPress={() => handleShowSpaces(lot)}
                                disabled={!lot.isOpen || lot.availableSpaces === 0}
                                style={[styles.button, { backgroundColor: '#4CAF50' }]}
                                labelStyle={styles.buttonLabel}
                            >
                                View Available Spaces
                            </Button>
                        </View>
                    ))}
                </ContentCard>
            ) : (
                renderParkingLotDiagram()
            )}

            <ContentCard title={`${selectedChildName}'s Reservations`}>
                {reservations.length === 0 ? (
                    <Text style={styles.noReservations}>No active reservations</Text>
                ) : (
                    reservations.map((reservation) => (
                        <View key={reservation.id} style={styles.reservation}>
                            <Text style={styles.reservationTitle}>{reservation.lotName}</Text>
                            <View style={styles.reservationDetails}>
                                <Text style={styles.reservationTime}>
                                    Start: {new Date(reservation.startTime).toLocaleString()}
                                </Text>
                                <Text style={styles.reservationTime}>
                                    End: {new Date(reservation.endTime).toLocaleString()}
                                </Text>
                                {reservation.spaceNumber && (
                                    <Text style={styles.reservationSpace}>
                                        Space Number: {reservation.spaceNumber}
                                    </Text>
                                )}
                                <Text style={styles.reservationCost}>
                                    Cost: ${reservation.cost}
                                </Text>
                            </View>
                            {reservation.status === 'active' && (
                                <Button 
                                    mode="outlined" 
                                    onPress={() => handleCancelReservation(reservation.id)}
                                    style={styles.cancelButton}
                                    textColor="red"
                                >
                                    Cancel Reservation
                                </Button>
                            )}
                        </View>
                    ))
                )}
            </ContentCard>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 0,
    },
    lot: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
    },
    lotName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333333',
    },
    lotAddress: {
        fontSize: 14,
        color: '#666666',
        marginTop: 4,
    },
    lotDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 12,
    },
    lotInfo: {
        fontSize: 14,
        color: '#666666',
    },
    lotRate: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    button: {
        marginTop: 8,
    },
    buttonLabel: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    reservation: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
    },
    reservationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333333',
    },
    reservationDetails: {
        marginTop: 8,
    },
    reservationTime: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 4,
    },
    reservationSpace: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 4,
    },
    reservationCost: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: 'bold',
        marginTop: 4,
    },
    cancelButton: {
        marginTop: 12,
        borderColor: 'red',
    },
    noReservations: {
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
        paddingVertical: 16,
    },
    parkingLotContainer: {
        maxHeight: 500,
    },
    parkingLotDiagram: {
        padding: 16,
        alignItems: 'center',
        minWidth: '100%',
    },
    parkingLayout: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    column: {
        gap: 8,
    },
    doubleColumnSection: {
        flexDirection: 'row',
        gap: 8,
    },
    drivingLane: {
        width: 40,
        backgroundColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
    },
    parkingSpace: {
        width: 50,
        height: 60,
        backgroundColor: '#E8F5E9',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    entranceArea: {
        alignItems: 'center',
        marginTop: 8,
        paddingVertical: 8,
        backgroundColor: '#E0E0E0',
        width: '100%',
        borderRadius: 4,
    },
    entranceText: {
        fontSize: 14,
        color: '#666666',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    spaceNumber: {
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    occupiedSpace: {
        backgroundColor: '#FFEBEE',
        borderColor: '#F44336',
    },
    selectedSpace: {
        backgroundColor: '#4CAF50',
        borderColor: '#2E7D32',
    },
    occupiedSpaceText: {
        color: '#F44336',
    },
    selectedSpaceText: {
        color: '#FFFFFF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 20,
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 16,
        color: '#333333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    inputRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        marginTop: 8,
    },
}); 