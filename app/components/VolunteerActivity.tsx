import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Card, Chip, ProgressBar, Button } from 'react-native-paper';
import { voluTrackService, VolunteerMetrics, VolunteerPosting } from '../integrations/volutrack';
import { useAuth } from '../context/AuthContext';
import { ChildSelector, ContentCard, Header, styles as sharedStyles } from './SharedComponents';
import { MaterialIcons } from '@expo/vector-icons';

// Achievement badges data
const badges = {
    environmentalist: {
        name: 'Environmentalist',
        description: 'Complete 5 environmental activities',
        icon: '🌱',
        requirement: 5
    },
    educator: {
        name: 'Education Hero',
        description: 'Complete 5 education activities',
        icon: '📚',
        requirement: 5
    },
    communityHero: {
        name: 'Community Hero',
        description: 'Complete 5 community service activities',
        icon: '🤝',
        requirement: 5
    },
    hourly50: {
        name: '50 Hour Champion',
        description: 'Complete 50 hours of volunteering',
        icon: '⭐',
        requirement: 50
    }
};

// Mock data per child
const mockChildData: Record<string, { metrics: VolunteerMetrics }> = {
    'child1': {
        metrics: {
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
                    status: 'verified' as const
                }
            ]
        }
    },
    'child2': {
        metrics: {
            totalHours: 45,
            activitiesCompleted: 8,
            categorySummary: {
                'Environmental': 15,
                'Education': 20,
                'Community Service': 10
            },
            recentActivities: [
                {
                    id: '2',
                    title: 'Math Tutoring',
                    date: '2024-03-10',
                    hours: 2,
                    organization: 'Local High School',
                    category: 'Education',
                    status: 'verified' as const
                }
            ]
        }
    },
    'child3': {
        metrics: {
            totalHours: 30,
            activitiesCompleted: 5,
            categorySummary: {
                'Environmental': 10,
                'Education': 10,
                'Community Service': 10
            },
            recentActivities: [
                {
                    id: '3',
                    title: 'Food Bank Helper',
                    date: '2024-03-08',
                    hours: 3,
                    organization: 'Community Food Bank',
                    category: 'Community Service',
                    status: 'verified' as const
                }
            ]
        }
    }
};

export const VolunteerActivity = () => {
    const { user } = useAuth();
    const [selectedChild, setSelectedChild] = useState<number>(0);
    const [metrics, setMetrics] = useState<VolunteerMetrics | null>(null);
    const [postings, setPostings] = useState<VolunteerPosting[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showImpact, setShowImpact] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const childId = user?.children[selectedChild]?.id;
                if (childId) {
                    const childMetrics = mockChildData[childId as keyof typeof mockChildData]?.metrics;
                    const postingsData = await voluTrackService.getVolunteerPostings();
                    
                    if (childMetrics) {
                        setMetrics(childMetrics);
                    }
                    setPostings(postingsData);
                }
            } catch (error) {
                console.error('Error loading volunteer data:', error);
            }
        };

        if (user?.children[selectedChild]) {
            loadData();
        }
    }, [selectedChild]);

    const calculateBadges = () => {
        if (!metrics) return [];
        
        const earnedBadges = [];
        const { categorySummary, totalHours } = metrics;
        
        if (categorySummary['Environmental'] >= 5) earnedBadges.push(badges.environmentalist);
        if (categorySummary['Education'] >= 5) earnedBadges.push(badges.educator);
        if (categorySummary['Community Service'] >= 5) earnedBadges.push(badges.communityHero);
        if (totalHours >= 50) earnedBadges.push(badges.hourly50);
        
        return earnedBadges;
    };

    const calculateImpact = () => {
        if (!metrics) return null;
        
        return {
            treesPlanted: Math.floor(metrics.categorySummary['Environmental'] * 2),
            studentsHelped: Math.floor(metrics.categorySummary['Education'] * 3),
            mealsServed: Math.floor(metrics.categorySummary['Community Service'] * 10),
            carbonOffset: Math.floor(metrics.totalHours * 2.5)
        };
    };

    const filteredPostings = selectedCategory
        ? postings.filter(posting => posting.category === selectedCategory)
        : postings;

    const selectedChildName = user?.children[selectedChild]?.name || '';

    return (
        <ScrollView style={[sharedStyles.container, styles.container]}>
            <Header />
            <ChildSelector
                selectedChild={selectedChild}
                onChildSelect={setSelectedChild}
            />

            {metrics ? (
                <>
                    <ContentCard title={`${selectedChildName}'s Volunteer Summary`}>
                        <View style={styles.metricsContainer}>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricValue}>{metrics.totalHours}</Text>
                                <Text style={styles.metricLabel}>Total Hours</Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricValue}>{metrics.activitiesCompleted}</Text>
                                <Text style={styles.metricLabel}>Activities</Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.metricItem}
                                onPress={() => setShowImpact(!showImpact)}
                            >
                                <MaterialIcons name="eco" size={24} color="#4CAF50" />
                                <Text style={styles.metricLabel}>Impact</Text>
                            </TouchableOpacity>
                        </View>

                        {showImpact && (
                            <View style={styles.impactContainer}>
                                <Text style={styles.impactTitle}>Your Environmental Impact</Text>
                                <View style={styles.impactGrid}>
                                    <View style={styles.impactItem}>
                                        <Text style={styles.impactIcon}>🌳</Text>
                                        <Text style={styles.impactValue}>{calculateImpact()?.treesPlanted}</Text>
                                        <Text style={styles.impactLabel}>Trees Planted</Text>
                                    </View>
                                    <View style={styles.impactItem}>
                                        <Text style={styles.impactIcon}>📚</Text>
                                        <Text style={styles.impactValue}>{calculateImpact()?.studentsHelped}</Text>
                                        <Text style={styles.impactLabel}>Students Helped</Text>
                                    </View>
                                    <View style={styles.impactItem}>
                                        <Text style={styles.impactIcon}>🍽️</Text>
                                        <Text style={styles.impactValue}>{calculateImpact()?.mealsServed}</Text>
                                        <Text style={styles.impactLabel}>Meals Served</Text>
                                    </View>
                                    <View style={styles.impactItem}>
                                        <Text style={styles.impactIcon}>♻️</Text>
                                        <Text style={styles.impactValue}>{calculateImpact()?.carbonOffset}kg</Text>
                                        <Text style={styles.impactLabel}>Carbon Offset</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </ContentCard>

                    <ContentCard title="Achievements">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesContainer}>
                            {calculateBadges().map((badge) => (
                                <View key={badge.name} style={styles.badge}>
                                    <Text style={styles.badgeIcon}>{badge.icon}</Text>
                                    <Text style={styles.badgeName}>{badge.name}</Text>
                                    <Text style={styles.badgeDescription}>{badge.description}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </ContentCard>

                    <ContentCard title="Recent Activities">
                        <View style={styles.categoryFilters}>
                            {Object.keys(metrics.categorySummary).map((category) => (
                                <Chip
                                    key={category}
                                    selected={selectedCategory === category}
                                    onPress={() => setSelectedCategory(selectedCategory === category ? null : category)}
                                    style={styles.categoryChip}
                                >
                                    {category}
                                </Chip>
                            ))}
                        </View>

                        {metrics.recentActivities.map((activity) => (
                            <View key={activity.id} style={styles.activity}>
                                <View style={styles.activityHeader}>
                                    <Text style={styles.activityTitle}>{activity.title}</Text>
                                    <View style={[
                                        styles.statusBadge,
                                        activity.status === 'verified' && styles.verifiedBadge,
                                        activity.status === 'pending' && styles.pendingBadge
                                    ]}>
                                        <Text style={styles.statusText}>{activity.status}</Text>
                                    </View>
                                </View>
                                <Text style={styles.activityDetails}>
                                    {activity.organization} • {activity.hours} hours
                                </Text>
                                <Text style={styles.activityDate}>
                                    {new Date(activity.date).toLocaleDateString()}
                                </Text>
                                <View style={styles.categoryTag}>
                                    <MaterialIcons 
                                        name={
                                            activity.category === 'Environmental' ? 'eco' :
                                            activity.category === 'Education' ? 'school' : 'people'
                                        } 
                                        size={16} 
                                        color="#4CAF50" 
                                    />
                                    <Text style={styles.categoryText}>{activity.category}</Text>
                                </View>
                            </View>
                        ))}
                    </ContentCard>

                    <ContentCard title="Volunteer Opportunities">
                        {filteredPostings.map((posting) => (
                            <View key={posting.id} style={styles.posting}>
                                <View style={styles.postingHeader}>
                                    <Text style={styles.postingTitle}>{posting.title}</Text>
                                    <MaterialIcons name="bookmark-border" size={24} color="#4CAF50" />
                                </View>
                                <Text style={styles.postingOrg}>{posting.organization}</Text>
                                <Text style={styles.postingDetails}>{posting.description}</Text>
                                <View style={styles.postingMeta}>
                                    <View style={styles.postingInfo}>
                                        <MaterialIcons name="event" size={16} color="#666666" />
                                        <Text style={styles.postingDate}>
                                            {new Date(posting.date).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <View style={styles.postingInfo}>
                                        <MaterialIcons name="people" size={16} color="#666666" />
                                        <Text style={styles.postingSpots}>
                                            {posting.spotsAvailable} spots left
                                        </Text>
                                    </View>
                                </View>
                                <Button
                                    mode="contained"
                                    onPress={() => {}}
                                    style={styles.applyButton}
                                >
                                    Apply Now
                                </Button>
                            </View>
                        ))}
                    </ContentCard>
                </>
            ) : (
                <View style={sharedStyles.loadingContainer}>
                    <Text style={sharedStyles.loadingText}>Loading volunteer activity...</Text>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 0,
    },
    metricsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
    },
    metricItem: {
        alignItems: 'center',
    },
    metricValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    metricLabel: {
        fontSize: 14,
        color: '#666666',
        marginTop: 4,
    },
    impactContainer: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
    },
    impactTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 16,
    },
    impactGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    impactItem: {
        width: '48%',
        alignItems: 'center',
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    impactIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    impactValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    impactLabel: {
        fontSize: 12,
        color: '#666666',
        textAlign: 'center',
        marginTop: 4,
    },
    badgesContainer: {
        flexDirection: 'row',
        paddingVertical: 8,
    },
    badge: {
        width: 120,
        padding: 16,
        marginRight: 12,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        alignItems: 'center',
    },
    badgeIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    badgeName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333333',
        textAlign: 'center',
        marginBottom: 4,
    },
    badgeDescription: {
        fontSize: 12,
        color: '#666666',
        textAlign: 'center',
    },
    categoryFilters: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    categoryChip: {
        backgroundColor: '#F0F0F0',
    },
    activity: {
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333333',
        flex: 1,
    },
    activityDetails: {
        fontSize: 14,
        color: '#666666',
    },
    activityDate: {
        fontSize: 14,
        color: '#666666',
        marginTop: 4,
    },
    categoryTag: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    categoryText: {
        fontSize: 14,
        color: '#4CAF50',
        marginLeft: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#F44336',
    },
    verifiedBadge: {
        backgroundColor: '#4CAF50',
    },
    pendingBadge: {
        backgroundColor: '#FFC107',
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    posting: {
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
    },
    postingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    postingTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        flex: 1,
    },
    postingOrg: {
        fontSize: 14,
        color: '#4CAF50',
        marginBottom: 8,
    },
    postingDetails: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 12,
    },
    postingMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    postingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    postingDate: {
        fontSize: 14,
        color: '#666666',
        marginLeft: 4,
    },
    postingSpots: {
        fontSize: 14,
        color: '#666666',
        marginLeft: 4,
    },
    applyButton: {
        marginTop: 8,
        backgroundColor: '#4CAF50',
    },
}); 