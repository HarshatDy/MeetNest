import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ACTIVITY_HISTORY = [
  {
    id: '1',
    type: 'post',
    title: 'Annual society maintenance',
    date: '2023-08-12',
    likes: 15,
    comments: 3
  },
  {
    id: '2',
    type: 'event',
    title: 'Summer Sports Camp',
    date: '2023-08-01',
    role: 'Organizer',
    participants: 30
  },
  {
    id: '3',
    type: 'challenge',
    title: 'Table Tennis Tournament',
    date: '2023-07-25',
    result: 'Won',
    opponent: 'Michael Green'
  },
  {
    id: '4',
    type: 'post',
    title: 'Society garden renovation plans',
    date: '2023-07-20',
    likes: 24,
    comments: 8
  },
  {
    id: '5',
    type: 'event',
    title: 'Spring Cleaning Drive',
    date: '2023-07-05',
    role: 'Participant',
    participants: 55
  },
  {
    id: '6',
    type: 'challenge',
    title: 'Chess Competition',
    date: '2023-06-18',
    result: 'Lost',
    opponent: 'Sarah Johnson'
  },
  {
    id: '7',
    type: 'post',
    title: 'New society amenities proposal',
    date: '2023-06-10',
    likes: 32,
    comments: 12
  }
];

export default function ActivityHistoryScreen() {
  const [filter, setFilter] = useState('all');
  
  const filteredActivities = filter === 'all' 
    ? ACTIVITY_HISTORY 
    : ACTIVITY_HISTORY.filter(activity => activity.type === filter);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'post':
        return 'create-outline';
      case 'event':
        return 'calendar-outline';
      case 'challenge':
        return 'trophy-outline';
      default:
        return 'ellipsis-horizontal';
    }
  };

  const renderActivityDetails = (activity) => {
    switch (activity.type) {
      case 'post':
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Ionicons name="heart" size={14} color="#FF2D55" />
              <Text style={styles.detailText}>{activity.likes} likes</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="chatbubble" size={14} color="#007AFF" />
              <Text style={styles.detailText}>{activity.comments} comments</Text>
            </View>
          </View>
        );
      case 'event':
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Ionicons name="person" size={14} color="#4CD964" />
              <Text style={styles.detailText}>Role: {activity.role}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="people" size={14} color="#5856D6" />
              <Text style={styles.detailText}>{activity.participants} participants</Text>
            </View>
          </View>
        );
      case 'challenge':
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Ionicons 
                name={activity.result === 'Won' ? 'checkmark-circle' : 'close-circle'} 
                size={14} 
                color={activity.result === 'Won' ? '#4CD964' : '#FF3B30'} 
              />
              <Text style={styles.detailText}>{activity.result}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="person" size={14} color="#5856D6" />
              <Text style={styles.detailText}>vs {activity.opponent}</Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  const renderActivity = ({ item }) => (
    <View style={styles.activityContainer}>
      <View style={[
        styles.activityIconContainer, 
        { 
          backgroundColor: 
            item.type === 'post' ? '#f0f8ff' : 
            item.type === 'event' ? '#f0fff0' : 
            '#fff0f5' 
        }
      ]}>
        <Ionicons 
          name={getActivityIcon(item.type)} 
          size={24} 
          color={
            item.type === 'post' ? '#007AFF' : 
            item.type === 'event' ? '#4CD964' : 
            '#FF9500'
          } 
        />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activityDate}>{new Date(item.date).toLocaleDateString()}</Text>
        {renderActivityDetails(item)}
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <TouchableOpacity 
        style={[styles.filterButton, filter === 'all' && styles.activeFilterButton]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
          All
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.filterButton, filter === 'post' && styles.activeFilterButton]}
        onPress={() => setFilter('post')}
      >
        <Text style={[styles.filterText, filter === 'post' && styles.activeFilterText]}>
          Posts
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.filterButton, filter === 'event' && styles.activeFilterButton]}
        onPress={() => setFilter('event')}
      >
        <Text style={[styles.filterText, filter === 'event' && styles.activeFilterText]}>
          Events
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.filterButton, filter === 'challenge' && styles.activeFilterButton]}
        onPress={() => setFilter('challenge')}
      >
        <Text style={[styles.filterText, filter === 'challenge' && styles.activeFilterText]}>
          Challenges
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderFilters()}
      <FlatList
        data={filteredActivities}
        keyExtractor={(item) => item.id}
        renderItem={renderActivity}
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
  filtersContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
  },
  activeFilterButton: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterText: {
    color: 'white',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 10,
  },
  activityContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  activityIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  activityDate: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  detailsContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
});
