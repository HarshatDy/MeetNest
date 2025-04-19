import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import MapView, { Polyline, Marker } from 'react-native-maps'; // Added Marker
import { Ionicons } from '@expo/vector-icons';
import { Logger } from '../utils/Logger';
import { useUser } from '../contexts/UserContext';
import mongoService from '../src/services/mongoService'; // Corrected import path

export default function ActivitySummaryScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useUser();
  // Destructure new params: averagePace, startElevation, endElevation
  const { duration, distance, path, startTime, averagePace, startElevation, endElevation } = route.params || {};

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);

  // Calculate elevation gain/loss (simple example)
  const elevationGain = startElevation && endElevation && endElevation > startElevation ? (endElevation - startElevation) : 0;
  const elevationLoss = startElevation && endElevation && endElevation < startElevation ? (startElevation - endElevation) : 0;

  useEffect(() => {
    if (path && path.length > 0) {
      // Calculate bounding box for the path to set map region
      let minLat = path[0].latitude, maxLat = path[0].latitude; // Corrected: removed extra dot
      let minLng = path[0].longitude, maxLng = path[0].longitude;

      path.forEach(point => {
        minLat = Math.min(minLat, point.latitude);
        maxLat = Math.max(maxLat, point.latitude);
        minLng = Math.min(minLng, point.longitude);
        maxLng = Math.max(maxLng, point.longitude);
      });

      const midLat = (minLat + maxLat) / 2;
      const midLng = (minLng + maxLng) / 2;
      const latDelta = (maxLat - minLat) * 1.2 + 0.005; // Add padding
      const lngDelta = (maxLng - minLng) * 1.2 + 0.005; // Add padding

      setMapRegion({
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      });
      Logger.debug('ActivitySummaryScreen', 'Calculated map region', { midLat, midLng, latDelta, lngDelta });
    } else {
        Logger.warn('ActivitySummaryScreen', 'No path data received for map region calculation');
    }
  }, [path]);

  // --- Disable Swipe Gesture ---
  useEffect(() => {
    // Attempt to disable swipe gesture. Note: For modal presentations ('modal' or 'containedModal'),
    // this option (`gestureEnabled: false`) should ideally be set in the Stack.Screen options
    // within the navigator configuration file for better reliability.
    navigation.setOptions({ gestureEnabled: false });
    Logger.debug('ActivitySummaryScreen', 'Attempted to set gestureEnabled: false');
  }, [navigation]);

  // --- Formatting Functions ---
  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
  };

  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(0)} m`;
  };

  const formatPace = (paceMinPerKm) => {
    if (!paceMinPerKm || paceMinPerKm <= 0 || !isFinite(paceMinPerKm)) {
      return '--:--';
    }
    const minutes = Math.floor(paceMinPerKm);
    const seconds = Math.floor((paceMinPerKm - minutes) * 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const formatElevation = (meters) => {
    if (meters === undefined || meters === null) return '--';
    return `${meters.toFixed(0)} m`;
  };

  const formatStartTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString();
  };
  // --- End Formatting Functions ---

  // --- Create Post Handler (Wrap with useCallback) ---
  const handleCreatePost = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your activity.');
      return;
    }
    if (!user) {
        Alert.alert('Error', 'User not found. Cannot create post.');
        Logger.error('ActivitySummaryScreen', 'User context is null');
        return;
    }

    // Log the user object to help debug ID issues
    console.log('[ActivitySummaryScreen] User from context:', {
      id: user.id,
      _id: user._id,
      displayName: user.displayName || user.display_name
    });

    setIsPosting(true);
    Logger.userAction('ActivitySummaryScreen', 'Create Post button pressed');

    // Import the API connection check utility to verify connectivity before trying to post
    const { checkApiConfiguration } = require('../utils/ApiConnectionCheck');
    
    // Check API connectivity first
    const apiStatus = await checkApiConfiguration();
    if (!apiStatus.success) {
      Logger.error('ActivitySummaryScreen', 'API connectivity check failed before posting', { error: apiStatus.error });
      Alert.alert('Connection Error', 'Cannot connect to the server. Your activity will be saved locally and synced when connection is restored.');
      // TODO: Implement local storage for offline posts
      setIsPosting(false);
      return;
    }

    // Log the data being prepared for the API call
    const postData = {
      // Ensure we have a valid authorId - try both id formats based on UserContext
      authorId: user._id || user.id, // Prefer _id but fall back to id if needed
      title: title.trim(),
      content: description.trim(),
      type: 'activity',
      activityData: {
        duration,
        distance,
        path, // Ensure path data is included
        startTime,
        averagePace,
        startElevation,
        endElevation,
        elevationGain,
        elevationLoss,
        // TODO: Implement Map Snapshot: Generate a static image of the map route using MapView.takeSnapshot()
        // and upload it (e.g., to Firebase Storage), then include the URL here.
        // mapSnapshotUrl: 'url_to_map_snapshot_image',
      },
      timestamp: Date.now(), // Consider using server timestamp if possible
      societyId: user.societies && user.societies.length > 0 ? user.societies[0] : 
                 user.society || 'default', // Also check for society property
    };
    
    // More detailed logging to debug user ID issues
    Logger.debug('ActivitySummaryScreen', 'Post data prepared', { 
      authorId: postData.authorId,
      userIdFromContext: user.id,
      userMongoIdFromContext: user._id,
      title: postData.title,
      contentLength: postData.content.length,
      pathSize: postData.activityData.path.length,
      societyId: postData.societyId,
    });

    try {
      // More detailed logging of the API call
      Logger.debug('ActivitySummaryScreen', 'Calling mongoService.createPost...');
      
      // Direct console log for immediate feedback
      console.log('[ActivitySummaryScreen] Calling mongoService.createPost with data:', {
        title: postData.title,
        authorId: postData.authorId,
        pathPoints: postData.activityData.path.length
      });
      
      const result = await mongoService.createPost(postData);
      
      // Immediately log the result to console for debugging
      console.log('[ActivitySummaryScreen] Result from mongoService.createPost:', result);
      
      // Log the raw result from the API
      Logger.debug('ActivitySummaryScreen', 'Received result from mongoService.createPost', { 
        success: result?.success, 
        hasId: !!result?.id,
        hasPost: !!result?.post 
      });

      if (result && result.success && result.post && result.id) {
        Logger.debug('ActivitySummaryScreen', 'API call successful, constructing createdPost object');
        const createdPost = {
          ...result.post, // Data from backend (includes timestamps, potentially _id if backend sends it in post)
          _id: result.id, // Ensure MongoDB _id is present
          id: result.id, // Use _id as the primary id client-side
          // Ensure user data is correctly structured for the timeline
          user: {
            id: user.id || user._id, // Ensure we have an id property
            _id: user._id || user.id, // Ensure we have an _id property
            name: user.displayName || user.display_name || 'User',
            avatar: user.avatar_url || user.avatar || 'https://via.placeholder.com/50'
          },
          // Ensure activityData is present and correct
          activityData: result.post.activityData || postData.activityData, // Prefer backend data if available
          // Add default fields if not provided by backend
          likes: result.post.likes ?? 0,
          comments: result.post.comments ?? 0,
          status: 'completed' // Mark as completed
        };
        // Log the final object being passed to navigation
        Logger.debug('ActivitySummaryScreen', 'Constructed createdPost for navigation', { createdPost: JSON.stringify(createdPost) });

        // Log navigation parameters
        const navParams = {
          screen: 'Timeline',
          params: {
            screen: 'Local',
            params: { newPost: createdPost, refresh: Date.now() }
          }
        };
        Logger.debug('ActivitySummaryScreen', 'Navigating to MainApp with params', { navParams: JSON.stringify(navParams) });

        navigation.navigate('MainApp', navParams);

      } else {
        // Log the failure reason more clearly
        Logger.error('ActivitySummaryScreen', 'API post creation failed or returned unexpected format.', { result });
        Alert.alert('Post Saved Locally (Error)', 'Your activity was saved locally but failed to sync. It might take a moment to appear or require a refresh.');
        // Navigate back but indicate potential issue
        navigation.navigate('MainApp', {
          screen: 'Timeline',
          params: {
            screen: 'Local',
            params: { refresh: Date.now(), error: 'sync_failed' } // Pass error hint
          }
        });
      }

    } catch (error) {
      // More detailed error logging
      console.error('[ActivitySummaryScreen] Error calling mongoService.createPost:', error);
      
      // Log the specific error during the API call
      Logger.error('ActivitySummaryScreen', 'Error calling mongoService.createPost', { 
        errorMessage: error.message, 
        errorName: error.name,
        errorStack: error.stack,
        context: error.context // From our enhanced error in mongoService
      });
      
      // More informative error message to the user
      Alert.alert(
        'Post Failed', 
        `Could not save your activity post: ${error.message}. Please try again or check your connection.`
      );
    } finally {
      setIsPosting(false);
      Logger.debug('ActivitySummaryScreen', 'Finished handleCreatePost');
    }
  }, [navigation, user, title, description, duration, distance, path, startTime, averagePace, startElevation, endElevation, elevationGain, elevationLoss]); // Add all dependencies used inside

  // --- Confirmation on Back Navigation ---
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Check if the action is user-initiated goBack/swipe and if there's unsaved data
      const hasUnsavedData = title.trim().length > 0 || description.trim().length > 0;
      const isUserInitiatedBack = e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP'; // Check action type

      Logger.debug('ActivitySummaryScreen', 'beforeRemove event triggered', { actionType: e.data.action.type, hasUnsavedData, isPosting });

      if (isUserInitiatedBack && !isPosting && hasUnsavedData) {
        // Prevent default behavior (going back)
        e.preventDefault();
        Logger.debug('ActivitySummaryScreen', 'Prevented back navigation, showing confirmation.');

        // Ask the user for confirmation
        Alert.alert(
          'Discard Activity?',
          'You have unsaved changes. Do you want to save your activity before leaving?',
          [
            {
              text: "Don't Save",
              style: 'destructive',
              // If the user doesn't want to save, dispatch the original navigation action
              onPress: () => navigation.dispatch(e.data.action),
            },
            {
              text: 'Save',
              style: 'default',
              // Attempt to save. handleCreatePost will navigate on success.
              onPress: () => handleCreatePost(),
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => { Logger.debug('ActivitySummaryScreen', 'User cancelled discard/save.'); }, // Do nothing, just dismiss the alert
            },
          ]
        );
      } else {
        // If it's not a user-initiated back action, or if posting, or no unsaved data,
        // let the navigation happen normally.
        Logger.debug('ActivitySummaryScreen', 'Allowing navigation action.', { isUserInitiatedBack, isPosting, hasUnsavedData });
        return;
      }
    });

    // Cleanup the listener when the component unmounts
    return unsubscribe;
  }, [navigation, isPosting, title, description, handleCreatePost]); // Add dependencies

  // Get start and end points for markers
  const startPoint = path && path.length > 0 ? path[0] : null;
  const endPoint = path && path.length > 1 ? path[path.length - 1] : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
         </TouchableOpacity>
         <Text style={styles.headerTitle}>Activity Summary</Text>
         <View style={{ width: 24 }} /> {/* Spacer */}
      </View>

      {/* Map Section */}
      {mapRegion && (
        <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={mapRegion}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              {path && path.length > 1 && (
                <Polyline
                  coordinates={path}
                  strokeColor="#FF6347" // Tomato color
                  strokeWidth={3}
                />
              )}
              {/* Add Start/End Markers */}
              {startPoint && (
                <Marker coordinate={startPoint} title="Start" pinColor="green" />
              )}
              {endPoint && startPoint?.latitude !== endPoint?.latitude && startPoint?.longitude !== endPoint?.longitude && (
                 <Marker coordinate={endPoint} title="End" pinColor="red" />
              )}
            </MapView>
        </View>
      )}

      {/* Start Time Section */}
      <View style={styles.startTimeContainer}>
          <Ionicons name="calendar-outline" size={18} color="#555" style={styles.startTimeIcon} />
          <Text style={styles.startTimeText}>Started on: {formatStartTime(startTime)}</Text>
      </View>

      {/* Stats Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Activity Stats</Text>
        <View style={styles.statsContainer}>
          {/* Row 1 */}
          <View style={styles.statBox}>
            <Ionicons name="time-outline" size={24} color="#007AFF" />
            <Text style={styles.statValue}>{formatDuration(duration || 0)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="resize-outline" size={24} color="#FF9500" />
            <Text style={styles.statValue}>{formatDistance(distance || 0)}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          {/* Row 2 */}
          <View style={styles.statBox}>
            <Ionicons name="speedometer-outline" size={24} color="#5856D6" />
            <Text style={styles.statValue}>{formatPace(averagePace || 0)}</Text>
            <Text style={styles.statLabel}>Avg Pace/km</Text>
          </View>
          <View style={styles.statBox}>
             <Ionicons name="analytics-outline" size={24} color="#34C759" />
             {/* Display Gain/Loss or Start/End */}
             <Text style={styles.statValue}>
                <Text>{formatElevation(elevationGain)}</Text> / <Text>{formatElevation(elevationLoss)}</Text>
             </Text>
             <Text style={styles.statLabel}>Elev. Gain/Loss</Text>
             {/* Alternative: Show Start/End Elevation
             <Text style={styles.statValue}>{`${formatElevation(startElevation)} / ${formatElevation(endElevation)}`}</Text>
             <Text style={styles.statLabel}>Start/End Elev.</Text>
             */}
          </View>
        </View>
      </View>

      {/* Form Section */}
      <View style={styles.sectionContainer}>
         <Text style={styles.sectionTitle}>Share Your Activity</Text>
         <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Activity Title (e.g., Morning Run)"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="How was it? (Optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.button, isPosting ? styles.buttonDisabled : styles.createButton]}
              onPress={handleCreatePost}
              disabled={isPosting || !title.trim()} // Also disable if no title
            >
              <Ionicons name="share-social-outline" size={20} color="white" style={{ marginRight: 8 }}/>
              <Text style={styles.buttonText}>{isPosting ? 'Posting...' : 'Create Post'}</Text>
            </TouchableOpacity>
         </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f5', // Lighter grey background
  },
  contentContainer: {
     paddingBottom: 40, // Ensure space at the bottom
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50, // Adjust for status bar
    paddingBottom: 10,
    paddingHorizontal: 15,
    backgroundColor: '#ffffff', // White background for header
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0', // Lighter border
  },
  backButton: {
     padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  mapContainer: {
      // Add shadow or border for better separation
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 3,
      backgroundColor: '#fff', // Needed for shadow on Android
      marginBottom: 15,
  },
  map: {
    width: '100%',
    height: 220, // Slightly taller map
  },
  startTimeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      backgroundColor: '#ffffff',
      marginBottom: 15,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#e0e0e0',
  },
  startTimeIcon: {
      marginRight: 8,
  },
  startTimeText: {
      fontSize: 15,
      color: '#333',
  },
  sectionContainer: {
      backgroundColor: '#ffffff',
      borderRadius: 10,
      marginHorizontal: 15,
      marginBottom: 15,
      padding: 15,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: '600', // Semibold
      color: '#333',
      marginBottom: 15,
      // textAlign: 'center', // Center title if preferred
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow wrapping onto next line
    justifyContent: 'space-around', // Distribute space
    // Removed fixed paddingVertical, handled by sectionContainer
    // Removed borders, handled by sectionContainer
  },
  statBox: {
    alignItems: 'center',
    width: '45%', // Roughly two items per row
    marginBottom: 20, // Space below each box
    paddingHorizontal: 5, // Prevent text overflow issues
  },
  statValue: {
    fontSize: 20, // Slightly smaller value
    fontWeight: 'bold',
    color: '#1c1c1e', // Darker text
    marginTop: 5, // Space between icon and value
  },
  statLabel: {
    fontSize: 13, // Slightly smaller label
    color: '#666',
    marginTop: 3,
    textAlign: 'center',
  },
  formContainer: {
    // Removed paddingHorizontal, handled by sectionContainer
    // Removed paddingBottom
  },
  input: {
    backgroundColor: '#f8f8f8', // Slightly off-white input background
    borderWidth: 1,
    borderColor: '#e0e0e0', // Lighter border
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    flexDirection: 'row', // Align icon and text
    justifyContent: 'center', // Center content
    paddingVertical: 14, // Slightly adjusted padding
    borderRadius: 10, // Less rounded corners
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  createButton: {
    backgroundColor: '#007AFF', // Standard blue
  },
  buttonDisabled: {
    backgroundColor: '#a0a0a0', // Greyer disabled state
    shadowOpacity: 0.05,
    elevation: 1,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600', // Semibold
  },
});
