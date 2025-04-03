import axios from 'axios';

// Types
export interface VolunteerActivity {
    id: string;
    title: string;
    date: string;
    hours: number;
    organization: string;
    category: string;
    status: 'completed' | 'pending' | 'verified';
}

export interface VolunteerMetrics {
    totalHours: number;
    activitiesCompleted: number;
    categorySummary: Record<string, number>;
    recentActivities: VolunteerActivity[];
}

export interface VolunteerPosting {
    id: string;
    title: string;
    organization: string;
    description: string;
    date: string;
    duration: number;
    location: string;
    category: string;
    spotsAvailable: number;
}

// Mock data
const mockVolunteerMetrics: VolunteerMetrics = {
    totalHours: 75,
    activitiesCompleted: 12,
    categorySummary: {
        'Environmental': 20,
        'Education': 30,
        'Community Service': 25
    },
    recentActivities: [
        {
            id: '1',
            title: 'Beach Cleanup',
            date: '2024-03-15',
            hours: 4,
            organization: 'Ocean Guardians',
            category: 'Environmental',
            status: 'verified'
        },
        {
            id: '2',
            title: 'Math Tutoring',
            date: '2024-03-10',
            hours: 2,
            organization: 'Local High School',
            category: 'Education',
            status: 'verified'
        }
    ]
};

const mockVolunteerPostings: VolunteerPosting[] = [
    {
        id: '1',
        title: 'Library Reading Program',
        organization: 'City Library',
        description: 'Help young children improve their reading skills',
        date: '2024-04-15',
        duration: 2,
        location: 'Main Library',
        category: 'Education',
        spotsAvailable: 5
    },
    {
        id: '2',
        title: 'Food Bank Distribution',
        organization: 'Community Food Bank',
        description: 'Help sort and distribute food to those in need',
        date: '2024-04-20',
        duration: 3,
        location: 'Food Bank Warehouse',
        category: 'Community Service',
        spotsAvailable: 10
    }
];

export class VoluTrackService {
    private readonly baseUrl = 'https://api.volunteertracker.com/v1';
    private readonly authToken: string;

    constructor(authToken: string) {
        this.authToken = authToken;
    }

    async getStudentMetrics(studentId: string): Promise<VolunteerMetrics> {
        // In a real implementation, this would make an API call
        // For now, return mock data
        return mockVolunteerMetrics;
    }

    async getVolunteerPostings(): Promise<VolunteerPosting[]> {
        // In a real implementation, this would make an API call
        // For now, return mock data
        return mockVolunteerPostings;
    }

    // Helper method to format the authorization header
    private getHeaders() {
        return {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
        };
    }
}

// Export a singleton instance with a mock token
export const voluTrackService = new VoluTrackService('mock-oauth-token'); 