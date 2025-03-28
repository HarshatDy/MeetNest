import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList 
  // SafeAreaView removed from here
} from 'react-native';
// Add SafeAreaView context import if needed
import { SafeAreaView } from 'react-native-safe-area-context';
import EventCard from '../../components/EventCard';
import { Logger } from '../../utils/Logger';

const ONGOING_EVENTS = [
  {
    id: '1',
    title: 'Summer Sports Camp',
    startDate: '2023-08-01',
    endDate: '2023-08-20',
    time: '09:00 - 17:00',
    location: 'Society Sports Ground',
    organizer: 'Sports Committee',
    description: 'Two-week camp with various sports activities for children aged 8-15.',
    participants: 30,
    isIntersociety: false,
    society: 'Green Meadows',
    progress: 65,
    image: 'https://images.unsplash.com/photo-1526401485004-46910ecc8e51',
    milestones: [
      {
        text: 'Registration Complete',
        completed: true
      },
      {
        text: 'Kickoff Event',
        completed: true
      },
      {
        text: 'Week 1 Activities',
        completed: true
      },
      {
        text: 'Mid-camp Tournament',
        completed: false
      },
      {
        text: 'Week 2 Activities',
        completed: false
      },
      {
        text: 'Closing Ceremony',
        completed: false
      }
    ],
    coordinates: {
      latitude: 37.785834,
      longitude: -122.406417,
    }
  },
  {
    id: '2',
    title: 'Community Garden Project',
    startDate: '2023-07-15',
    endDate: '2023-08-30',
    location: 'East Garden Area',
    organizer: 'Environment Club',
    description: 'Collaborative project to revitalize the community garden area.',
    participants: 25,
    isIntersociety: false,
    society: 'Green Meadows',
    progress: 40,
    image: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735',
    milestones: [
      {
        text: 'Planning Phase',
        completed: true
      },
      {
        text: 'Area Clearing',
        completed: true
      },
      {
        text: 'Soil Preparation',
        completed: false
      },
      {
        text: 'Planting Phase',
        completed: false
      },
      {
        text: 'Installation of Irrigation System',
        completed: false
      }
    ],
    coordinates: {
      latitude: 37.782834,
      longitude: -122.410417,
    }
  }
];

export default function OngoingEventsScreen() {
  const listRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollPosition = useRef(0);
  const lastResetTime = useRef(Date.now());

  // Enhanced global reset function with scroll position preservation
  useEffect(() => {
    global.resetEventsLayout = () => {
      // Don't reset too frequently
      const now = Date.now();
      if (now - lastResetTime.current < 100) {
        return;
      }
      lastResetTime.current = now;
      
      Logger.debug('OngoingEventsScreen', 'Resetting layout');
      
      // Store current scroll position for restoration
      // We'll use the onScroll event to track this instead of measuring
      
      // Force re-render with a new key
      setRefreshKey(prev => prev + 1);
      
      // Restore scroll position after a moment
      setTimeout(() => {
        if (listRef.current && scrollPosition.current > 0) {
          try {
            listRef.current.scrollToOffset({ 
              offset: scrollPosition.current, 
              animated: false 
            });
          } catch (err) {
            Logger.error('OngoingEventsScreen', 'Error restoring scroll position', { error: err.message });
          }
        }
      }, 100);
    };
    
    return () => {
      // Cleanup global function when component unmounts
      if (global.resetEventsLayout) {
        global.resetEventsLayout = null;
      }
    };
  }, []);
  
  return (
    <View style={styles.container} key={`ongoing-events-${refreshKey}`}>
      <FlatList
        ref={listRef}
        data={ONGOING_EVENTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCard event={item} status="ongoing" />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={false}
        initialNumToRender={10} // Increased to reduce chance of blank areas
        maxToRenderPerBatch={10}
        windowSize={15} // Increased for better rendering performance
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
        onScroll={(e) => {
          // Simple way to track scroll position
          scrollPosition.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        onLayout={() => {
          // Reset to top when remounting/relayouting
          if (scrollPosition.current === 0) {
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    position: 'relative', // Ensure consistent positioning context
  },
  listContent: {
    padding: 15,
    paddingBottom: 20,
    flexGrow: 1, // Ensure content expands to fill space
  }
});
