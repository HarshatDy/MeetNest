import React, { useCallback, useRef, useEffect } from 'react';
import { FlatList, StyleSheet, View, InteractionManager } from 'react-native';
import PostCard from '../../components/PostCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Logger } from '../../utils/Logger';

const DUMMY_POSTS = [
  {
    id: '1',
    user: {
      id: '101',
      name: 'John Doe',
      avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
      role: 'President',
      society: 'Green Meadows'
    },
    content: 'Just completed our annual society maintenance! Everything looks great for the upcoming year.',
    image: 'https://images.unsplash.com/photo-1534237710431-e2fc698436d0',
    timestamp: '2023-08-12T12:30:00Z',
    likes: 15,
    comments: 3,
    activity: 'Maintenance Work',
    hasChallenge: false
  },
  {
    id: '2',
    user: {
      id: '102',
      name: 'Sarah Johnson',
      avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
      role: 'Treasurer',
      society: 'Sunset Heights'
    },
    content: 'Our society football tournament is starting next week. Teams, get ready!',
    image: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12',
    timestamp: '2023-08-11T18:20:00Z',
    likes: 28,
    comments: 7,
    activity: 'Football Tournament',
    hasChallenge: true
  },
  {
    id: '4',
    user: {
      id: '105',
      name: 'Alex Chen',
      avatar: 'https://randomuser.me/api/portraits/men/5.jpg',
      role: 'Secretary',
      society: 'Mountain Terrace'
    },
    content: 'Excited to announce that we\'ll be hosting the inter-society chess tournament next month! Registration opens tomorrow.',
    image: 'https://images.unsplash.com/photo-1528819622765-d6bcf132f793',
    timestamp: '2023-08-10T15:45:00Z',
    likes: 36,
    comments: 8,
    activity: 'Chess Tournament',
    hasChallenge: true
  },
  {
    id: '5',
    user: {
      id: '106',
      name: 'Jessica Taylor',
      avatar: 'https://randomuser.me/api/portraits/women/6.jpg',
      role: 'Member',
      society: 'Ocean View'
    },
    content: 'Beautiful sunset at our society beach party yesterday. Thanks to everyone who came and made it special!',
    image: 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a',
    timestamp: '2023-08-09T19:30:00Z',
    likes: 52,
    comments: 11,
    activity: 'Beach Party',
    hasChallenge: false
  }
];

export default function GlobalTimelineScreen({ route }) {
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const isMounted = useRef(true);
  
  // Track if we need to force a refresh
  const routeRefreshParam = route?.params?.refresh;
  
  // Add a key state to force re-render when needed
  const [refreshKey, setRefreshKey] = React.useState(0);
  
  // Log component mounting
  useEffect(() => {
    Logger.debug('GlobalTimelineScreen', 'Component mounted', { 
      bottomInset: insets.bottom
    });
    
    return () => {
      Logger.debug('GlobalTimelineScreen', 'Component unmounting');
    };
  }, []);
  
  // Force refresh and scroll reset when route parameters change
  useEffect(() => {
    if (routeRefreshParam && isMounted.current) {
      Logger.debug('GlobalTimelineScreen', 'Force refresh from route param', { refresh: routeRefreshParam });
      
      // Reset scroll position and force redraw to fix layout
      InteractionManager.runAfterInteractions(() => {
        setRefreshKey(prev => prev + 1);
        
        // After re-render, reset scroll position
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollToOffset({ offset: 0, animated: false });
            Logger.debug('GlobalTimelineScreen', 'Reset scroll position from param change');
          }
        }, 50);
      });
    }
  }, [routeRefreshParam]);
  
  // Force layout update when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      Logger.debug('GlobalTimelineScreen', 'Screen focused');
      
      // When the screen is focused, trigger a re-render and reset scroll
      if (isMounted.current) {
        setRefreshKey(prevKey => prevKey + 1);
        
        // Reset scroll position
        InteractionManager.runAfterInteractions(() => {
          if (listRef.current) {
            listRef.current.scrollToOffset({ offset: 0, animated: false });
            Logger.debug('GlobalTimelineScreen', 'Reset scroll position on focus');
          }
        });
      }
      
      return () => {
        Logger.debug('GlobalTimelineScreen', 'Screen unfocused');
      };
    }, [])
  );
  
  return (
    <View style={styles.container} key={`global-timeline-${refreshKey}`}>
      <FlatList
        ref={listRef}
        data={DUMMY_POSTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(10, insets.bottom + 60) } // Add extra padding for tab bar
        ]}
        removeClippedSubviews={false}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        // Force the layout to reset on mount
        onLayout={() => {
          Logger.debug('GlobalTimelineScreen', 'FlatList layout event');
          if (listRef.current) {
            listRef.current.scrollToOffset({ offset: 0, animated: false });
          }
        }}
        onScroll={(e) => {
          const offsetY = e.nativeEvent.contentOffset.y;
          if (offsetY % 250 === 0) { // Log only occasionally to reduce noise
            Logger.debug('GlobalTimelineScreen', `Scroll position: ${offsetY}px`);
          }
        }}
        scrollEventThrottle={250}
        onRefresh={() => {
          Logger.userAction('GlobalTimelineScreen', 'Pull-to-refresh triggered');
          // Simulate refresh
          setTimeout(() => {
            Logger.debug('GlobalTimelineScreen', 'Refresh completed');
          }, 1000);
        }}
        refreshing={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    // Important: use regular positioning instead of absolute
    position: 'relative',
  },
  listContent: {
    padding: 10,
    flexGrow: 1, // Ensure content expands to fill space
  }
});
