import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Modal, 
  Keyboard,
  Platform,
  UIManager
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TournamentDetailScreen from '../screens/TournamentDetailScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logger } from '../utils/Logger';

// Enable layout animation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function TournamentCard({ tournament }) {
  const [modalVisible, setModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Add state for interest tracking
  const [interested, setInterested] = useState(tournament.userInterested || false);
  const [interestCount, setInterestCount] = useState(tournament.interestedCount || 0);

  // Open tournament detail
  const openDetail = () => {
    Logger.debug('TournamentCard', 'Opening tournament detail modal', { 
      tournamentId: tournament.id,
      screenName: 'TournamentDetails' // Add explicit screen name for clarity
    });
    global.TabsVisible = true;
    setModalVisible(true);
  };

  // Close tournament detail
  const handleClose = () => {
    Logger.debug('TournamentCard', 'Closing tournament detail modal', { tournamentId: tournament.id });
    // Keyboard.dismiss();
    
    // Set tabs visible first before dismissing modal
    global.TabsVisible = true;
    Logger.debug('TournamentCard', 'Tab visibility restored');
    
    // Add a small delay before closing modal to ensure layout is stable
    setTimeout(() => {
      setModalVisible(false);
    }, 500);
  };

  // Handle interest toggling
  const handleInterest = () => {
    Logger.debug('TournamentCard', 'Interest toggled', { 
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

  // Format event date for display
  const formatEventDate = (date) => {
    const eventDate = new Date(date);
    return eventDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format event time
  const formatEventTime = (startTime, endTime) => {
    return `${startTime} - ${endTime}`;
  };

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity 
        style={styles.card} 
        onPress={openDetail}
        activeOpacity={0.9}
      >
        {/* Banner container with badge */}
        <View style={styles.bannerContainer}>
          {tournament.bannerImage && (
            <Image source={{ uri: tournament.bannerImage }} style={styles.bannerImage} />
          )}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{tournament.type}</Text>
          </View>
        </View>
        
        {/* Tournament details */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{tournament.title}</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{formatEventDate(tournament.date)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{formatEventTime(tournament.startTime, tournament.endTime)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{tournament.location}</Text>
          </View>
          
          {tournament.organizer && (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={16} color="#666" />
              <Text style={styles.infoText}>Organized by {tournament.organizer}</Text>
            </View>
          )}
        </View>

        {/* Footer with actions */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.footerButton}
            onPress={handleInterest}
          >
            <Ionicons 
              name={interested ? "star" : "star-outline"} 
              size={24} 
              color={interested ? "#FFC107" : "#666"} 
            />
            <Text style={[
              styles.footerButtonText, 
              interested && styles.interestedText
            ]}>
              {interested ? "Interested" : "Interest"} ({interestCount})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.footerButton}>
            <Ionicons name="share-social-outline" size={24} color="#666" />
            <Text style={styles.footerButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Modal for tournament details - simplified */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={handleClose}
        statusBarTranslucent={false}
        onDismiss={() => {
          // Ensure tabs are visible and screen position is reset
          global.TabsVisible = true;
          if (global.resetTournamentsTabPosition) {
            global.resetTournamentsTabPosition();
          }
        }}
      >
        <TournamentDetailScreen 
          tournament={{
            ...tournament,
            interestedCount: interestCount,
            userInterested: interested
          }} 
          onClose={handleClose}
          bottomInset={insets.bottom}
          onInterestChange={(newInterested) => {
            setInterested(newInterested);
            setInterestCount(newInterested ? 
              (tournament.interestedCount || 0) + 1 : 
              Math.max(0, (tournament.interestedCount || 0) - 1));
          }}
          screenName="TournamentDetails" // Add explicit screen name
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  bannerContainer: {
    position: 'relative',
    width: '100%',
  },
  bannerImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  typeBadge: {
    position: 'relative',
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    alignSelf: 'flex-end',
    marginTop: -30,
    marginRight: 10,
    marginBottom: 10,
  },
  typeBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  contentContainer: {
    padding: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  infoText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
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
    paddingVertical: 12,
  },
  footerButtonText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  interestedText: {
    color: '#FFC107',
  },
});
