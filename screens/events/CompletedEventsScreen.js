import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventCard from '../../components/EventCard';
import { Logger } from '../../utils/Logger';
import { useLayout } from '../../contexts/LayoutContext';

const COMPLETED_EVENTS = [
  {
    id: '1',
    title: 'Spring Cleaning Drive',
    date: '2023-07-05',
    time: '09:00 - 13:00',
    location: 'Throughout the society',
    organizer: 'Maintenance Committee',
    description: 'Community-wide cleaning and organization effort.',
    participants: 55,
    isIntersociety: false,
    society: 'Green Meadows',
    outcome: 'Successfully cleaned all common areas and planted 20 new trees. Collected over 100kg of recyclable materials.',
    photos: 45,
    image: 'https://images.unsplash.com/photo-1618022649095-795c1bcc6ea3',
    coordinates: {
      latitude: 37.785834,
      longitude: -122.406417,
    }
  },
  {
    id: '2',
    title: 'Society Anniversary Celebration',
    date: '2023-06-12',
    time: '18:00 - 22:00',
    location: 'Community Hall',
    organizer: 'Entertainment Committee',
    description: 'Celebration of the 10th anniversary of our society with dinner and performances.',
    participants: 120,
    isIntersociety: false,
    society: 'Green Meadows',
    photos: 95,
    outcome: 'Wonderful celebration with performances from 8 community groups. Over 120 residents attended and enjoyed dinner together. Special thanks to all volunteers who made this event possible.',
    image: 'https://images.unsplash.com/photo-1472653431158-6364773b2a56',
    coordinates: {
      latitude: 37.782834,
      longitude: -122.407417,
    }
  }
];

export default function CompletedEventsScreen() {
  const listRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollPosition = useRef(0);
  
  // Use the layout context
  const { registerScrollPosition, restoreScrollPosition, activeTab } = useLayout();

  // Effect to handle layout restoration when this tab becomes active
  useEffect(() => {
    if (activeTab === 'Completed') {
      // When this tab is active, restore its scroll position
      setTimeout(() => {
        try {
          const savedPosition = restoreScrollPosition('Completed');
          if (savedPosition > 0 && listRef.current) {
            listRef.current.scrollToOffset({ offset: savedPosition, animated: false });
          }
        } catch (err) {
          Logger.error('CompletedEventsScreen', 'Error restoring scroll position', { error: err.message });
        }
      }, 50);
      
      // Force refresh when tab becomes active
      setRefreshKey(prev => prev + 1);
    }
  }, [activeTab, restoreScrollPosition]);
  
  return (
    <View style={styles.container} key={`completed-events-${refreshKey}`}>
      <FlatList
        ref={listRef}
        data={COMPLETED_EVENTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCard event={item} status="completed" />
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
          registerScrollPosition('Completed', position);
        }}
        scrollEventThrottle={16}
        onLayout={() => {
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
