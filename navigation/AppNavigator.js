import React from 'react';
// Use native-stack instead of stack for Expo/modern React Navigation
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabNavigator from './MainTabNavigator'; // Import the correct tab navigator
import LoginScreen from '../pages/LoginPage';
import RegistrationScreen from '../pages/RegistrationPage';
import OTPScreen from '../pages/OTPVerificationPage';
// Import other screens like EventDetailScreen, TournamentDetailScreen etc. if they are part of this stack

// Import the new ActivityTrackingScreen
import ActivityTrackingScreen from '../screens/ActivityTrackingScreen';
// Import the new ActivitySummaryScreen
import ActivitySummaryScreen from '../screens/ActivitySummaryScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="MainApp">
      {/* Authentication Screens */}
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Register" 
        component={RegistrationScreen} 
        options={{ title: 'Create Account' }} 
      />
      <Stack.Screen 
        name="OTPVerify" 
        component={OTPScreen} 
        options={{ title: 'Verify Code' }} 
      />
      
      {/* Main App Screens (Tab Navigator) */}
      <Stack.Screen 
        name="MainApp" 
        component={MainTabNavigator} // Use the correct component
        options={{ headerShown: false }} 
      />

      {/* Activity Tracking Flow (Modals) */}
      <Stack.Screen 
        name="ActivityTracking" 
        component={ActivityTrackingScreen} 
        options={{ 
          headerShown: false, // Hide header for a more immersive experience
          presentation: 'modal', // Present as a modal screen
        }} 
      />
      <Stack.Screen 
        name="ActivitySummary" 
        component={ActivitySummaryScreen} 
        options={{ 
          headerShown: false, // Custom header is built into the screen
          presentation: 'modal',
        }} 
      />

      {/* Add other full-screen modals or detail screens here if needed */}
      {/* 
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} options={{ headerShown: false, presentation: 'modal' }} /> 
      */}
      
    </Stack.Navigator>
  );
}
