import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import { Logger } from '../../utils/Logger';

export default function ActivityHistoryScreen() {
  const [filter, setFilter] = useState('all');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { user } = useUser();
  
  // Fetch user activities from MongoDB when component mounts
  useEffect(() => {
    fetchUserActivities();
  }, []);
  
  // Fetch activities when filter changes
  useEffect(() => {
    filterActivities();
  }, [filter]);
  
  const fetchUserActivities = async () => {
    if (!user || (!user.id && !user._id)) {
      setError('User not found. Please login again.');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const userId = user.id || user._id;
      Logger.debug('ActivityHistoryScreen', 'Fetching activities for user', { userId });
      
      // Import MongoDB services
      const { getPosts, getEvents } = require('../../src/services/mongoService');
      
      // Get society ID if available
      const societyId = user.societies?.[0] || user.society || 'default';
      
      // Fetch posts for this user
      const posts = await getPosts(societyId, 50); // Fetch up to 50 posts to filter
      const userPosts = posts
        .filter(post => post.authorId === userId) 
        .map(post => ({
          id: post._id || post.id,
          type: 'post',
          title: post.title || post.content?.substring(0, 30) || 'Untitled Post',
          date: post.timestamp || post.createdAt,
          likes: post.likes || 0,
          comments: post.comments || 0
        }));
      
      Logger.debug('ActivityHistoryScreen', 'User posts fetched', { count: userPosts.length });
      
      // Fetch events where this user is participant or organizer
      const events = await getEvents('all', societyId);
      const userEvents = events
        .filter(event => 
          event.organizer?.id === userId || 
          event.participants?.some(p => p.id === userId)
        )
        .map(event => ({
          id: event._id || event.id,
          type: 'event',
          title: event.title || 'Untitled Event',
          date: event.date || event.createdAt,
          role: event.organizer?.id === userId ? 'Organizer' : 'Participant',
          participants: event.participants?.length || 0
        }));
      
      Logger.debug('ActivityHistoryScreen', 'User events fetched', { count: userEvents.length });
      
      // Combine and sort all activities by date (most recent first)
      const allActivities = [...userPosts, ...userEvents];
      allActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setActivities(allActivities);
      setLoading(false);
    } catch (error) {
      Logger.error('ActivityHistoryScreen', 'Error fetching activities', error);
      setError('Failed to load activities. Please try again later.');
      setLoading(false);
    }
  };
  
  const filterActivities = () => {
    if (filter !== 'all') {
      setLoading(true);
      // Just apply the filter - no need to fetch again
      setTimeout(() => {
        setLoading(false);
      }, 100); // Small delay for UI feedback
    }
  };
  
  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(activity => activity.type === filter);

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
      {/* Keep the challenge filter but it may be empty until challenges are implemented */}
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
  
  // Render loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your activities...</Text>
      </View>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={40} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchUserActivities}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Render empty state
  if (!filteredActivities.length) {
    return (
      <View style={styles.container}>
        {renderFilters()}
        <View style={[styles.centerContent, {flex: 1}]}>
          <Ionicons name="calendar-outline" size={40} color="#999" />
          <Text style={styles.emptyStateText}>
            {filter === 'all' 
              ? 'No activities found.' 
              : `No ${filter}s found.`}
          </Text>
        </View>
      </View>
    );
  }

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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
