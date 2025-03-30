import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventCard from '../../components/EventCard';
import { Ionicons } from '@expo/vector-icons';
import { Logger } from '../../utils/Logger';
import { useLayout } from '../../contexts/LayoutContext';

const SCHEDULED_EVENTS = [
  {
    id: '1',
    title: 'Annual Society Meeting',
    date: '2023-09-20',
    time: '18:00',
    location: 'Community Hall',
    organizer: 'John Doe',
    description: 'Annual general meeting to discuss society plans and budget for the upcoming year.',
    participants: 45,
    isIntersociety: false,
    society: 'Green Meadows',
    image: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1',
    criteria: [
      'Must be a registered resident of Green Meadows',
      'Only one representative per household',
      'Please bring your society ID'
    ],
    coordinates: {
      latitude: 37.785834,
      longitude: -122.406417,
    }
  },
  {
    id: '2',
    title: 'Inter-Society Cultural Festival',
    date: '2023-10-15',
    time: '10:00',
    location: 'City Park',
    organizer: 'Cultural Committee',
    description: 'A celebration of diversity with performances, food, and activities from different societies.',
    participants: 120,
    isIntersociety: true,
    societies: ['Green Meadows', 'Sunset Heights', 'Ocean View'],
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3',
    criteria: [
      'Open to all society members',
      'Performance groups must register by October 1st',
      'Food vendors need health certification'
    ],
    coordinates: {
      latitude: 37.789834,
      longitude: -122.401417,
    }
  },
  {
    id: '3',
    title: 'Neighborhood Cleanup Drive',
    date: '2023-09-25',
    time: '09:00',
    location: 'Starting at Main Gate',
    organizer: 'Environmental Committee',
    description: 'Join us for a community cleanup to keep our neighborhood beautiful and trash-free.',
    participants: 35,
    isIntersociety: false,
    society: 'Green Meadows',
    criteria: [
      'All ages welcome',
      'Equipment will be provided',
      'Please wear appropriate clothing and footwear'
    ],
    coordinates: {
      latitude: 37.786834,
      longitude: -122.408417,
    }
  }
];

export default function ScheduledEventsScreen({ navigation }) {
  const listRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollPosition = useRef(0);
  const lastResetTime = useRef(Date.now());
  
  // Use the layout context instead of defining our own reset function
  const { resetEventsLayout, registerScrollPosition, restoreScrollPosition, activeTab } = useLayout();

  // Effect to handle layout restoration when this tab becomes active
  useEffect(() => {
    if (activeTab === 'Scheduled') {
      // When this tab is active, restore its scroll position
      setTimeout(() => {
        try {
          const savedPosition = restoreScrollPosition('Scheduled');
          if (savedPosition > 0 && listRef.current) {
            listRef.current.scrollToOffset({ offset: savedPosition, animated: false });
          }
        } catch (err) {
          Logger.error('ScheduledEventsScreen', 'Error restoring scroll position', { error: err.message });
        }
      }, 50);
      
      // Force refresh when tab becomes active to ensure proper layout
      setRefreshKey(prev => prev + 1);
    }
  }, [activeTab, restoreScrollPosition]);

  return (
    <View style={styles.container} key={`scheduled-events-${refreshKey}`}>
      <FlatList
        ref={listRef}
        data={SCHEDULED_EVENTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCard event={item} status="scheduled" />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={15}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
        onScroll={(e) => {
          // Track scroll position and store it in context
          const position = e.nativeEvent.contentOffset.y;
          scrollPosition.current = position;
          registerScrollPosition('Scheduled', position);
        }}
        scrollEventThrottle={16}
        onLayout={() => {
          if (scrollPosition.current === 0) {
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
          }
        }}
      />
      
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('CreateEvent')}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',  // Use the consistent background color
    position: 'relative',       // Keep 'relative' not 'fixed' which is web-only
  },
  listContent: {
    padding: 15,
    paddingBottom: 80, // Keep the larger padding for FAB space
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#007AFF',
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  }
});
