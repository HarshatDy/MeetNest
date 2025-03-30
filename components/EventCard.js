import React, { useState, useRef, useLayoutEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Image, 
  InteractionManager,
  Dimensions,
  StatusBar,
  Platform,
  LayoutAnimation,
  UIManager,
  BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EventDetailScreen from '../screens/EventDetailScreen';
import { Logger } from '../utils/Logger';
import TabBarManager from '../utils/TabBarVisibilityManager';
import { useLayout } from '../contexts/LayoutContext';

// Enable layout animation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function EventCard({ event, status }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [isParticipating, setIsParticipating] = useState(event.userParticipating || false);
  const [participantsCount, setParticipantsCount] = useState(event.participants || 0);
  const insets = useSafeAreaInsets();
  
  // Use layout context for centralized layout management
  let layoutContext = null;
  try {
    layoutContext = useLayout();
  } catch (e) {
    // Context may not be available, will fall back to global function
  }
  
  // Add refs for tracking modal state
  const mountedRef = useRef(true);
  const modalHasBeenShown = useRef(false);
  const cardRef = useRef(null);
  const initialLayout = useRef(null);

  // Track original tab visibility and restore it
  const previousTabVisibility = useRef(global.TabsVisible);

  // Helper function to reset layout using context when possible
  const resetLayout = () => {
    if (layoutContext?.resetEventsLayout) {
      layoutContext.resetEventsLayout();
    } else if (global.resetEventsLayout) {
      global.resetEventsLayout();
    }
  };

  // Log when component mounts and unmounts
  React.useEffect(() => {
    return () => {
      Logger.debug('EventCard', 'Component unmounting', { eventId: event.id });
      mountedRef.current = false;
      
      // Ensure tabs are restored if component unmounts with open modal
      if (modalVisible) {
        global.TabsVisible = previousTabVisibility.current;
      }
    };
  }, [event.id, modalVisible]);

  // Add back handler for Android
  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (modalVisible) {
        handleClose();
        return true;
      }
      return false;
    });
    
    return () => backHandler.remove();
  }, [modalVisible]);

  // Track modal state for proper cleanup with improved timing
  React.useEffect(() => {
    if (modalVisible) {
      Logger.debug('EventCard', 'Modal opened', { eventId: event.id });
      modalHasBeenShown.current = true;
      
      // Store previous tab visibility
      previousTabVisibility.current = global.TabsVisible;
      
      // Use TabBarManager instead of directly setting global state
      TabBarManager.setVisibility(`EventCard-${event.id}`, false);
      
      // Force screen to stabilize before animation
      InteractionManager.runAfterInteractions(() => {
        // Store the initial layout before modification
        if (cardRef.current && cardRef.current.measureInWindow) {
          cardRef.current.measureInWindow((x, y, width, height) => {
            initialLayout.current = { x, y, width, height };
          });
        }
      });
      
      Logger.debug('EventCard', `Modal opened for event ${event.id}`);
    } else if (modalHasBeenShown.current) {
      Logger.debug('EventCard', 'Modal closed', { eventId: event.id });
      
      // Clean up tab visibility when modal closes
      TabBarManager.clearVisibility(`EventCard-${event.id}`);
      
      // Log dimensions right when modal closes
      Logger.debug('EventCard', `Modal closed for event ${event.id}`);
      
      // CRITICAL: Ensure layout resets properly after modal closes
      InteractionManager.runAfterInteractions(() => {
        // Force immediate layout update using a direct Style reset
        if (Platform.OS === 'ios') {
          StatusBar.setBarStyle('dark-content', true);
        }
        
        // Set tabs visible first
        global.TabsVisible = previousTabVisibility.current !== undefined ? 
          previousTabVisibility.current : true;
        
        // Request immediate animation frame for layout corrections
        requestAnimationFrame(() => {
          // Use our layout reset helper that prefers context when available
          resetLayout();
          
          // Apply layout animation for smooth transition
          if (Platform.OS === 'android') {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          }
          
          // Force screen to re-layout after modal is dismissed with delay to ensure all animations complete
          setTimeout(() => {
            resetLayout();
            
            // Compare layout after modal closes to ensure it returned to original position
            if (cardRef.current && cardRef.current.measureInWindow && initialLayout.current) {
              cardRef.current.measureInWindow((x, y, width, height) => {
                const drift = Math.abs(y - (initialLayout.current.y || 0));
                Logger.debug('EventCard', `Position drift after modal: ${drift}px`, { 
                  eventId: event.id,
                  originalY: initialLayout.current.y,
                  newY: y
                });
                
                // If significant drift detected, force another layout reset
                if (drift > 5) {
                  setTimeout(() => {
                    if (mountedRef.current) {
                      resetLayout();
                    }
                  }, 100);
                }
              });
            }
          }, 250);
        });
      });
    }
  }, [modalVisible, event.id]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Measure card position relative to screen
  const measureCardPosition = () => {
    if (cardRef.current) {
      if (typeof cardRef.current.measureInWindow === 'function') {
        cardRef.current.measureInWindow((x, y, width, height) => {
          const windowHeight = Dimensions.get('window').height;
          const bottomTabHeight = 60; // Approximate bottom tab height
          
          // Log component position relative to key UI elements
          Logger.debug('EventCard', 'Card position relative to window', {
            eventId: event.id,
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

  // Open event details with improved handling
  const openEventDetail = () => {
    Logger.debug('EventCard', 'Opening event detail modal', { 
      eventId: event.id,
      status
    });
    
    // Store previous tab visibility before changing it
    previousTabVisibility.current = global.TabsVisible;
    
    // Hide tabs before showing modal
    TabBarManager.setVisibility(`EventCard-${event.id}`, false);
    
    // Set modal visible with a slight delay to ensure smooth transition
    setTimeout(() => {
      setModalVisible(true);
    }, 50);
  };

  // Close event details with improved cleanup
  const handleClose = () => {
    Logger.debug('EventCard', 'Closing event detail modal');
    
    // Show tabs when closing modal
    TabBarManager.clearVisibility(`EventCard-${event.id}`);
    
    Logger.debug('EventCard', 'Tab visibility restored');
    
    // Use InteractionManager instead of setTimeout for more reliable cleanup
    InteractionManager.runAfterInteractions(() => {
      // Only close modal after animations complete
      setModalVisible(false);
      
      // Defer layout recalculations with enough time for animation to complete
      setTimeout(() => {
        requestAnimationFrame(() => {
          if (mountedRef.current) {
            // Apply smooth layout transition
            if (Platform.OS === 'android') {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }
            resetLayout();
          }
        });
      }, 200);
    });
  };

  const renderStatusSpecificContent = () => {
    if (status === 'scheduled') {
      return (
        <View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{formatDate(event.date)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{event.time}</Text>
          </View>
          <TouchableOpacity style={styles.joinButton}>
            <Text style={styles.joinButtonText}>Join Event</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (status === 'ongoing') {
      return (
        <View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {formatDate(event.startDate)} - {formatDate(event.endDate)}
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${event.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{event.progress}% Complete</Text>
          </View>
          <TouchableOpacity style={styles.discussButton}>
            <Text style={styles.discussButtonText}>Open Discussion</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (status === 'completed') {
      return (
        <View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{formatDate(event.date)}</Text>
          </View>
          {event.outcome && (
            <View style={styles.outcomeContainer}>
              <Text style={styles.outcomeTitle}>Outcome:</Text>
              <Text style={styles.outcomeText}>{event.outcome}</Text>
            </View>
          )}
          {event.photos && (
            <TouchableOpacity style={styles.photosButton}>
              <Ionicons name="images-outline" size={16} color="#007AFF" />
              <Text style={styles.photosButtonText}>View {event.photos} Photos</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    return null;
  };

  return (
    <View>
      <TouchableOpacity 
        ref={cardRef}
        style={styles.card} 
        onPress={openEventDetail}
        activeOpacity={0.9}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{event.title}</Text>
          {event.isIntersociety && (
            <View style={styles.intersocietyBadge}>
              <Text style={styles.intersocietyText}>Inter-Society</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{event.location}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.infoText}>Organizer: {event.organizer}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{participantsCount} Participants</Text>
          </View>
          
          {event.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText} numberOfLines={2}>{event.description}</Text>
            </View>
          )}
          
          {renderStatusSpecificContent()}
        </View>
        
        <View style={styles.societyContainer}>
          <Text style={styles.societyText}>
            {event.society || (event.societies && event.societies.join(', '))}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Modal for event details with improved layout reset */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => {
          Logger.debug('EventCard', 'Modal back button pressed', { eventId: event.id });
          handleClose();
        }}
        statusBarTranslucent={false}
        hardwareAccelerated={true}
        supportedOrientations={['portrait']}
        onDismiss={() => {
          Logger.debug('EventCard', 'Modal dismissed', { eventId: event.id });
          
          if (Platform.OS === 'ios') {
            StatusBar.setHidden(false);
          }
          
          // Force layout recalculation on the main thread
          global.TabsVisible = true;
          
          setTimeout(() => {
            resetLayout();
          }, 100);
        }}
      >
        <EventDetailScreen 
          event={{
            ...event,
            participants: participantsCount,
            userParticipating: isParticipating
          }} 
          status={status}
          onClose={handleClose}
          bottomInset={insets.bottom}
          onParticipationChange={(newParticipating) => {
            setIsParticipating(newParticipating);
            setParticipantsCount(prev => 
              newParticipating ? prev + 1 : Math.max(0, prev - 1)
            );
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
    padding: 15,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  intersocietyBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  intersocietyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  descriptionContainer: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  progressContainer: {
    marginVertical: 10,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  joinButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  discussButton: {
    backgroundColor: '#5AC8FA',
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  discussButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  outcomeContainer: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  outcomeTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  outcomeText: {
    color: '#333',
    fontSize: 14,
    lineHeight: 20,
  },
  photosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 5,
  },
  photosButtonText: {
    color: '#007AFF',
    marginLeft: 5,
    fontSize: 14,
  },
  societyContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  societyText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'right',
    fontStyle: 'italic',
  }
});