import React, { useState, useContext, useEffect, useCallback } from 'react';
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
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import { TimelineContext } from '../contexts/TimelineContext';
import { Logger } from '../utils/Logger';
import { useUser } from '../contexts/UserContext'; // Import useUser
import MapView, { Marker } from 'react-native-maps'; // Import MapView and Marker
import * as Location from 'expo-location'; // Import expo-location

export default function PostingScreen() {
  // Top-level log for render (guaranteed to run on every render)
  console.log('[PostingScreen] Component rendering (top-level)');
  Logger.debug('PostingScreen', 'Component rendering...');

  const [postText, setPostText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [activity, setActivity] = useState('');
  const [challengeEnabled, setChallengeEnabled] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationErrorMsg, setLocationErrorMsg] = useState(null);
  
  const navigation = useNavigation();
  const { user } = useUser(); // Get user data
  
  const timelineContext = useContext(TimelineContext);
  
  const addPostToTimeline = (post) => {
    Logger.debug('PostingScreen', 'Adding post to timeline', { 
      hasContext: !!timelineContext,
      postId: post.id
    });
    
    if (timelineContext && timelineContext.addPost) {
      timelineContext.addPost(post);
    } else {
      Logger.error('PostingScreen', 'TimelineContext not available');
      Alert.alert(
        'Error',
        'Unable to post at this time. Please try again later.',
        [{ text: 'OK' }]
      );
      setIsPosting(false);
      return false;
    }
    
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
    if (!postText || !selectedImage) {
      Alert.alert('Incomplete Post', 'Both text and image are required to create a post.');
      return;
    }
    
    setIsPosting(true);
    
    try {
      const newPost = {
        id: Date.now().toString(),
        content: postText,
        image: selectedImage,
        activity: activity,
        challengeEnabled: challengeEnabled,
        timestamp: new Date().toISOString(),
        user: {
          id: user?.id || 'currentUser',
          name: user?.display_name || 'Current User',
          avatar: user?.avatar_url || 'https://via.placeholder.com/50'
        },
        likes: 0,
        comments: 0, 
        status: 'uploading'
      };
      
      const success = addPostToTimeline(newPost);
      
      if (success) {
        setPostText('');
        setSelectedImage(null);
        setActivity('');
        setChallengeEnabled(false);
      }
    } catch (error) {
      Logger.error('PostingScreen', 'Error creating post', { error: error.message });
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  // Print all available navigators and root navigators on mount
  useEffect(() => {
    // Helper to recursively print navigator hierarchy
    function printNavigatorTree(nav, level = 0) {
      if (!nav) return;
      const prefix = '  '.repeat(level);
      try {
        const state = nav.getState?.();
        if (state) {
          console.log(`${prefix}[Navigator Level ${level}] type: ${state.type}, routeNames:`, state.routeNames);
          if (state.routes && state.routes.length > 0) {
            state.routes.forEach((route, idx) => {
              console.log(`${prefix}  [Route ${idx}] name: ${route.name}`);
            });
          }
        } else {
          console.log(`${prefix}[Navigator Level ${level}] No state available`);
        }
      } catch (e) {
        console.log(`${prefix}[Navigator Level ${level}] Error reading state`, e);
      }
      // Recurse up to parent
      if (nav.getParent) {
        printNavigatorTree(nav.getParent(), level + 1);
      }
    }

    console.log('--- PostingScreen: Printing all available navigators (from innermost to root) ---');
    printNavigatorTree(navigation, 0);
    console.log('--- PostingScreen: End of navigator tree ---');
  }, [navigation]);

  // --- Fetch User Location ---
  useEffect(() => {
    (async () => {
      setLocationLoading(true);
      setLocationErrorMsg(null);
      Logger.debug('PostingScreen', 'Requesting location permission...');
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationErrorMsg('Permission to access location was denied');
        Logger.warn('PostingScreen', 'Location permission denied');
        setLocationLoading(false);
        return;
      }

      try {
        Logger.debug('PostingScreen', 'Fetching current location...');
        let location = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setCurrentLocation(coords);
        setMapRegion({
          ...coords,
          latitudeDelta: 0.01, // Zoom level
          longitudeDelta: 0.01, // Zoom level
        });
        Logger.debug('PostingScreen', 'Location fetched successfully', coords);
      } catch (error) {
        setLocationErrorMsg('Failed to fetch location');
        Logger.error('PostingScreen', 'Error fetching location', error);
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);
  // --- End Fetch User Location ---

  const isPostButtonEnabled = postText && selectedImage && !isPosting;

  const handleStartActivity = () => {
    Logger.userAction('PostingScreen', 'Start Activity button pressed');

    // Check if location is available before navigating
    if (locationLoading) {
        Alert.alert('Location Loading', 'Please wait while we fetch your current location.');
        Logger.warn('PostingScreen', 'Start Activity aborted: Location still loading.');
        return;
    }
    if (locationErrorMsg || !currentLocation) {
        Alert.alert('Location Error', 'Could not get your current location. Please ensure location services are enabled and permissions granted.');
        Logger.warn('PostingScreen', 'Start Activity aborted: Location error or unavailable.', { locationErrorMsg, hasLocation: !!currentLocation });
        return;
    }

    Logger.debug('PostingScreen', "Attempting to navigate to 'ActivityTracking' with location", { currentLocation });

    // Print navigator tree for debugging
    function printNavigatorTree(nav, level = 0) {
      if (!nav) return;
      const prefix = '  '.repeat(level);
      try {
        const state = nav.getState?.();
        if (state) {
          console.log(`${prefix}[Navigator Level ${level}] type: ${state.type}, routeNames:`, state.routeNames);
          if (state.routes && state.routes.length > 0) {
            state.routes.forEach((route, idx) => {
              console.log(`${prefix}  [Route ${idx}] name: ${route.name}`);
            });
          }
        } else {
          console.log(`${prefix}[Navigator Level ${level}] No state available`);
        }
      } catch (e) {
        console.log(`${prefix}[Navigator Level ${level}] Error reading state`, e);
      }
      if (nav.getParent) {
        printNavigatorTree(nav.getParent(), level + 1);
      }
    }
    console.log('--- PostingScreen: Printing all available navigators (from innermost to root) ---');
    printNavigatorTree(navigation, 0);
    console.log('--- PostingScreen: End of navigator tree ---');

    try {
        const parentNav = navigation.getParent();
        const rootNav = parentNav?.getParent();

        Logger.debug('PostingScreen', 'Navigation attempts will be made in this order:', {
          usingParent: !!parentNav,
          usingRoot: !!rootNav,
          usingCommonActions: true,
          usingDirectNavigation: true
        });

        // Pass currentLocation as a parameter
        const navigationParams = { initialLocation: currentLocation };

        if (parentNav) {
            parentNav.navigate('ActivityTracking', navigationParams);
            Logger.debug('PostingScreen', "Parent navigation dispatched for 'ActivityTracking' with params");
            return;
        }

        if (rootNav) {
            rootNav.navigate('ActivityTracking', navigationParams);
            Logger.debug('PostingScreen', "Root navigation dispatched for 'ActivityTracking' with params");
            return;
        }

        navigation.dispatch(
            CommonActions.navigate({
                name: 'ActivityTracking',
                params: navigationParams,
            })
        );
        Logger.debug('PostingScreen', "CommonActions navigation dispatched for 'ActivityTracking' with params");
    } catch (error) {
        Logger.error('PostingScreen', "Error dispatching navigation to 'ActivityTracking'", error);
        Alert.alert('Navigation Error', 'Could not open activity tracking screen. See logs for details.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* --- Map Section --- */}
      <View style={styles.mapSection}>
        {locationLoading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : locationErrorMsg ? (
          <Text style={styles.errorText}>{locationErrorMsg}</Text>
        ) : mapRegion ? (
          <MapView
            style={styles.map}
            region={mapRegion}
            showsUserLocation={false} // We use a custom marker
            scrollEnabled={false}
            zoomEnabled={false}
          >
            {currentLocation && (
              <Marker
                coordinate={currentLocation}
                title="Your Location"
                pinColor="blue"
              />
            )}
          </MapView>
        ) : (
          <Text style={styles.errorText}>Map unavailable</Text> // Fallback
        )}
      </View>
      {/* --- End Map Section --- */}

      <TouchableOpacity 
        style={styles.startActivityButton} 
        onPress={handleStartActivity}
        disabled={isPosting}
      >
        <Ionicons name="walk-outline" size={24} color="white" />
        <Text style={styles.startActivityButtonText}>Start an Activity</Text>
      </TouchableOpacity>

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
            <Text style={styles.imagePickerText}>Add Photo to Post</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={styles.postInput}
        placeholder="What's on your mind?????????????????????"
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
  mapSection: {
    height: 180, // Adjust height as needed
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0', // Placeholder background
    margin: 15,
    borderRadius: 8,
    overflow: 'hidden', // Clip map to rounded corners
  },
  map: {
    ...StyleSheet.absoluteFillObject, // Make map fill the container
  },
  errorText: {
    color: 'red',
    fontSize: 14,
  },
  startActivityButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6347',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0, // Remove top margin if map is directly above
  },
  startActivityButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  imageSection: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    // Removed marginBottom: 10, handled by spacing around map/button
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
    textAlign: 'center',
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
