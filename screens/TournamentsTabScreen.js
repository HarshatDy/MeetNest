import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TournamentCard from '../components/TournamentCard';
import { Logger } from '../utils/Logger';

// Sample tournament data
const SAMPLE_TOURNAMENTS = [
  {
    id: '1',
    title: 'Community Basketball Tournament',
    type: 'Sports',
    date: '2023-12-15',
    startTime: '9:00 AM',
    endTime: '5:00 PM',
    location: 'Community Center Courts',
    locationDetails: 'Enter through the main gate',
    bannerImage: 'https://images.unsplash.com/photo-1546519638-68e109acd27d',
    organizer: 'Neighborhood Sports Association',
    interestedCount: 28,
    participantsCount: 12,
    description: 'Join us for our annual basketball tournament! Teams of 3-5 players will compete in a day-long event with prizes for the winners. All skill levels welcome.',
    coordinates: {
      latitude: 37.785834,
      longitude: -122.406417,
    },
    registrationInfo: 'Register your team by emailing sports@community.org with your team name and number of players.',
    registrationDeadline: '2023-12-10',
    prizes: '1st Place: $500, 2nd Place: $250, 3rd Place: $100',
  },
  {
    id: '2',
    title: 'Monthly Chess Challenge',
    type: 'Games',
    date: '2023-12-08',
    startTime: '1:00 PM',
    endTime: '6:00 PM',
    location: 'Public Library - Meeting Room A',
    bannerImage: 'https://images.unsplash.com/photo-1586165368502-1bad197a6461',
    organizer: 'Chess Enthusiasts Club',
    interestedCount: 15,
    description: 'Challenge your mind at our monthly chess tournament. Swiss system, 4 rounds. Bring your own chess clock if possible.',
    coordinates: {
      latitude: 37.789834,
      longitude: -122.401417,
    }
  },
  {
    id: '3',
    title: 'Community 5K Run',
    type: 'Fitness',
    date: '2023-12-20',
    startTime: '8:00 AM',
    endTime: '10:00 AM',
    location: 'Riverside Park',
    locationDetails: 'Starting point at the main pavilion',
    bannerImage: 'https://images.unsplash.com/photo-1486218119243-13883505764c',
    organizer: 'Local Runners Association',
    interestedCount: 42,
    participantsCount: 35,
    description: 'Get your running shoes on for our monthly community 5K. This is a fun run, not a race, so all paces are welcome! Refreshments will be provided at the finish line.',
    coordinates: {
      latitude: 37.782834,
      longitude: -122.409417,
    },
    registrationInfo: 'Registration is $10 per person. All proceeds go to maintaining our community parks.',
  },
  {
    id: '4',
    title: 'Neighborhood Ping Pong Tournament',
    type: 'Sports',
    date: '2023-12-17',
    startTime: '2:00 PM',
    endTime: '7:00 PM',
    location: 'Recreation Center',
    bannerImage: 'https://images.unsplash.com/photo-1611251187878-638ee2a1f508',
    organizer: 'Table Tennis Club',
    interestedCount: 18,
    description: 'Friendly ping pong competition open to all skill levels. Single elimination tournament with prizes for the top three players.',
    coordinates: {
      latitude: 37.786834,
      longitude: -122.405417,
    }
  },
  {
    id: '5',
    title: 'Community Garden Volunteer Day',
    type: 'Service',
    date: '2023-12-09',
    startTime: '10:00 AM',
    endTime: '2:00 PM',
    location: 'Neighborhood Community Garden',
    bannerImage: 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e',
    organizer: 'Green Thumbs Society',
    interestedCount: 23,
    description: 'Help us maintain our beautiful community garden! We\'ll be planting winter vegetables, weeding, and building new garden beds. Tools will be provided, but bring gloves if you have them.',
    coordinates: {
      latitude: 37.787834,
      longitude: -122.407417,
    }
  }
];

// Use a consistent name that matches the file name
export default function TournamentsTabScreen() { // Renamed from TournamentsHomeScreen to match file name
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, sports, fitness, games, service, other
  
  // Reference to FlatList and filter ScrollView
  const flatListRef = useRef(null);
  const filterScrollRef = useRef(null);

  // Simple tournaments fetch
  const fetchTournaments = useCallback(async () => {
    Logger.debug('TournamentsScreen', 'Fetching tournaments');
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, fetch from API
      setTournaments(SAMPLE_TOURNAMENTS);
      setLoading(false);
      setRefreshing(false);
      Logger.debug('TournamentsScreen', 'Tournaments loaded successfully', { count: SAMPLE_TOURNAMENTS.length });
    } catch (error) {
      Logger.error('TournamentsScreen', 'Error fetching tournaments', { error: error.message });
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTournaments();
    
    // No complex global functions needed
    Logger.debug('TournamentsScreen', 'Screen mounted');
    
    return () => {
      Logger.debug('TournamentsScreen', 'Screen unmounting');
    };
  }, [fetchTournaments]);

  // Simple pull-to-refresh without layout logic
  const onRefresh = useCallback(() => {
    Logger.debug('TournamentsScreen', 'Pull-to-refresh triggered');
    setRefreshing(true);
    fetchTournaments();
  }, [fetchTournaments]);

  // Filter tournaments by type
  const getFilteredTournaments = useCallback(() => {
    if (filter === 'all') return tournaments;
    
    Logger.debug('TournamentsScreen', 'Filtering tournaments', { filter });
    return tournaments.filter(tournament => 
      tournament.type.toLowerCase() === filter.toLowerCase()
    );
  }, [tournaments, filter]);

  // Filter button component
  const FilterButton = ({ name, label, icon }) => (
    <TouchableOpacity 
      style={[
        styles.filterButton,
        filter === name && styles.filterButtonActive
      ]}
      onPress={() => {
        Logger.debug('TournamentsScreen', 'Filter selected', { filter: name });
        setFilter(name);
      }}
    >
      <Ionicons 
        name={icon} 
        size={16} 
        color={filter === name ? 'white' : '#666'} 
      />
      <Text 
        style={[
          styles.filterButtonText,
          filter === name && styles.filterButtonTextActive
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Reset scroll positions after modal close
  useEffect(() => {
    // Listen for the global TabsVisible change as indicator of modal close
    const intervalId = setInterval(() => {
      if (global.TabsVisible) {
        // Reset filter ScrollView position if needed
        if (filterScrollRef.current) {
          filterScrollRef.current.scrollTo({ x: 0, y: 0, animated: false });
        }
      }
    }, 100);
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Upcoming Events</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="calendar-outline" size={24} color="#007AFF" />
          <Text style={styles.headerButtonText}>Calendar</Text>
        </TouchableOpacity>
      </View>

      {/* Filter buttons */}
      <View style={styles.filterContainer}>
        <ScrollView 
          ref={filterScrollRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          scrollsToTop={false}
        >
          <FilterButton name="all" label="All" icon="grid-outline" />
          <FilterButton name="sports" label="Sports" icon="basketball-outline" />
          <FilterButton name="fitness" label="Fitness" icon="fitness-outline" />
          <FilterButton name="games" label="Games" icon="game-controller-outline" />
          <FilterButton name="service" label="Service" icon="people-outline" />
          <FilterButton name="other" label="Other" icon="options-outline" />
        </ScrollView>
      </View>

      {/* Tournament list with simplified structure */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading tournaments...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={getFilteredTournaments()}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TournamentCard tournament={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollsToTop={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No tournaments found</Text>
              <Text style={styles.emptySubtext}>
                {filter === 'all' 
                  ? 'Check back later for upcoming events' 
                  : `No ${filter} events currently scheduled`}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButtonText: {
    marginLeft: 5,
    color: '#007AFF',
    fontWeight: '500',
  },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterScrollContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    marginLeft: 5,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  listContent: {
    padding: 10,
    paddingBottom: 80, // Fixed padding for tab bar without recalculations
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
});