import axios from 'axios';

// Types
export interface ParkingLot {
    id: string;
    name: string;
    location: {
        address: string;
        latitude: number;
        longitude: number;
    };
    totalSpaces: number;
    availableSpaces: number;
    hourlyRate: number;
    isOpen: boolean;
}

export interface ParkingReservation {
    id: string;
    studentId: string;
    lotId: string;
    lotName: string;
    startTime: string;
    endTime: string;
    status: 'active' | 'completed' | 'cancelled';
    spaceNumber?: string;
    cost: number;
}

// Mock data
const mockParkingLots: ParkingLot[] = [
    {
        id: '1',
        name: 'University Main Lot',
        location: {
            address: '123 Campus Drive',
            latitude: 42.3601,
            longitude: -71.0589
        },
        totalSpaces: 200,
        availableSpaces: 45,
        hourlyRate: 5.00,
        isOpen: true
    },
    {
        id: '2',
        name: 'Library Parking Garage',
        location: {
            address: '456 Study Street',
            latitude: 42.3602,
            longitude: -71.0590
        },
        totalSpaces: 150,
        availableSpaces: 30,
        hourlyRate: 4.00,
        isOpen: true
    }
];

const mockReservations: ParkingReservation[] = [
    {
        id: 'res_1',
        studentId: 'child1',
        lotId: '1',
        lotName: 'University Main Lot',
        startTime: '2024-04-05T09:00:00Z',
        endTime: '2024-04-05T17:00:00Z',
        status: 'active',
        spaceNumber: 'A45',
        cost: 40.00
    }
];

export class SmartParkService {
    private readonly baseUrl = 'https://api.smartpark.com';
    private readonly apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getAvailableLots(): Promise<ParkingLot[]> {
        // In a real implementation, this would make an API call
        // For now, return mock data
        return mockParkingLots;
    }

    async getReservations(studentId: string): Promise<ParkingReservation[]> {
        // In a real implementation, this would make an API call
        // For now, filter mock data by student ID
        return mockReservations.filter(res => res.studentId === studentId);
    }

    async createReservation(studentId: string, lotId: string, startTime: string, endTime: string): Promise<ParkingReservation> {
        // In a real implementation, this would make an API call
        // For now, return a mock reservation
        return {
            id: `res_${Date.now()}`,
            studentId,
            lotId,
            lotName: mockParkingLots.find(lot => lot.id === lotId)?.name || '',
            startTime,
            endTime,
            status: 'active',
            spaceNumber: 'B12',
            cost: 40.00
        };
    }

    async cancelReservation(reservationId: string): Promise<boolean> {
        // In a real implementation, this would make an API call
        // For now, return success
        return true;
    }

    async checkApiStatus(): Promise<boolean> {
        // In a real implementation, this would make an API call
        // For now, return true
        return true;
    }

    // Helper method to format the headers with API key
    private getHeaders() {
        return {
            'sp_api_key': this.apiKey,
            'Content-Type': 'application/json'
        };
    }
}

// Export a singleton instance with a mock API key
export const smartParkService = new SmartParkService('mock-api-key'); 