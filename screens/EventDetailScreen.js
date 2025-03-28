import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Share,
  Platform,
  Keyboard,
  Alert,
  InteractionManager,
  BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Logger } from '../utils/Logger';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

export default function EventDetailScreen({ event, status, onClose, bottomInset = 0, onParticipationChange }) {
  // Initialize state with props but don't update when props change
  const [participating, setParticipating] = useState(event.userParticipating || false);
  const [participantsCount, setParticipantsCount] = useState(event.participants || 0);
  const insets = useSafeAreaInsets();

  // Use useCallback for functions passed to child components
  const handleParticipation = useCallback(() => {
    Logger.debug('EventDetailScreen', 'Participation toggled', { 
      eventId: event.id, 
      newState: !participating 
    });
    
    if (status === "scheduled") {
      if (participating) {
        Alert.alert(
          "Cancel Participation", 
          "Are you sure you want to cancel your participation in this event?",
          [
            {
              text: "No",
              style: "cancel"
            },
            {
              text: "Yes",
              onPress: () => {
                setParticipantsCount(prev => Math.max(0, prev - 1));
                setParticipating(false);
              }
            }
          ]
        );
      } else {
        setParticipantsCount(prev => prev + 1);
        setParticipating(true);
      }
    }
  }, [participating, status, event.id]);

  // Use useCallback for share function as well
  const handleShare = useCallback(async () => {
    Logger.debug('EventDetailScreen', 'Share button pressed', { eventId: event.id });
    
    try {
      const result = await Share.share({
        message: `Check out this event: ${event.title} at ${event.location} on ${formatEventDate(event)}.`,
        title: event.title,
      });
      
      if (result.action === Share.sharedAction) {
        Logger.debug('EventDetailScreen', 'Content shared successfully');
      }
    } catch (error) {
      Logger.error('EventDetailScreen', 'Error sharing content', { error: error.message });
    }
  }, [event]);

  // Format event date - move outside of component or memoize
  const formatEventDate = useCallback((eventData) => {
    if (status === 'ongoing') {
      return `${new Date(eventData.startDate).toLocaleDateString()} - ${new Date(eventData.endDate).toLocaleDateString()}`;
    } else {
      return new Date(eventData.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  }, [status]);

  // Enhanced close handler with better timing
  const handleClose = useCallback(() => {
    Logger.debug('EventDetailScreen', 'Close button pressed');
    Keyboard.dismiss();
    
    // Make sure tabs are visible first
    global.TabsVisible = true;
    
    // Use a more robust cleanup sequence
    requestAnimationFrame(() => {
      // First notify parent that we want to close
      if (onParticipationChange) {
        onParticipationChange(participating);
      }
      
      // Then wait for any animations or interactions to complete
      InteractionManager.runAfterInteractions(() => {
        // Reset layout in parent screens with explicit delay to ensure all animations are complete
        setTimeout(() => {
          if (global.resetEventsLayout) {
            global.resetEventsLayout();
          }
          
          // Finally, close the modal
          onClose();
        }, 50);
      });
    });
  }, [onClose, participating, onParticipationChange]);

  // Enhanced hardware back press handling
  useEffect(() => {
    const handleBackPress = () => {
      handleClose();
      return true;
    };
    
    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    }
    
    return () => {
      if (Platform.OS === 'android') {
        BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
      }
    };
  }, [handleClose]);

  // Log for component lifecycle - use more specific dependency array
  useEffect(() => {
    Logger.debug('EventDetailScreen', 'Screen mounted', { 
      eventId: event.id,
      status,
    });
    
    // Since we're now handling onParticipationChange in the handleClose,
    // we don't need to call it in the cleanup function
    return () => {
      Logger.debug('EventDetailScreen', 'Screen unmounting', { eventId: event.id });
    };
  }, [event.id, status]);

  // Render participation criteria section if available
  const renderCriteriaSection = () => {
    if (!event.criteria) return null;
    
    return (
      <View style={styles.criteriaSection}>
        <Text style={styles.sectionTitle}>Participation Criteria</Text>
        {event.criteria.map((criterion, index) => (
          <View key={index} style={styles.criterionItem}>
            <Ionicons name="checkmark-circle" size={18} color="#4CD964" />
            <Text style={styles.criterionText}>{criterion}</Text>
          </View>
        ))}
      </View>
    );
  };

  // Render progress section for ongoing events
  const renderProgressSection = () => {
    if (status !== 'ongoing' || !event.progress) return null;
    
    return (
      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>Event Progress</Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${event.progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{event.progress}% Complete</Text>
        
        {event.milestones && (
          <View style={styles.milestonesContainer}>
            <Text style={styles.milestonesTitle}>Milestones:</Text>
            {event.milestones.map((milestone, index) => (
              <View key={index} style={styles.milestoneItem}>
                <Ionicons 
                  name={milestone.completed ? "checkmark-circle" : "ellipse-outline"} 
                  size={18} 
                  color={milestone.completed ? "#4CD964" : "#999"} 
                />
                <Text style={[
                  styles.milestoneText,
                  milestone.completed && styles.completedMilestoneText
                ]}>
                  {milestone.text}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Render outcome section for completed events
  const renderOutcomeSection = () => {
    if (status !== 'completed' || !event.outcome) return null;
    
    return (
      <View style={styles.outcomeSection}>
        <Text style={styles.sectionTitle}>Outcome</Text>
        <Text style={styles.outcomeText}>{event.outcome}</Text>
        
        {event.photos > 0 && (
          <TouchableOpacity style={styles.photosButton}>
            <Ionicons name="images-outline" size={18} color="#007AFF" />
            <Text style={styles.photosButtonText}>View {event.photos} Photos</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Get the correct action button based on event status
  const renderActionButton = () => {
    if (status === "scheduled") {
      return (
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            participating ? styles.participatingButton : styles.participateButton
          ]}
          onPress={handleParticipation}
        >
          <Ionicons 
            name={participating ? "checkmark-circle" : "person-add"} 
            size={20} 
            color={participating ? "white" : "#007AFF"} 
          />
          <Text style={participating ? styles.participatingButtonText : styles.participateButtonText}>
            {participating ? "Participating" : "Join Event"}
          </Text>
        </TouchableOpacity>
      );
    } else if (status === "ongoing") {
      return (
        <TouchableOpacity 
          style={[styles.actionButton, styles.discussButton]}
        >
          <Ionicons name="chatbubbles" size={20} color="white" />
          <Text style={styles.discussButtonText}>
            Open Discussion
          </Text>
        </TouchableOpacity>
      );
    } else if (status === "completed") {
      return (
        <TouchableOpacity 
          style={[styles.actionButton, styles.feedbackButton]}
        >
          <Ionicons name="star" size={20} color="white" />
          <Text style={styles.feedbackButtonText}>
            Leave Feedback
          </Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomInset + 20 }
        ]}
      >
        {/* Header image */}
        <View style={styles.headerImageContainer}>
          {event.image ? (
            <Image 
              source={{ uri: event.image }} 
              style={styles.headerImage} 
              resizeMode="cover" 
            />
          ) : (
            <View style={[styles.headerPlaceholder, 
              { backgroundColor: status === 'completed' ? '#4CD964' : 
                status === 'ongoing' ? '#FF9500' : '#007AFF' }
            ]} />
          )}
          
          {/* Back button */}
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleClose}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Inter-society badge if applicable */}
        {event.isIntersociety && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Inter-Society</Text>
          </View>
        )}

        {/* Event title and basic info */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>{event.title}</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={20} color="#007AFF" />
              <Text style={styles.statText}>{participantsCount} participants</Text>
            </View>
            
            {status === "completed" && event.photos > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="images" size={20} color="#FF9500" />
                <Text style={styles.statText}>{event.photos} photos</Text>
              </View>
            )}
          </View>

          {/* Date info */}
          <View style={styles.detailItem}>
            <Ionicons name="calendar" size={22} color="#666" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailTitle}>Date</Text>
              <Text style={styles.detailText}>{formatEventDate(event)}</Text>
              {event.time && (
                <Text style={styles.detailText}>{event.time}</Text>
              )}
            </View>
          </View>

          {/* Location info */}
          <View style={styles.detailItem}>
            <Ionicons name="location" size={22} color="#666" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailTitle}>Location</Text>
              <Text style={styles.detailText}>{event.location}</Text>
            </View>
          </View>

          {/* Organizer info */}
          <View style={styles.detailItem}>
            <Ionicons name="person" size={22} color="#666" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailTitle}>Organizer</Text>
              <Text style={styles.detailText}>{event.organizer}</Text>
            </View>
          </View>

          {/* Society info */}
          <View style={styles.detailItem}>
            <Ionicons name="home" size={22} color="#666" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailTitle}>Society</Text>
              <Text style={styles.detailText}>
                {event.societies ? event.societies.join(', ') : event.society}
              </Text>
            </View>
          </View>
        </View>

        {/* Description section */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{event.description || 'No description provided.'}</Text>
        </View>

        {/* Participation criteria */}
        {renderCriteriaSection()}

        {/* Progress section for ongoing events */}
        {renderProgressSection()}

        {/* Outcome section for completed events */}
        {renderOutcomeSection()}

        {/* Map section if coordinates are available */}
        {event.coordinates && (
          <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>Event Location</Text>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: event.coordinates.latitude,
                longitude: event.coordinates.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              scrollEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: event.coordinates.latitude,
                  longitude: event.coordinates.longitude,
                }}
                title={event.title}
                description={event.location}
              />
            </MapView>
            <TouchableOpacity style={styles.mapButton}>
              <Ionicons name="navigate" size={18} color="white" />
              <Text style={styles.mapButtonText}>Get Directions</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Action buttons */}
      <View style={[styles.actionBar, { 
        paddingBottom: bottomInset > 0 ? bottomInset : 20,
        // Fix bottom action bar positioning
        position: 'relative' 
      }]}>
        {renderActionButton()}
        
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-social" size={20} color="white" />
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    position: 'relative', // Ensure proper stacking context
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerImageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerPlaceholder: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    left: 15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  badge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-end',
    marginTop: -30,
    marginRight: 15,
    marginBottom: 10,
  },
  badgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  infoSection: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statText: {
    marginLeft: 5,
    color: '#666',
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  detailTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  detailTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  detailText: {
    color: '#666',
    fontSize: 15,
  },
  descriptionSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    color: '#666',
    lineHeight: 22,
    fontSize: 15,
  },
  criteriaSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  criterionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  criterionText: {
    marginLeft: 10,
    color: '#333',
    fontSize: 15,
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  milestonesContainer: {
    marginTop: 10,
  },
  milestonesTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    fontSize: 16,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
  completedMilestoneText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  outcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  outcomeText: {
    color: '#666',
    lineHeight: 22,
    fontSize: 15,
    marginBottom: 15,
  },
  mapSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  mapButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  mapButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  photosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
  },
  photosButtonText: {
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 8,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  actionButton: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  participateButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  participatingButton: {
    backgroundColor: '#007AFF',
  },
  participateButtonText: {
    color: '#007AFF',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  participatingButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  discussButton: {
    backgroundColor: '#5AC8FA',
  },
  discussButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  feedbackButton: {
    backgroundColor: '#FF9500',
  },
  feedbackButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
});
