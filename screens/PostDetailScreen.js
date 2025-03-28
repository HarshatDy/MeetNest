import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  StatusBar,
  Keyboard,
  InteractionManager
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logger } from '../utils/Logger';

// Dummy comments data
const DUMMY_COMMENTS = [
  {
    id: '1',
    userId: '102',
    userName: 'Sarah Johnson',
    userAvatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    text: 'Great job on this! The community is looking better than ever.',
    timestamp: '2023-08-12T14:25:00Z',
    likes: 3
  },
  {
    id: '2',
    userId: '103',
    userName: 'Michael Green',
    userAvatar: 'https://randomuser.me/api/portraits/men/3.jpg',
    text: 'When is the next maintenance session scheduled?',
    timestamp: '2023-08-12T15:10:00Z',
    likes: 1
  },
  {
    id: '3',
    userId: '104',
    userName: 'Emma Wilson',
    userAvatar: 'https://randomuser.me/api/portraits/women/4.jpg',
    text: 'I couldn\'t make it this time, but count me in for the next one!',
    timestamp: '2023-08-12T16:45:00Z',
    likes: 2
  }
];

export default function PostDetailScreen({ post, onClose, bottomInset, onLikeChange }) {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);
  const keyboardDidShowListener = useRef(null);
  const keyboardDidHideListener = useRef(null);
  
  // Use the passed bottomInset to ensure consistency when returning to timeline
  const safeBottomInset = bottomInset || insets.bottom;
  
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(DUMMY_COMMENTS);
  const [liked, setLiked] = useState(post.userLiked || false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Log component lifecycle
  useEffect(() => {
    Logger.debug('PostDetailScreen', 'Component mounted', { 
      postId: post.id,
      safeBottomInset,
      topInset: insets.top
    });
    
    return () => {
      Logger.debug('PostDetailScreen', 'Component unmounting', { postId: post.id });
    };
  }, [post.id, safeBottomInset, insets.top]);
  
  // Set up keyboard listeners to track keyboard state
  useEffect(() => {
    function keyboardDidShow(e) {
      Logger.debug('PostDetailScreen', 'Keyboard shown', { 
        height: e?.endCoordinates?.height || 'unknown' 
      });
      setKeyboardVisible(true);
      // Scroll to bottom when keyboard appears
      setTimeout(() => {
        Logger.debug('PostDetailScreen', 'Scrolling to end after keyboard shown');
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    
    function keyboardDidHide() {
      Logger.debug('PostDetailScreen', 'Keyboard hidden');
      setKeyboardVisible(false);
    }
    
    // Store listeners in refs so we can access them during cleanup
    keyboardDidShowListener.current = Keyboard.addListener(
      'keyboardDidShow',
      keyboardDidShow
    );
    keyboardDidHideListener.current = Keyboard.addListener(
      'keyboardDidHide',
      keyboardDidHide
    );

    // Clean up function
    return () => {
      // First dismiss keyboard to reset UI state
      Keyboard.dismiss();
      
      // Wait for keyboard dismissal to complete
      InteractionManager.runAfterInteractions(() => {
        Logger.debug('PostDetailScreen', 'Cleaning up keyboard listeners');
        // Then safely remove listeners
        if (keyboardDidShowListener.current) {
          keyboardDidShowListener.current.remove();
          keyboardDidShowListener.current = null;
        }
        if (keyboardDidHideListener.current) {
          keyboardDidHideListener.current.remove();
          keyboardDidHideListener.current = null;
        }
      });
    };
  }, []);

  // Log state changes
  useEffect(() => {
    Logger.state('PostDetailScreen', 'keyboardVisible', keyboardVisible);
  }, [keyboardVisible]);
  
  useEffect(() => {
    Logger.state('PostDetailScreen', 'liked', liked);
  }, [liked]);
  
  useEffect(() => {
    Logger.state('PostDetailScreen', 'likesCount', likesCount);
  }, [likesCount]);
  
  useEffect(() => {
    Logger.state('PostDetailScreen', 'commentsCount', comments.length);
  }, [comments]);

  // Handle clean closing of the modal with proper keyboard cleanup
  const handleClosePress = () => {
    Logger.userAction('PostDetailScreen', 'Close button pressed', { postId: post.id });
    
    // First dismiss keyboard and reset local state
    Keyboard.dismiss();
    setKeyboardVisible(false);
    
    // Use InteractionManager to ensure keyboard dismissal completes
    InteractionManager.runAfterInteractions(() => {
      Logger.debug('PostDetailScreen', 'Executing onClose callback');
      // Clean up listeners before closing to prevent layout issues
      if (keyboardDidShowListener.current) {
        keyboardDidShowListener.current.remove();
        keyboardDidShowListener.current = null;
      }
      if (keyboardDidHideListener.current) {
        keyboardDidHideListener.current.remove();
        keyboardDidHideListener.current = null;
      }
      
      // Notify parent component about like state changes
      if (onLikeChange) {
        onLikeChange(liked);
      }
      
      // Finally call the onClose callback
      onClose();
    });
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatCommentTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  const handleLike = () => {
    Logger.userAction('PostDetailScreen', 'Like button pressed', { 
      postId: post.id, 
      currentLiked: liked
    });
    if (liked) {
      setLikesCount(likesCount - 1);
    } else {
      setLikesCount(likesCount + 1);
    }
    setLiked(!liked);
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    
    Logger.userAction('PostDetailScreen', 'Comment submitted', { 
      postId: post.id,
      commentLength: commentText.length
    });
    
    const newComment = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      text: commentText,
      timestamp: new Date().toISOString(),
      likes: 0
    };
    
    Logger.debug('PostDetailScreen', 'Adding new comment', newComment);
    setComments([newComment, ...comments]);
    setCommentText('');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 15) }]}>
        <TouchableOpacity onPress={handleClosePress} style={styles.closeButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Scrollable content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: keyboardVisible ? 100 : Math.max(15, safeBottomInset) }}
        keyboardShouldPersistTaps="handled"
        onScroll={(e) => {
          const offsetY = e.nativeEvent.contentOffset.y;
          if (offsetY % 100 === 0) { // Log only occasionally to reduce noise
            Logger.debug('PostDetailScreen', `Scroll position: ${offsetY}px`);
          }
        }}
        scrollEventThrottle={100}
      >
        {/* Post content */}
        <View style={styles.postContainer}>
          {/* Post header */}
          <View style={styles.postHeader}>
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

          {/* Stats row */}
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>{likesCount} likes • {comments.length} comments</Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Ionicons name={liked ? "heart" : "heart-outline"} size={24} color={liked ? "#FF2D55" : "#666"} />
              <Text style={[styles.actionText, liked && styles.likedText]}>Like</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={22} color="#666" />
              <Text style={styles.actionText}>Comment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share-social-outline" size={24} color="#666" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Comments section */}
        <View style={styles.commentsContainer}>
          <Text style={styles.commentsTitle}>Comments</Text>
          
          {comments.map(comment => (
            <View key={comment.id} style={styles.commentItem}>
              <Image source={{ uri: comment.userAvatar }} style={styles.commentAvatar} />
              <View style={styles.commentContent}>
                <View style={styles.commentBubble}>
                  <Text style={styles.commentUserName}>{comment.userName}</Text>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </View>
                <View style={styles.commentActions}>
                  <Text style={styles.commentTime}>{formatCommentTimestamp(comment.timestamp)}</Text>
                  <TouchableOpacity style={styles.likeCommentButton}>
                    <Text style={styles.likeCommentText}>Like</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.replyButton}>
                    <Text style={styles.replyText}>Reply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      
      {/* Comment input section - fixed at the bottom */}
      <View style={[
        styles.commentInputContainer,
        { paddingBottom: Math.max(10, safeBottomInset) }
      ]}>
        <Image source={{ uri: user.avatar }} style={styles.commentInputAvatar} />
        <TextInput
          style={styles.commentInput}
          placeholder="Write a comment..."
          value={commentText}
          onChangeText={(text) => {
            setCommentText(text);
            if (text.length % 10 === 0 && text.length > 0) { // Log occasionally
              Logger.debug('PostDetailScreen', `Comment text length: ${text.length}`);
            }
          }}
          onFocus={() => {
            Logger.userAction('PostDetailScreen', 'Comment input focused');
          }}
          onBlur={() => {
            Logger.userAction('PostDetailScreen', 'Comment input blurred');
          }}
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]} 
          onPress={handleComment}
          disabled={!commentText.trim()}
        >
          <Ionicons name="send" size={24} color={commentText.trim() ? "#007AFF" : "#C7C7CC"} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 10,
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 24, // Same width as the close button for balance
  },
  scrollContainer: {
    flex: 1,
  },
  postContainer: {
    backgroundColor: 'white',
    paddingBottom: 10,
  },
  postHeader: {
    flexDirection: 'row',
    padding: 15,
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
    paddingHorizontal: 15,
    paddingBottom: 15,
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 300,
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
  statsRow: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsText: {
    color: '#666',
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  likedText: {
    color: '#FF2D55',
  },
  commentsContainer: {
    backgroundColor: 'white',
    marginTop: 10,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 20,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: '#f0f2f5',
    borderRadius: 15,
    padding: 10,
  },
  commentUserName: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 5,
    marginLeft: 10,
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
    marginRight: 10,
  },
  likeCommentButton: {
    marginRight: 10,
  },
  likeCommentText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  replyButton: {},
  replyText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  commentInputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    backgroundColor: '#f0f2f5',
  },
  sendButton: {
    marginLeft: 10,
    padding: 5,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
