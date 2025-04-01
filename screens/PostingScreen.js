import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Switch,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
// Fix: Update the import path to match the correct location
import { TimelineContext } from '../contexts/TimelineContext';
// Add Logger for consistency with other components
import { Logger } from '../utils/Logger';

export default function PostingScreen() {
  const [postText, setPostText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [activity, setActivity] = useState('');
  const [challengeEnabled, setChallengeEnabled] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  
  const navigation = useNavigation();
  
  // Fix: Add a fallback for when context is not available
  const timelineContext = useContext(TimelineContext);
  
  // Add a safe function to add posts that won't crash if context is missing
  const addPostToTimeline = (post) => {
    // Log the context state for debugging
    Logger.debug('PostingScreen', 'Adding post to timeline', { 
      hasContext: !!timelineContext,
      postId: post.id
    });
    
    // Only call addPost if the context exists
    if (timelineContext && timelineContext.addPost) {
      timelineContext.addPost(post);
    } else {
      // Log the error and show a user-friendly message
      Logger.error('PostingScreen', 'TimelineContext not available');
      Alert.alert(
        'Error',
        'Unable to post at this time. Please try again later.',
        [{ text: 'OK' }]
      );
      setIsPosting(false);
      return false;
    }
    
    // Navigate to the timeline screen
    navigation.navigate('Timeline', {
      screen: 'Local', 
      params: { 
        newPost: post, 
        postStatus: 'uploading',
        refresh: Date.now()
      }
    });
    
    return true;
  };

  const pickImage = async () => {
    try {
      // Simplify the ImagePicker call to avoid errors
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const createPost = async () => {
    // Require both text and image for posting
    if (!postText || !selectedImage) {
      Alert.alert('Incomplete Post', 'Both text and image are required to create a post.');
      return;
    }
    
    // Set posting status
    setIsPosting(true);
    
    try {
      // Create a new post object
      const newPost = {
        id: Date.now().toString(), // Simple unique ID
        content: postText,
        image: selectedImage,
        activity: activity,
        challengeEnabled: challengeEnabled,
        timestamp: new Date().toISOString(),
        user: {
          // Add user data here, for now using placeholder
          id: 'currentUser',
          name: 'Current User',
          avatar: 'https://via.placeholder.com/50'
        },
        likes: 0,
        comments: [],
        status: 'uploading' // Add status for tracking in timeline
      };
      
      // Add the post to the timeline and check success
      const success = addPostToTimeline(newPost);
      
      if (success) {
        // Reset form only on success
        setPostText('');
        setSelectedImage(null);
        setActivity('');
        setChallengeEnabled(false);
      }
    } catch (error) {
      Logger.error('PostingScreen', 'Error creating post', { error: error.message });
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      // Reset posting status
      setIsPosting(false);
    }
  };

  // Calculate if post button should be enabled
  const isPostButtonEnabled = postText && selectedImage && !isPosting;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageSection}>
        {selectedImage ? (
          <View style={styles.selectedImageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
            <TouchableOpacity 
              style={styles.removeImageButton}
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close-circle" size={24} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            <Ionicons name="image-outline" size={40} color="#007AFF" />
            <Text style={styles.imagePickerText}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={styles.postInput}
        placeholder="What's on your mind?"
        multiline
        value={postText}
        onChangeText={setPostText}
        editable={!isPosting}
      />

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity (Optional)</Text>
        <TextInput
          style={styles.activityInput}
          placeholder="e.g., Community Cleanup, Tennis Match"
          value={activity}
          onChangeText={setActivity}
          editable={!isPosting}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <Text style={styles.sectionTitle}>Enable Challenge</Text>
          <Switch
            trackColor={{ false: '#767577', true: '#007AFF' }}
            thumbColor={challengeEnabled ? '#f4f3f4' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={setChallengeEnabled}
            value={challengeEnabled}
            disabled={isPosting}
          />
        </View>
        <Text style={styles.helpText}>
          Allow friends to challenge your activity and schedule a competition
        </Text>
      </View>

      <View style={styles.requirements}>
        <Text style={[styles.requirementText, postText ? styles.requirementMet : styles.requirementNotMet]}>
          • Post text is required
        </Text>
        <Text style={[styles.requirementText, selectedImage ? styles.requirementMet : styles.requirementNotMet]}>
          • Image is required
        </Text>
      </View>

      {/* Posting status indicator */}
      {isPosting ? (
        <View style={styles.postingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.postingText}>Posting...</Text>
        </View>
      ) : (
        <TouchableOpacity 
          style={[
            styles.postButton, 
            !isPostButtonEnabled && styles.postButtonDisabled
          ]} 
          onPress={createPost}
          disabled={!isPostButtonEnabled}
        >
          <Text style={styles.postButtonText}>Post</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageSection: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePicker: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  imagePickerText: {
    marginTop: 10,
    color: '#007AFF',
    fontSize: 16,
  },
  selectedImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
  },
  postInput: {
    padding: 15,
    minHeight: 100,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 15,
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  activityInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  postButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    margin: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  postButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  postingContainer: {
    padding: 15,
    margin: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  postingText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  requirements: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    marginHorizontal: 15,
  },
  requirementText: {
    fontSize: 14,
    marginBottom: 5,
  },
  requirementMet: {
    color: 'green',
  },
  requirementNotMet: {
    color: 'red',
  },
});
