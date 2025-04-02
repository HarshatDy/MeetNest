import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabNavigator from './navigation/MainTabNavigator';
import { UserProvider } from './contexts/UserContext';
import installPolyfills from './polyfills';
import { Logger } from './utils/Logger';
import { TimelineProvider } from './contexts/TimelineContext';
import { NavigationHelper } from './utils/NavigationHelper';
import { MongoDBProvider } from './src/context/MongoDBContext';
import { initDatabase, setPreference, getPreference } from './src/utils/database';

// Import the page components with explicit file extensions
import LoginPage from './pages/LoginPage.js';
import RegisterPage from './pages/RegisterPage.js';
import OTPVerificationPage from './pages/OTPVerificationPage.js';
// Remove or fix the HomePage import if it's not needed or incorrectly referenced
// import HomePage from './pages/HomePage';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Warning: A props object containing a "key" prop is being spread into JSX',
  "React Native's New Architecture",
  // This will ignore warnings containing keys
  "object containing a \"key\" prop",
  // This is more specific to the actual warning
  "A props object containing a \"key\" prop is being spread into JSX"
]);

// Example of using the database
// import { getPreference, setPreference } from '../utils/database';

async function loadUserSettings() {
  try {
    const theme = await getPreference('theme');
    return theme || 'light';
  } catch (error) {
    console.error('Error loading theme:', error);
    return 'light'; // Default value
  }
}

const Stack = createNativeStackNavigator();

export default function App() {
  const navigationRef = useRef(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Install polyfills when the app starts
  useEffect(() => {
    Logger.debug('App', 'Initializing application');
    installPolyfills();
    
    return () => {
      Logger.debug('App', 'Application unmounting');
    };
  }, []);

  // Initialize local SQLite database
  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initDatabase();
        console.log('Local database initialized');
        
        // In development, create some test data
        if (__DEV__) {
          try {
            // Use dynamic import to avoid production bundle issues
            const dbUtils = await import('./utils/dbUtils');
            if (dbUtils && dbUtils.createTestData) {
              await dbUtils.createTestData();
            }
          } catch (err) {
            console.error('Error creating test data:', err);
          }
        }
      } catch (err) {
        console.error('Database initialization failed:', err);
      }
    };
    
    setupDatabase();
  }, []);

  // Set navigation reference for NavigationHelper when ref is available
  useEffect(() => {
    if (navigationRef.current) {
      NavigationHelper.setNavigationRef(navigationRef.current);
    }
  }, [navigationRef.current]);

  // Clean up expired OTPs periodically
  useEffect(() => {
    const performCleanup = async () => {
      try {
        // Import the function directly
        const { cleanupExpiredOTPs } = require('./utils/database');
        const result = await cleanupExpiredOTPs();
        
        if (result && result.rowsAffected > 0) {
          Logger.debug('App', `Cleaned up ${result.rowsAffected} expired OTPs`);
        }
      } catch (error) {
        console.error('Error in cleanupExpiredOTPs:', error);
      }
    };
    
    // Run cleanup on app start
    performCleanup();
    
    // Schedule cleanup every 15 minutes
    const cleanupInterval = setInterval(performCleanup, 15 * 60 * 1000);
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        console.log('[DEBUG] Checking if user is logged in...');
        const loginStatus = await getPreference('isLoggedIn');
        console.log('[DEBUG] Login status from preferences:', loginStatus);
        
        const userId = await getPreference('currentUserId');
        console.log('[DEBUG] Current user ID from preferences:', userId || 'No user ID found');
        
        // Set the login state
        const isUserLoggedIn = loginStatus === 'true';
        console.log('[DEBUG] Setting isLoggedIn state to:', isUserLoggedIn);
        setIsLoggedIn(isUserLoggedIn);
        
        // Additional validation - check if we have a valid user ID when logged in
        if (isUserLoggedIn && !userId) {
          console.warn('[DEBUG] Warning: User marked as logged in but no userId found');
          // Fix inconsistent state
          await setPreference('isLoggedIn', 'false');
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('[DEBUG] Error checking login status:', error);
      }
    };
    
    checkLoginStatus();
  }, []);

  // Add console logs to debug rendered components
  console.log('[DEBUG] LoginPage component type:', typeof LoginPage);
  console.log('[DEBUG] isLoggedIn state:', isLoggedIn);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <MongoDBProvider>
        <UserProvider>
          <TimelineProvider>
            <NavigationContainer
              ref={navigationRef}
              onStateChange={(state) => {
                if (state) {
                  const routes = state.routes;
                  const currentRoute = routes[routes.length - 1];
                  Logger.debug('Navigation', 'Route changed', { 
                    current: currentRoute?.name,
                    params: currentRoute?.params
                  });
                }
              }}
              onReady={() => {
                Logger.debug('Navigation', 'Navigation container ready');
              }}
            >
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                {isLoggedIn ? (
                  <Stack.Screen name="MainApp" component={MainTabNavigator} />
                ) : (
                  <>
                    <Stack.Screen name="Login" component={LoginPage} />
                    <Stack.Screen name="Register" component={RegisterPage} />
                    <Stack.Screen name="OTPVerification" component={OTPVerificationPage} />
                  </>
                )}
              </Stack.Navigator>
              <StatusBar style="auto" />
            </NavigationContainer>
          </TimelineProvider>
        </UserProvider>
      </MongoDBProvider>
    </SafeAreaProvider>
  );
}
