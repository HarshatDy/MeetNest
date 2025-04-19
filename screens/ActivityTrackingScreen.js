import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, AppState, ActivityIndicator } from 'react-native'; // Added ActivityIndicator
// Remove PROVIDER_GOOGLE import
import MapView, { Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native'; // Import useRoute
import { Logger } from '../utils/Logger';
import haversine from 'haversine-distance'; // Import haversine

// TODO: Define constants for tracking states (IDLE, TRACKING, PAUSED)

export default function ActivityTrackingScreen() {
  const navigation = useNavigation();
  const route = useRoute(); // Get route object
  const initialLocation = route.params?.initialLocation; // Get passed location

  const [location, setLocation] = useState(initialLocation || null); // Initialize with passed location if available
  const [errorMsg, setErrorMsg] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0); // Distance in meters
  const [path, setPath] = useState([]); // Array of coordinates { latitude, longitude }
  const [pace, setPace] = useState(0); // Pace in minutes per kilometer
  const [currentElevation, setCurrentElevation] = useState(initialLocation?.altitude || null); // Use initial altitude if available
  const [mapReady, setMapReady] = useState(!!initialLocation); // Set map ready if location was passed
  const mapRef = useRef(null);
  const intervalRef = useRef(null);
  const locationSubscription = useRef(null);
  const appState = useRef(AppState.currentState);
  const lastLocationTimestamp = useRef(null); // To calculate pace

  // --- Permission Handling & Initial Location ---
  useEffect(() => {
    const initializeLocation = async () => {
      Logger.debug('ActivityTrackingScreen', 'Initializing location...', { hasInitialLocation: !!initialLocation });

      // 1. Request Permissions
      Logger.debug('ActivityTrackingScreen', 'Requesting location permissions');
      let { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        setErrorMsg('Foreground location permission is required to track activity.');
        Alert.alert(
          'Permission Required',
          'Please grant location permission in your device settings to use this feature.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        Logger.warn('ActivityTrackingScreen', 'Foreground location permission denied');
        setMapReady(false); // Ensure map doesn't render if permission denied
        return;
      }
      Logger.debug('ActivityTrackingScreen', 'Foreground permission granted');

      // TODO: Background permissions if needed

      // 2. Use Initial Location or Fetch New One
      if (initialLocation) {
        Logger.debug('ActivityTrackingScreen', 'Using initial location passed from previous screen', { initialLocation });
        setLocation(initialLocation);
        setCurrentElevation(initialLocation.altitude); // Assume altitude is passed or fetch if needed
        setMapReady(true); // Map is ready since we have location
        centerMapOnLocation(initialLocation); // Center map immediately
      } else {
        Logger.debug('ActivityTrackingScreen', 'No initial location passed, fetching current location...');
        await getCurrentLocation(); // Fetch location if not passed
      }
    };

    initializeLocation();

    // Clean up subscription on unmount
    return () => {
      locationSubscription.current?.remove();
      clearInterval(intervalRef.current);
    };
  }, [navigation, initialLocation]); // Add initialLocation to dependency array

  // --- App State Handling ---
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        Logger.debug('ActivityTrackingScreen', 'App returned to foreground');
        // Re-check permissions or state if needed
      }
      appState.current = nextAppState;
      Logger.debug('ActivityTrackingScreen', `App state: ${appState.current}`);
    });

    return () => {
      subscription.remove();
    };
  }, []);


  // --- Location Functions ---
  const centerMapOnLocation = (coords) => {
      // Center map on location - Use timeout to ensure map is rendered
      setTimeout(() => {
        if (mapRef.current && coords) {
            Logger.debug('ActivityTrackingScreen', 'Animating map to location.', { coords });
            mapRef.current.animateToRegion({
              latitude: coords.latitude,
              longitude: coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
        } else {
            Logger.warn('ActivityTrackingScreen', 'Map ref not available or no coords for animation.');
        }
      }, 100); // Small delay
  };

  const getCurrentLocation = async () => {
    try {
      Logger.debug('ActivityTrackingScreen', 'Attempting to get current position...');
      // Request high accuracy for initial elevation
      let currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const coords = currentLocation.coords;
      setLocation(coords);
      setCurrentElevation(coords.altitude); // Set initial elevation
      Logger.debug('ActivityTrackingScreen', 'Got current location', { coords });

      setMapReady(true); // Set map ready state AFTER location is confirmed
      Logger.debug('ActivityTrackingScreen', 'Map is now ready to render.');

      centerMapOnLocation(coords); // Center map

    } catch (error) {
      Logger.error('ActivityTrackingScreen', 'Error getting current location', error);
      setErrorMsg('Could not fetch current location.');
      setMapReady(false); // Ensure map doesn't try to render on error
    }
  };

  // --- Tracking Controls ---
  const handleStartTracking = async () => {
    Logger.userAction('ActivityTrackingScreen', 'Start Tracking pressed');
    if (!location) {
        Alert.alert('Location Unavailable', 'Cannot start tracking without current location.');
        Logger.warn('ActivityTrackingScreen', 'Start tracking aborted: Location unavailable.');
        return;
    }
    // Reset start elevation based on the *current* location when tracking starts
    const startElevation = location.altitude;
    Logger.debug('ActivityTrackingScreen', 'Setting start elevation', { startElevation });

    setIsTracking(true);
    setStartTime(Date.now());
    setDuration(0);
    setDistance(0); // Reset distance
    setPace(0); // Reset pace
    // setCurrentElevation(startElevation); // Elevation will update via watchPositionAsync
    setPath(location ? [{ latitude: location.latitude, longitude: location.longitude }] : []); // Start path with current location
    lastLocationTimestamp.current = Date.now(); // Initialize timestamp

    // Start timer
    intervalRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    // Start location updates
    try {
        Logger.debug('ActivityTrackingScreen', 'Attempting to start location watching...');
        locationSubscription.current = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.BestForNavigation, // High accuracy needed for altitude and pace
                timeInterval: 5000, // Update every 5 seconds
                distanceInterval: 10, // Update every 10 meters
            },
            (newLocation) => {
                const { latitude, longitude, altitude, speed } = newLocation.coords; // Get altitude and speed
                const currentTime = newLocation.timestamp || Date.now(); // Use timestamp from location if available

                setLocation(newLocation.coords); // Update current location state
                setCurrentElevation(altitude); // Update elevation

                setPath(prevPath => {
                    const newPoint = { latitude, longitude };
                    let distanceIncrement = 0;
                    let timeIncrement = 0;

                    if (prevPath.length > 0) {
                        const lastPoint = prevPath[prevPath.length - 1];
                        distanceIncrement = haversine(lastPoint, newPoint); // Calculate distance in meters

                        if (lastLocationTimestamp.current) {
                            timeIncrement = (currentTime - lastLocationTimestamp.current) / 1000; // Time diff in seconds
                        }

                        // Calculate Pace (minutes per kilometer)
                        if (distanceIncrement > 1 && timeIncrement > 0) { // Avoid division by zero and small movements
                            const speedMetersPerSecond = distanceIncrement / timeIncrement;
                            const paceMinutesPerKm = (1 / speedMetersPerSecond) * (1000 / 60);
                            setPace(paceMinutesPerKm);
                            Logger.debug('ActivityTrackingScreen', `Pace: ${paceMinutesPerKm.toFixed(2)} min/km`);
                        } else {
                            // If no significant movement or time, keep previous pace or set to 0
                            // setPace(0); // Or keep the last known pace
                        }

                        setDistance(prevDistance => prevDistance + distanceIncrement);
                        Logger.debug('ActivityTrackingScreen', `Distance increment: ${distanceIncrement.toFixed(2)}m`);
                    }
                    lastLocationTimestamp.current = currentTime; // Update last timestamp
                    return [...prevPath, newPoint]; // Add new point to path
                });

                // Optional: Center map on new location
                // if (mapRef.current) {
                //   mapRef.current.animateToRegion({
                //     latitude,
                //     longitude,
                //     latitudeDelta: 0.01, // Adjust zoom level as needed
                //     longitudeDelta: 0.01,
                //   });
                // }

                Logger.debug('ActivityTrackingScreen', 'Location update received', { coords: newLocation.coords });
            }
        );
        Logger.debug('ActivityTrackingScreen', 'Successfully started location watching');
    } catch (error) {
        Logger.error('ActivityTrackingScreen', 'Error starting location updates', error);
        setErrorMsg('Could not start location tracking.');
        handleStopTracking(false); // Stop if watch fails
    }
  };

  const handleStopTracking = (navigate = true) => {
    Logger.userAction('ActivityTrackingScreen', 'Stop Tracking pressed');
    setIsTracking(false);
    locationSubscription.current?.remove();
    locationSubscription.current = null;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    lastLocationTimestamp.current = null; // Reset timestamp ref
    Logger.debug('ActivityTrackingScreen', 'Stopped location watching and timer');

    if (navigate && path.length > 1 && distance > 10) { // Only navigate if some distance was covered
      // Get start and end elevation from the path or state
      const startElevation = path.length > 0 ? path[0].altitude : location?.altitude; // Need altitude in path points or use initial state
      const endElevation = currentElevation; // Use the last known elevation

      Logger.debug('ActivityTrackingScreen', 'Navigating to ActivitySummary', {
          duration,
          distance,
          pathLength: path.length,
          startTime,
          startElevation, // Pass start elevation
          endElevation,   // Pass end elevation
          averagePace: pace // Pass average pace (might need calculation if 'pace' is instantaneous)
      });
      navigation.replace('ActivitySummary', {
          duration,
          distance,
          path, // Ensure path includes altitude if needed by summary, otherwise just lat/lng
          startTime,
          startElevation,
          endElevation,
          averagePace: pace // Pass the last calculated pace (or calculate average if needed)
      });
    } else if (navigate) {
        Alert.alert('Activity Stopped', 'No significant activity recorded. Discarding.');
        navigation.goBack();
    }
    // Reset state if needed, or keep data for summary screen
  };

  // --- Helper Functions ---
   const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
  };

   const formatPace = (paceMinPerKm) => {
       if (!paceMinPerKm || paceMinPerKm <= 0 || !isFinite(paceMinPerKm)) {
           return '--:--';
       }
       const minutes = Math.floor(paceMinPerKm);
       const seconds = Math.floor((paceMinPerKm - minutes) * 60);
       return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
   };

  // --- Render ---
  let mapRegion = location ? {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : null;

  Logger.debug('ActivityTrackingScreen', 'Rendering component', { hasLocation: !!location, mapReady, errorMsg, isTracking });

  return (
    <View style={styles.container}>
      {/* Conditionally render MapView only when mapReady is true */}
      {mapReady && location ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={mapRegion} // Use initialRegion for the first load
          // region={isTracking ? undefined : mapRegion} // Let it follow user when tracking, otherwise stay centered
          showsUserLocation={true}
          followsUserLocation={isTracking} // Follow user only when tracking
          onMapReady={() => {
              Logger.debug('ActivityTrackingScreen', 'MapView onMapReady event fired.');
              // If location was passed initially, ensure map centers again after native map is ready
              if (initialLocation) centerMapOnLocation(initialLocation);
          }}
          onError={(error) => Logger.error('ActivityTrackingScreen', 'MapView onError event', error)} // Log map errors
        >
          {path.length > 1 && (
            <Polyline
              coordinates={path}
              strokeColor="#FF6347" // Tomato color
              strokeWidth={4}
            />
          )}
        </MapView>
      ) : (
        // Show loading indicator or error message
        <View style={styles.loadingContainer}>
          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : (
            <>
              <ActivityIndicator size="large" color="#007AFF" />
              {/* Update loading text based on whether initial location was passed */}
              <Text style={{ marginTop: 10 }}>{initialLocation ? 'Preparing map...' : 'Fetching location...'}</Text>
            </>
          )}
        </View>
      )}

      {/* Overlay remains the same */}
      <View style={styles.overlay}>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{distance.toFixed(0)} m</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatPace(pace)}</Text>
            <Text style={styles.statLabel}>Pace (min/km)</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{currentElevation?.toFixed(0) ?? '--'} m</Text>
            <Text style={styles.statLabel}>Elevation</Text>
          </View>
        </View>

        <View style={styles.controlsContainer}>
          {!isTracking ? (
            // Pass disabled state to style function
            <TouchableOpacity style={[styles.button, styles.startButton(!mapReady || !location)]} onPress={handleStartTracking} disabled={!mapReady || !location}>
              <Ionicons name="play" size={24} color="white" />
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={() => handleStopTracking(true)}>
              <Ionicons name="stop" size={24} color="white" />
              <Text style={styles.buttonText}>Stop & Save</Text>
            </TouchableOpacity>
          )}
           {/* TODO: Add Pause/Resume button */}
        </View>
        {/* Display error message within overlay if needed, or rely on the main view error */}
        {/* {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>} */}
      </View>
       {/* Close button remains the same */}
       <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={30} color="#555" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    // Remove center alignment to allow map/loading view to fill screen
    // justifyContent: 'center',
    // alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20, // Add padding for error text
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Use space-around or space-between
    width: '100%',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
    minWidth: 70, // Ensure boxes have some minimum width
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  startButton: (disabled) => ({ // Corrected function style
      backgroundColor: '#4CD964', // Green
      opacity: disabled ? 0.5 : 1, // Dim when disabled
      // Ensure all button base styles are here or inherited correctly
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 25,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 10,
  }),
  stopButton: {
    backgroundColor: '#FF3B30', // Red
    // Add base button styles if not using styles.button alongside it
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  errorText: {
      // marginTop: 10, // Removed margin top, handled by loadingContainer padding
      color: 'red',
      textAlign: 'center',
      fontSize: 16,
  },
  closeButton: {
      position: 'absolute',
      top: 50, // Adjust based on status bar height/notch
      right: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      borderRadius: 15,
      padding: 5,
  },
});
