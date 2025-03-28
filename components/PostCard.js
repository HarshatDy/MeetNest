import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, StatusBar, InteractionManager, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PostDetailScreen from '../screens/PostDetailScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logger } from '../utils/Logger';
import { LayoutDebugger } from '../utils/LayoutDebugger';

// Enable layout animation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function PostCard({ post }) {
  const [modalVisible, setModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const mountedRef = useRef(true);
  const modalHasBeenShown = useRef(false);
  const cardRef = useRef(null);
  const [layout, setLayout] = useState(null);
  
  // Add state for likes
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes);
  
  // Log when component mounts and unmounts
  useEffect(() => {
    // Log dimensions at mount
    LayoutDebugger.logScreenDimensions('PostCard', `Mount - Card for post ${post.id}`);
    
    return () => {
      Logger.debug('PostCard', 'Component unmounting', { postId: post.id });
      mountedRef.current = false;
    };
  }, [post.id]);

  // Track modal state for proper cleanup
  useEffect(() => {
    if (modalVisible) {
      Logger.debug('PostCard', 'Modal opened', { postId: post.id });
      modalHasBeenShown.current = true;
      
      // Log dimensions when modal opens
      LayoutDebugger.logScreenDimensions('PostCard', `Modal opened for post ${post.id}`);
    } else if (modalHasBeenShown.current) {
      Logger.debug('PostCard', 'Modal closed', { postId: post.id });
      
      // Log dimensions right when modal closes
      LayoutDebugger.logScreenDimensions('PostCard', `Modal closed for post ${post.id}`);
      
      // CRITICAL: Ensure layout resets properly after modal closes
      InteractionManager.runAfterInteractions(() => {
        // Force immediate layout update using a direct Style reset
        if (Platform.OS === 'ios') {
          StatusBar.setBarStyle('dark-content', true);
        }
        
        // Request immediate animation frame for layout corrections
        requestAnimationFrame(() => {
          // Force a layout reset throughout the app
          if (global.TimelineRefresh) {
            global.TimelineRefresh();
          }
          
          // Force screen to re-layout after modal is dismissed
          setTimeout(() => {
            if (global.resetTimelineLayout) {
              global.resetTimelineLayout();
            }
          }, 50);
        });
      });
    }
    
    return () => {
      // Make sure to reset any modal state when component unmounts
      if (modalVisible) {
        Logger.debug('PostCard', 'Cleaning up open modal state', { postId: post.id });
        setModalVisible(false);
      }
    };
  }, [modalVisible, post.id, layout]);

  // Measure card position relative to screen
  const measureCardPosition = () => {
    if (cardRef.current) {
      if (typeof cardRef.current.measureInWindow === 'function') {
        cardRef.current.measureInWindow((x, y, width, height) => {
          const windowHeight = Dimensions.get('window').height;
          const bottomTabHeight = 60; // Approximate bottom tab height
          
          // Log component position relative to key UI elements
          Logger.debug('PostCard', 'Card position relative to window', {
            postId: post.id,
            x,
            y,
            width,
            height,
            distanceFromTop: y,
            distanceFromBottom: windowHeight - (y + height),
            distanceFromBottomTab: windowHeight - bottomTabHeight - (y + height),
            windowHeight,
            bottomTabEstimatedPosition: windowHeight - bottomTabHeight,
            timeAfterModalClose: 'immediate measurement'
          });
        });
      }
    }
  };

  // Handle layout changes for the card
  const onCardLayout = (e) => {
    const newLayout = e.nativeEvent.layout;
    setLayout(newLayout);
    LayoutDebugger.logLayout('PostCard', `Card-${post.id}`, newLayout, {
      timestamp: new Date().toISOString(),
      insets: {
        top: insets.top,
        bottom: insets.bottom
      }
    });
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const openPostDetail = () => {
    // No keyboard handling here
    Logger.userAction('PostCard', 'Opening post detail', { postId: post.id });
    
    // Delay showing modal to ensure good transition
    requestAnimationFrame(() => {
      setModalVisible(true);
    });
  };

  // Add function to handle likes
  const handleLike = () => {
    Logger.userAction('PostCard', 'Like button pressed', { 
      postId: post.id, 
      currentLiked: liked
    });
    
    if (liked) {
      setLikesCount(prev => prev - 1);
    } else {
      setLikesCount(prev => prev + 1);
    }
    setLiked(!liked);
  };

  // Improved modal closing logic
  const handleClose = () => {
    Logger.userAction('PostCard', 'Closing post detail', { postId: post.id });
    
    // Log dimensions before closing modal
    LayoutDebugger.logScreenDimensions('PostCard', `Before closing modal for post ${post.id}`);
    
    // Use InteractionManager to ensure animations complete before state changes
    InteractionManager.runAfterInteractions(() => {
      if (mountedRef.current) {
        // Set timeout to ensure smooth transition
        setTimeout(() => {
          setModalVisible(false);
          
          // Specifically force tab bar to reset when modal closes
          global.TabsVisible = true;
        }, 100);
      }
    });
  };

  return (
    <View>
      <TouchableOpacity 
        ref={cardRef}
        style={styles.card} 
        onPress={() => {
          Logger.userAction('PostCard', 'Card pressed', { postId: post.id });
          openPostDetail();
        }}
        onLayout={onCardLayout}
        activeOpacity={0.9}
      >
        {/* Card header with user info */}
        <View style={styles.header}>
          <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.userName}>{post.user.name}</Text>
            <Text style={styles.userRole}>{post.user.role} • {post.user.society}</Text>
            <Text style={styles.timestamp}>{formatTimestamp(post.timestamp)}</Text>
          </View>
        </View>

        {/* Post content */}
        <Text style={styles.content}>{post.content}</Text>
        
        {/* Post image if available */}
        {post.image && (
          <Image source={{ uri: post.image }} style={styles.postImage} />
        )}

        {/* Activity info if available */}
        {post.activity && (
          <View style={styles.activityContainer}>
            <Ionicons name="fitness-outline" size={20} color="#007AFF" />
            <Text style={styles.activityText}>{post.activity}</Text>
            {post.hasChallenge && (
              <TouchableOpacity style={styles.challengeButton}>
                <Text style={styles.challengeButtonText}>Challenge</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Footer with social actions */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.footerButton}
            onPress={handleLike}
          >
            <Ionicons 
              name={liked ? "heart" : "heart-outline"} 
              size={24} 
              color={liked ? "#FF2D55" : "#666"} 
            />
            <Text style={[
              styles.footerButtonText, 
              liked && styles.likedText
            ]}>
              {likesCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.footerButton}
            onPress={() => {
              Logger.userAction('PostCard', 'Comment button pressed', { postId: post.id });
              openPostDetail();
            }}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#666" />
            <Text style={styles.footerButtonText}>{post.comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.footerButton}
            onPress={() => {
              Logger.userAction('PostCard', 'Share button pressed', { postId: post.id });
            }}
          >
            <Ionicons name="share-social-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Modal for post details with improved layout reset */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => {
          Logger.userAction('PostCard', 'Modal back button pressed', { postId: post.id });
          handleClose();
        }}
        statusBarTranslucent={false}
        hardwareAccelerated={true}
        supportedOrientations={['portrait']}
        onDismiss={() => {
          Logger.debug('PostCard', 'Modal dismissed', { postId: post.id });
          
          if (Platform.OS === 'ios') {
            StatusBar.setHidden(false);
          }
          
          // Log dimensions when modal is dismissed
          LayoutDebugger.logScreenDimensions('PostCard', `Modal dismissed for post ${post.id}`);
          
          // Force layout recalculation on the main thread
          setTimeout(() => {
            requestAnimationFrame(() => {
              // Delayed measurement after modal dismissal
              measureCardPosition();
            });
          }, 100);
        }}
      >
        <PostDetailScreen 
          post={{
            ...post,
            likes: likesCount, // Pass updated likes count to detail screen
            userLiked: liked   // Pass liked state to detail screen
          }} 
          onClose={handleClose}
          bottomInset={insets.bottom}
          onLikeChange={(newLiked) => {
            // Update like state when returning from detail screen
            setLiked(newLiked);
            setLikesCount(newLiked ? post.likes + 1 : post.likes);
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  header: {
    flexDirection: 'row',
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerInfo: {
    marginLeft: 10,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  userRole: {
    fontSize: 13,
    color: '#666',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#f0f0f0',
  },
  activityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 10,
    marginTop: 2,
  },
  activityText: {
    color: '#007AFF',
    marginLeft: 5,
    fontWeight: '500',
    flex: 1,
  },
  challengeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  challengeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerButtonText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  likedText: {
    color: '#FF2D55', // Pink color for liked text
  },
});
