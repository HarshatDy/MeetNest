import React, { useEffect, useContext, useState } from 'react';
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
import { useUser } from '../../contexts/UserContext';

// Define a default user object for fallback
const DEFAULT_USER = {
  id: '',
  name: 'Guest User',
  avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
  role: 'Resident',
  society: 'Loading...',
  joinDate: new Date().toISOString(),
  activities: 0,
  challenges: 0,
  points: 0,
  badges: [],
  recentActivities: []
};

export default function ProfileScreen({ navigation }) {
  // Get root navigation for logging purposes
  const rootNavigation = useRootNavigation();
  
  // Get the handleLogout function from AppContext
  const { handleLogout } = useContext(AppContext);
  
  // Add this line to get the current user data
  const { user } = useUser();
  
  // Create a state to hold the formatted user data
  const [userData, setUserData] = useState(DEFAULT_USER);
  
  // Now you can access user.id to get the current user ID
  const userId = user?.id;
  
  useEffect(() => {
    if (user) {
      console.log('Current user details:', JSON.stringify(user, null, 2));
      Logger.debug('ProfileScreen', 'User context data', user);
      
      // Log specific user properties if they exist
      if (user.id) console.log('User ID:', user.id);
      if (user.email) console.log('User Email:', user.email);
      if (user.display_name) console.log('User Name:', user.display_name);
      if (user.role) console.log('User Role:', user.role);
      if (user.society) console.log('User Society:', user.society);
      
      // Format user data from context to match UI requirements
      formatUserData(user);
      
      // Here you can fetch user data from MongoDB using this ID
      if (user.id) {
        fetchUserDataFromMongoDB(user.id);
      }
    } else {
      console.log('No user data available in context');
      // Replace Logger.warn with console.warn since it's not available
      console.warn('ProfileScreen: No user data in context');
    }
  }, [user]);
  
  // Function to format user data from context to match UI expectations
  const formatUserData = (contextUser) => {
    if (!contextUser) return;
    
    const formattedUser = {
      id: contextUser.id || DEFAULT_USER.id,
      name: contextUser.display_name || contextUser.name || DEFAULT_USER.name,
      avatar: contextUser.avatar_url || contextUser.avatar || DEFAULT_USER.avatar,
      role: contextUser.role || DEFAULT_USER.role,
      society: contextUser.society || DEFAULT_USER.society,
      joinDate: contextUser.created_at || contextUser.joinDate || DEFAULT_USER.joinDate,
      activities: contextUser.activities_count || contextUser.activities || DEFAULT_USER.activities,
      challenges: contextUser.challenges_count || contextUser.challenges || DEFAULT_USER.challenges,
      points: contextUser.points || DEFAULT_USER.points,
      badges: contextUser.badges || DEFAULT_USER.badges,
      recentActivities: contextUser.recent_activities || contextUser.recentActivities || DEFAULT_USER.recentActivities
    };
    
    Logger.debug('ProfileScreen', 'Formatted user data', formattedUser);
    setUserData(formattedUser);
  };
  
  // Add a function to fetch user data from MongoDB
  const fetchUserDataFromMongoDB = async (id) => {
    if (!id) {
      console.warn('ProfileScreen: Attempted to fetch user data without ID');
      return;
    }
    
    try {
      // Import the service that communicates with MongoDB
      const { getUser, getPosts } = require('../../src/services/mongoService');
      
      // Fetch basic user data
      const mongoUserData = await getUser(id);
      console.log('User data from MongoDB:', JSON.stringify(mongoUserData, null, 2));
      Logger.debug('ProfileScreen', 'MongoDB user data retrieved', mongoUserData);
      
      // Fetch user's recent posts/activities
      const userPosts = await getPosts(mongoUserData.societies?.[0] || 'default', 3);
      console.log('User posts from MongoDB:', userPosts?.length || 0);
      
      // Filter for posts by this user
      const userActivities = userPosts
        .filter(post => post.authorId === id || post.authorId === mongoUserData._id)
        .map(post => ({
          id: post._id || post.id,
          type: post.type || 'post',
          title: post.title || post.content?.substring(0, 30) || 'Untitled Post',
          date: post.timestamp || post.createdAt,
          likes: post.likes || 0,
          comments: post.comments || 0
        }))
        .slice(0, 3); // Limit to 3 items for recent activities
      
      Logger.debug('ProfileScreen', 'User activities retrieved', { count: userActivities.length });
      
      // Update userData with MongoDB data and activities
      if (mongoUserData) {
        formatUserData({
          ...user, 
          ...mongoUserData,
          recentActivities: userActivities,
          activities_count: userActivities.length // Update activity count based on real data
        });
      }
    } catch (error) {
      Logger.error('ProfileScreen', 'Error fetching user data', error);
      console.error('Failed to fetch user data:', error.message);
    }
  };

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
          <Image source={{ uri: userData.avatar }} style={styles.avatar} />
          <View style={styles.userInfo}>
            <Text style={styles.name}>{userData.name}</Text>
            <Text style={styles.role}>{userData.role} • {userData.society}</Text>
            <Text style={styles.joinDate}>Member since {new Date(userData.joinDate).toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData.activities}</Text>
            <Text style={styles.statLabel}>Activities</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData.challenges}</Text>
            <Text style={styles.statLabel}>Challenges</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData.points}</Text>
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
            {userData.badges && userData.badges.length > 0 ? (
              userData.badges.map(badge => (
                <View key={badge.id} style={styles.badge}>
                  <View style={styles.badgeIcon}>
                    <Ionicons name={badge.icon} size={24} color="#007AFF" />
                  </View>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyStateText}>No badges earned yet</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Activity History')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {userData.recentActivities && userData.recentActivities.length > 0 ? (
            userData.recentActivities.map(activity => (
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
            ))
          ) : (
            <Text style={styles.emptyStateText}>No recent activities</Text>
          )}
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
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
});
