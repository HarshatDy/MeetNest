import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ACHIEVEMENTS = [
  {
    id: '1',
    name: 'Community Leader',
    icon: 'ribbon',
    description: 'Served as a society leader for over a year',
    date: '2022-06-10',
    color: '#007AFF'
  },
  {
    id: '2',
    name: 'Event Organizer',
    icon: 'calendar',
    description: 'Successfully organized 5+ community events',
    date: '2022-07-22',
    color: '#4CD964'
  },
  {
    id: '3',
    name: 'Sports Champion',
    icon: 'football',
    description: 'Won a society sports tournament',
    date: '2022-09-15',
    color: '#FF9500'
  },
  {
    id: '4',
    name: 'Active Participant',
    icon: 'star',
    description: 'Participated in 25+ community activities',
    date: '2023-01-30',
    color: '#5856D6'
  },
  {
    id: '5',
    name: 'Eco Warrior',
    icon: 'leaf',
    description: 'Participated in 3+ environmental initiatives',
    date: '2023-04-22',
    color: '#34C759'
  },
  {
    id: '6',
    name: 'Social Butterfly',
    icon: 'people',
    description: 'Connected with 50+ society members',
    date: '2023-05-18',
    color: '#FF2D55'
  }
];

export default function AchievementsScreen() {
  const renderAchievement = ({ item }) => (
    <View style={styles.achievementContainer}>
      <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon} size={24} color="white" />
      </View>
      <View style={styles.achievementInfo}>
        <Text style={styles.achievementName}>{item.name}</Text>
        <Text style={styles.achievementDescription}>{item.description}</Text>
        <Text style={styles.achievementDate}>
          Earned on {new Date(item.date).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{ACHIEVEMENTS.length}</Text>
          <Text style={styles.statLabel}>Achievements</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>72%</Text>
          <Text style={styles.statLabel}>Completion</Text>
        </View>
      </View>

      <FlatList
        data={ACHIEVEMENTS}
        keyExtractor={(item) => item.id}
        renderItem={renderAchievement}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 15,
    marginBottom: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  listContent: {
    padding: 10,
  },
  achievementContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  achievementDate: {
    fontSize: 12,
    color: '#999',
  },
});
