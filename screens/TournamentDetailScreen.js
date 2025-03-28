import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  Share,
  Platform,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Logger } from '../utils/Logger';
import MapView, { Marker } from 'react-native-maps';

// Renamed to be unique and clear
export default function TournamentDetailScreen({ tournament, onClose, bottomInset = 0, onInterestChange, screenName = 'TournamentDetails' }) {
  const [interested, setInterested] = useState(tournament.userInterested || false);
  const [interestCount, setInterestCount] = useState(tournament.interestedCount || 0);

  // Add logging for the screen name
  useEffect(() => {
    Logger.debug('TournamentDetailScreen', 'Screen mounted', { 
      tournamentId: tournament.id,
      screenName
    });
    
    return () => {
      Logger.debug('TournamentDetailScreen', 'Screen unmounting', { tournamentId: tournament.id });
      
      // Update the parent component with the latest interest state
      if (onInterestChange) {
        onInterestChange(interested);
      }
    };
  }, [tournament.id, interested, onInterestChange, screenName]);

  // Simple interest toggle
  const handleInterest = () => {
    Logger.debug('TournamentDetailScreen', 'Interest toggled', { 
      tournamentId: tournament.id, 
      newState: !interested 
    });
    
    if (interested) {
      setInterestCount(prev => Math.max(0, prev - 1));
    } else {
      setInterestCount(prev => prev + 1);
    }
    setInterested(!interested);
  };

  // Simple sharing
  const handleShare = async () => {
    Logger.debug('TournamentDetailScreen', 'Share button pressed', { tournamentId: tournament.id });
    
    try {
      const result = await Share.share({
        message: `Check out this event: ${tournament.title} at ${tournament.location} on ${new Date(tournament.date).toLocaleDateString()}`,
        title: tournament.title,
      });
      
      if (result.action === Share.sharedAction) {
        Logger.debug('TournamentDetailScreen', 'Content shared successfully');
      }
    } catch (error) {
      Logger.error('TournamentDetailScreen', 'Error sharing content', { error: error.message });
    }
  };

  // Format event date 
  const formatEventDate = (date) => {
    const eventDate = new Date(date);
    return eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format event time
  const formatEventTime = (startTime, endTime) => {
    return `${startTime} - ${endTime}`;
  };

  // Simplified close handler
  const handleClose = () => {
    Logger.debug('TournamentDetailScreen', 'Close button pressed');
    Keyboard.dismiss();
    global.TabsVisible = true;
    onClose();
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
        {/* Header image with non-absolute badge */}
        <View style={styles.headerImageContainer}>
          <Image 
            source={{ uri: tournament.bannerImage }} 
            style={styles.headerImage} 
            resizeMode="cover" 
          />
          
          {/* Back button - keep this one absolute for proper positioning */}
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleClose}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Event type badge - moved outside of image container */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{tournament.type}</Text>
        </View>

        {/* Event title and basic info */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>{tournament.title}</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={20} color="#FFC107" />
              <Text style={styles.statText}>{interestCount} interested</Text>
            </View>
            
            {tournament.participantsCount && (
              <View style={styles.statItem}>
                <Ionicons name="people" size={20} color="#007AFF" />
                <Text style={styles.statText}>{tournament.participantsCount} participants</Text>
              </View>
            )}
          </View>

          {/* Date and time info */}
          <View style={styles.detailItem}>
            <Ionicons name="calendar" size={22} color="#666" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailTitle}>Date & Time</Text>
              <Text style={styles.detailText}>{formatEventDate(tournament.date)}</Text>
              <Text style={styles.detailText}>{formatEventTime(tournament.startTime, tournament.endTime)}</Text>
            </View>
          </View>

          {/* Location info */}
          <View style={styles.detailItem}>
            <Ionicons name="location" size={22} color="#666" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailTitle}>Location</Text>
              <Text style={styles.detailText}>{tournament.location}</Text>
              {tournament.locationDetails && (
                <Text style={styles.detailSecondary}>{tournament.locationDetails}</Text>
              )}
            </View>
          </View>

          {/* Organizer info */}
          {tournament.organizer && (
            <View style={styles.detailItem}>
              <Ionicons name="people" size={22} color="#666" />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailTitle}>Organizer</Text>
                <Text style={styles.detailText}>{tournament.organizer}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Description section */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{tournament.description || 'No description provided.'}</Text>
        </View>

        {/* Map section */}
        {tournament.coordinates && (
          <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>Event Location</Text>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: tournament.coordinates.latitude,
                longitude: tournament.coordinates.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              scrollEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: tournament.coordinates.latitude,
                  longitude: tournament.coordinates.longitude,
                }}
                title={tournament.title}
                description={tournament.location}
              />
            </MapView>
            <TouchableOpacity style={styles.mapButton}>
              <Ionicons name="navigate" size={18} color="white" />
              <Text style={styles.mapButtonText}>Get Directions</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Registration info if applicable */}
        {tournament.registrationInfo && (
          <View style={styles.registrationSection}>
            <Text style={styles.sectionTitle}>Registration Information</Text>
            <Text style={styles.description}>{tournament.registrationInfo}</Text>
            {tournament.registrationDeadline && (
              <View style={styles.deadlineContainer}>
                <Ionicons name="time" size={18} color="#FF3B30" />
                <Text style={styles.deadlineText}>
                  Registration deadline: {new Date(tournament.registrationDeadline).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Awards section if applicable */}
        {tournament.prizes && (
          <View style={styles.prizesSection}>
            <Text style={styles.sectionTitle}>Prizes & Awards</Text>
            <Text style={styles.description}>{tournament.prizes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action buttons */}
      <View style={[styles.actionBar, { paddingBottom: bottomInset > 0 ? bottomInset : 20 }]}>
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            interested ? styles.interestedButton : styles.interestButton
          ]}
          onPress={handleInterest}
        >
          <Ionicons 
            name={interested ? "star" : "star-outline"} 
            size={20} 
            color={interested ? "white" : "#FFC107"} 
          />
          <Text style={interested ? styles.interestedButtonText : styles.interestButtonText}>
            {interested ? "Interested" : "I'm Interested"}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-social" size={20} color="white" />
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
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
  typeBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-end',
    marginTop: -30,
    marginRight: 15,
    marginBottom: 10,
  },
  typeBadgeText: {
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
  detailSecondary: {
    color: '#999',
    fontSize: 14,
    marginTop: 2,
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
  registrationSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 10,
    borderRadius: 8,
  },
  deadlineText: {
    color: '#FF3B30',
    marginLeft: 8,
    fontWeight: '500',
  },
  prizesSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
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
  interestButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  interestedButton: {
    backgroundColor: '#FFC107',
  },
  interestButtonText: {
    color: '#FFC107',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  interestedButtonText: {
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
