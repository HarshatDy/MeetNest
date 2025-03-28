import React, { useState, useRef, useEffect } from 'react';
import { FlatList, StyleSheet, View, Dimensions, InteractionManager, Text, ActivityIndicator } from 'react-native';
import PostCard from '../../components/PostCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Logger } from '../../utils/Logger';

const DUMMY_LOCAL_POSTS = [
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
    id: '3',
    user: {
      id: '103',
      name: 'Michael Green',
      avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
      role: 'Member',
      society: 'Green Meadows'
    },
    content: 'Our society garden is looking amazing after the weekend cleanup!',
    image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae',
    timestamp: '2023-08-10T09:15:00Z',
    likes: 42,
    comments: 8,
    activity: 'Garden Cleanup',
    hasChallenge: true
  },
  {
    id: '4',
    user: {
      id: '107',
      name: 'David Wilson',
      avatar: 'https://randomuser.me/api/portraits/men/7.jpg',
      role: 'Member',
      society: 'Green Meadows'
    },
    content: 'Just finished setting up the new playground equipment. The kids are going to love it!',
    image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f',
    timestamp: '2023-08-08T16:20:00Z',
    likes: 28,
    comments: 5,
    activity: 'Playground Setup',
    hasChallenge: false
  }
];

export default function LocalTimelineScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const isMounted = useRef(true);
  
  // Track if we need to force a refresh
  const routeRefreshParam = route?.params?.refresh;
  const newPost = route?.params?.newPost;
  const postStatus = route?.params?.postStatus;
  
  // Add a key state to force re-render when needed
  const [refreshKey, setRefreshKey] = useState(0);
  
  // State to manage posts including new posts
  const [posts, setPosts] = useState([]);
  // State to track post status
  const [processingPosts, setProcessingPosts] = useState({});

  // Initialize posts with dummy data and handle new posts from route params
  useEffect(() => {
    // Initialize with dummy data
    setPosts(DUMMY_LOCAL_POSTS);
    
    // Process new post if available
    if (newPost && postStatus === 'uploading') {
      Logger.debug('LocalTimelineScreen', 'New post received', { postId: newPost.id });
      
      // Add the new post at the beginning
      setPosts(currentPosts => [newPost, ...currentPosts]);
      
      // Track this post as processing
      setProcessingPosts(prev => ({
        ...prev,
        [newPost.id]: true
      }));
      
      // Simulate post upload completing after some time
      setTimeout(() => {
        if (isMounted.current) {
          setProcessingPosts(prev => ({
            ...prev,
            [newPost.id]: false
          }));
          
          // Update the post to mark it as completed
          setPosts(currentPosts => 
            currentPosts.map(post => 
              post.id === newPost.id ? { ...post, status: 'completed' } : post
            )
          );
          
          Logger.debug('LocalTimelineScreen', 'Post upload completed', { postId: newPost.id });
        }
      }, 3000); // Simulate 3 second upload time
    }
  }, [newPost, postStatus]);
  
  // Reset scroll position when component mounts or refreshes
  useEffect(() => {
    Logger.debug('LocalTimelineScreen', 'Component mounted');
    
    // Reset scroll position when component first mounts
    if (listRef.current) {
      InteractionManager.runAfterInteractions(() => {
        if (listRef.current) {
          listRef.current.scrollToOffset({ offset: 0, animated: false });
          Logger.debug('LocalTimelineScreen', 'Reset scroll position on mount');
        }
      });
    }
    
    return () => {
      Logger.debug('LocalTimelineScreen', 'Component unmounting');
      isMounted.current = false;
    };
  }, []);
  
  // Force refresh and scroll reset when route parameters change
  useEffect(() => {
    if (routeRefreshParam && isMounted.current) {
      Logger.debug('LocalTimelineScreen', 'Force refresh from route param', { refresh: routeRefreshParam });
      
      // Reset scroll position and force redraw to fix layout
      InteractionManager.runAfterInteractions(() => {
        setRefreshKey(prev => prev + 1);
        
        // After re-render, reset scroll position
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollToOffset({ offset: 0, animated: false });
            Logger.debug('LocalTimelineScreen', 'Reset scroll position from param change');
          }
        }, 50);
      });
    }
  }, [routeRefreshParam]);
  
  // Handle screen focus events to ensure content is visible
  useFocusEffect(
    React.useCallback(() => {
      Logger.debug('LocalTimelineScreen', 'Screen focused');
      
      // Force a refresh when the screen comes into focus
      if (isMounted.current) {
        setRefreshKey(prevKey => prevKey + 1);
        
        // Reset scroll position
        InteractionManager.runAfterInteractions(() => {
          if (listRef.current) {
            listRef.current.scrollToOffset({ offset: 0, animated: false });
            Logger.debug('LocalTimelineScreen', 'Reset scroll position on focus');
          }
        });
      }
      
      return () => {
        Logger.debug('LocalTimelineScreen', 'Screen unfocused');
      };
    }, [])
  );

  // Render a post with its status indicator if needed
  const renderPost = ({ item }) => {
    const isProcessing = processingPosts[item.id];
    
    return (
      <View>
        <PostCard post={item} />
        {isProcessing && (
          <View style={styles.postStatusContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.postStatusText}>Uploading your post...</Text>
          </View>
        )}
      </View>
    );
  };
  
  return (
    <View style={styles.container} key={`local-timeline-${refreshKey}`}>
      <FlatList
        ref={listRef}
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(10, insets.bottom + 60) }
        ]}
        removeClippedSubviews={false}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        onScroll={(e) => {
          const offsetY = e.nativeEvent.contentOffset.y;
          if (offsetY % 250 === 0) { // Log only occasionally to reduce noise
            Logger.debug('LocalTimelineScreen', `Scroll position: ${offsetY}px`);
          }
        }}
        scrollEventThrottle={250}
        // Add important props to ensure content visibility
        onLayout={() => {
          Logger.debug('LocalTimelineScreen', 'FlatList layout');
        }}
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
  },
  postStatusContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginTop: -8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  postStatusText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  }
});
