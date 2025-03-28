import React, { useEffect, useState, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AppState } from 'react-native';
import { Logger } from '../utils/Logger';

// Import screens with updated import path
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MessagesScreen from '../screens/MessagesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import TournamentsTabScreen from '../screens/TournamentsTabScreen'; // Updated import path

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  // Simple tab visibility state
  const [tabsVisible, setTabsVisible] = useState(true);
  const appState = useRef(AppState.currentState);
  
  useEffect(() => {
    // Global variable to control tab visibility
    global.TabsVisible = true;
    Logger.debug('TabNavigator', 'Initialized with tabs visible');
    
    // Simple interval to check for changes
    const intervalId = setInterval(() => {
      if (global.TabsVisible !== tabsVisible) {
        Logger.debug('TabNavigator', 'Tab visibility changed', { visible: global.TabsVisible });
        setTabsVisible(global.TabsVisible);
      }
    }, 50);
    
    // App state listener 
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        Logger.debug('TabNavigator', 'App returned to foreground, ensuring tabs visible');
        global.TabsVisible = true;
        setTabsVisible(true);
      }
      appState.current = nextAppState;
    });
    
    return () => {
      clearInterval(intervalId);
      appStateSubscription.remove();
    };
  }, [tabsVisible]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'TournamentsTab') { // Updated name here
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          display: tabsVisible ? 'flex' : 'none',
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          elevation: 8, // Increase elevation
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          height: 60,
          paddingBottom: 5,
          margin: 0,
          zIndex: 1000, // Higher z-index
          shadowColor: 'transparent', // Remove any shadow properties that could cause extra layout calculations
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
        }
      })}
      tabBarOptions={{
        keyboardHidesTabBar: true, // Hide tab bar when keyboard is visible
      }}
      // Add key to force remount when tab visibility changes to reset internal state
      key={tabsVisible ? "tabs-visible" : "tabs-hidden"}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen 
        name="TournamentsTab"
        component={TournamentsTabScreen} // Updated component reference
        options={{ 
          title: "Tournaments" // Keep display name the same
        }} 
      />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
