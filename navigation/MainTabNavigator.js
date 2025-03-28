import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import tab navigators
import TimelineNavigator from './TimelineNavigator';
import TournamentsNavigator from './TournamentsNavigator';
import PostingScreen from '../screens/PostingScreen';
import EventsNavigator from './EventsNavigator';
import ProfileNavigator from './ProfileNavigator';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const [isTabsVisible, setIsTabsVisible] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (global.TabsVisible !== undefined && global.TabsVisible !== isTabsVisible) {
        setIsTabsVisible(global.TabsVisible);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [isTabsVisible]);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Timeline') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Tournaments') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Post') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Events') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'black',
        tabBarStyle: {
          height: 60 + (insets.bottom > 0 ? insets.bottom : 0),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          display: isTabsVisible ? 'flex' : 'none',
        },
        // Fix "large" size issue by explicitly setting numeric values
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
        }
      })}
    >
      <Tab.Screen 
        name="Timeline" 
        component={TimelineNavigator} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Tournaments" 
        component={TournamentsNavigator} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Post" 
        component={PostingScreen} 
      />
      <Tab.Screen 
        name="Events" 
        component={EventsNavigator} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileNavigator} 
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}
