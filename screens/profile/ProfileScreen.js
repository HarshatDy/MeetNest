import React, { useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Logger, DEBUG_ENABLED } from '../../utils/Logger';
// Remove AsyncStorage import as we're no longer using it
import { AppContext } from '../../App';
import { NavigationHelper } from '../../utils/NavigationHelper';
import { useRootNavigation } from '../../hooks/useRootNavigation';

const USER = {
  id: '101',
  name: 'John Doe',
  avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
  role: 'President',
  society: 'Green Meadows',
  joinDate: '2020-05-12',
  activities: 42,
  challenges: 15,
  points: 2340,
  badges: [
    { id: '1', name: 'Community Leader', icon: 'ribbon' },
    { id: '2', name: 'Event Organizer', icon: 'calendar' },
    { id: '3', name: 'Sports Champion', icon: 'football' }
  ],
  recentActivities: [
    { id: '1', type: 'post', title: 'Annual society maintenance', date: '2023-08-12' },
    { id: '2', type: 'event', title: 'Summer Sports Camp', date: '2023-08-01' },
    { id: '3', type: 'challenge', title: 'Table Tennis Tournament', date: '2023-07-25' }
  ]
};

export default function ProfileScreen({ navigation }) {
  // Get root navigation for logging purposes
  const rootNavigation = useRootNavigation();
  
  // Get the handleLogout function from AppContext
  const { handleLogout } = useContext(AppContext);
  
  // Add useEffect for detailed navigator debugging on mount
  useEffect(() => {
    if (DEBUG_ENABLED) { // Wrap debug logic with the flag
      const navigatorInfo = {
        navigatorType: navigation?.constructor?.name || 'Unknown',
        parentNavigator: navigation?.getParent()?.constructor?.name || 'No Parent',
        rootNavigator: navigation?.getParent()?.getParent()?.constructor?.name || 'No Root',
        navigatorState: navigation?.getState?.() || 'No State',
        routes: navigation?.getState?.()?.routes?.map(r => r.name) || [],
        currentRouteName: navigation?.getCurrentRoute?.()?.name || 'Unknown Route',
        canGoBack: navigation?.canGoBack?.() || false,
        isReady: navigation?.isReady?.() || false
      };

      Logger.debug('ProfileScreen', 'Navigator debug info on mount', navigatorInfo);

      try {
        const navState = NavigationHelper.getNavigationState();
        Logger.debug('ProfileScreen', 'NavigationHelper state', navState);
      } catch (error) {
        Logger.error('ProfileScreen', 'Error accessing NavigationHelper', error);
      }
    }
  }, [navigation, rootNavigation]);

  const onLogoutPress = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Log Out",
          onPress: async () => {
            try {
              Logger.userAction('ProfileScreen', 'User initiated logout');
              
              // Call the handleLogout function from App.js via context
              const success = await handleLogout();
              
              if (success) {
                Logger.debug('ProfileScreen', 'Logout handled successfully');
                // Remove AsyncStorage.clear() call that's causing the error
              } else {
                // Show error message if logout failed
                Alert.alert("Error", "Failed to log out. Please try again.");
              }
            } catch (error) {
              Logger.error('ProfileScreen', 'Error in logout process', { error: error.message });
              Alert.alert("Error", "Could not complete logout. Please restart the app.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Image source={{ uri: USER.avatar }} style={styles.avatar} />
          <View style={styles.userInfo}>
            <Text style={styles.name}>{USER.name}</Text>
            <Text style={styles.role}>{USER.role} • {USER.society}</Text>
            <Text style={styles.joinDate}>Member since {new Date(USER.joinDate).toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{USER.activities}</Text>
            <Text style={styles.statLabel}>Activities</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{USER.challenges}</Text>
            <Text style={styles.statLabel}>Challenges</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{USER.points}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Achievements')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.badgesContainer}>
            {USER.badges.map(badge => (
              <View key={badge.id} style={styles.badge}>
                <View style={styles.badgeIcon}>
                  <Ionicons name={badge.icon} size={24} color="#007AFF" />
                </View>
                <Text style={styles.badgeName}>{badge.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Activity History')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {USER.recentActivities.map(activity => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityIconContainer}>
                <Ionicons 
                  name={
                    activity.type === 'post' ? 'create-outline' :
                    activity.type === 'event' ? 'calendar-outline' : 'trophy-outline'
                  } 
                  size={24} 
                  color="#007AFF" 
                />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityDate}>{new Date(activity.date).toLocaleDateString()}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Logout button */}
        <TouchableOpacity style={styles.logoutButton} onPress={onLogoutPress}>
          <Ionicons name="log-out-outline" size={24} color="white" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  userInfo: {
    marginLeft: 20,
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  role: {
    fontSize: 16,
    color: '#666',
    marginTop: 2,
  },
  joinDate: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginTop: 10,
    paddingVertical: 15,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAll: {
    fontSize: 14,
    color: '#007AFF',
  },
  badgesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  badge: {
    alignItems: 'center',
  },
  badgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeName: {
    fontSize: 12,
    color: '#666',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    color: '#333',
  },
  activityDate: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  // Logout button styles
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FF3B30',
    marginHorizontal: 15,
    marginVertical: 20,
    paddingVertical: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});
