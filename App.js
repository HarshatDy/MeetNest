import React, { useEffect, useRef, useState, createContext } from 'react';
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
import { initDatabase, setPreference, getPreference, resetDatabaseIfUserLoggedIn } from './src/utils/database';

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

// Create a context to expose app functions to components
export const AppContext = createContext(null);

const Stack = createNativeStackNavigator();

export default function App() {
  const navigationRef = useRef(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDbInitialized, setIsDbInitialized] = useState(false);

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
        // Initialize database first
        await initDatabase();
        console.log('Local database initialized');
        
        // Now check if database reset is needed
        console.log('Checking if database reset is needed...');
        const resetResult = await resetDatabaseIfUserLoggedIn();
        if (resetResult.resetPerformed) {
          console.log('Database has been reset:', resetResult.message);
        } else {
          console.log('No database reset performed:', resetResult.message);
        }
        
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
        
        // Mark database as initialized
        setIsDbInitialized(true);
      } catch (err) {
        console.error('Database initialization failed:', err);
        // Even on error, mark as initialized to prevent blocking the app
        setIsDbInitialized(true);
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
    if (!isDbInitialized) return;
    
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
  }, [isDbInitialized]);

  // Check if user is logged in on app start
  useEffect(() => {
    if (!isDbInitialized) return;
    
    const checkLoginStatus = async () => {
      try {
        console.log('[DEBUG] Checking if user is logged in from database...');
        
        // Replace preference check with database check
        const { isUserLoggedIn } = require('./src/utils/database');
        const loginStatus = await isUserLoggedIn();
        
        console.log('[DEBUG] Login status from database:', loginStatus);
        setIsLoggedIn(loginStatus);
        
        // No need to validate with userID since isUserLoggedIn() already checks the users table
      } catch (error) {
        console.error('[DEBUG] Error checking login status:', error);
      }
    };
    
    checkLoginStatus();
  }, [isDbInitialized]);

  // Add a new function to check login status that can be called from components
  const refreshLoginStatus = async () => {
    if (!isDbInitialized) return;
    
    try {
      console.log('[DEBUG] Manually refreshing login status from database...');
      const { isUserLoggedIn } = require('./src/utils/database');
      const loginStatus = await isUserLoggedIn();
      console.log('[DEBUG] Updated login status from database:', loginStatus);
      setIsLoggedIn(loginStatus);
      return loginStatus;
    } catch (error) {
      console.error('[DEBUG] Error refreshing login status:', error);
      return false;
    }
  };

  // Add a function to handle logout logic
  const handleLogout = async () => {
    try {
      console.log('[DEBUG] Handling logout...');
      // Import the logout function
      const { logoutCurrentUser } = require('./src/utils/database');
      
      // Call the database function to log the user out
      await logoutCurrentUser();
      
      // Update the logged in state
      setIsLoggedIn(false);
      
      Logger.debug('App', 'User logged out successfully');
      return true;
    } catch (error) {
      console.error('[DEBUG] Error during logout:', error);
      Logger.error('App', 'Error logging out user', error);
      return false;
    }
  };

  // If database is not yet initialized, render nothing or a simple loading indicator
  if (!isDbInitialized) {
    return null; // Return null rather than using splash screen
  }

  // Add console logs to debug rendered components
  console.log('[DEBUG] LoginPage component type:', typeof LoginPage);
  console.log('[DEBUG] isLoggedIn state:', isLoggedIn);

  // Create a value object for the AppContext
  const appContextValue = {
    isLoggedIn,
    handleLogout,
    refreshLoginStatus
  };

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <MongoDBProvider>
        <UserProvider>
          <TimelineProvider>
            <AppContext.Provider value={appContextValue}>
              <NavigationContainer
                ref={navigationRef}
                onStateChange={(state) => {
                  if (state) {
                    const routes = state.routes;
                    const currentRoute = routes[routes.length - 1];
                    if (currentRoute?.name === 'Login') {
                      refreshLoginStatus();
                    }
                  }
                }}
                onReady={() => {
                  Logger.debug('Navigation', 'Navigation container ready');
                  // Double-check that the navigation ref is set
                  if (navigationRef.current) {
                    NavigationHelper.setNavigationRef(navigationRef.current);
                  }
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
            </AppContext.Provider>
          </TimelineProvider>
        </UserProvider>
      </MongoDBProvider>
    </SafeAreaProvider>
  );
}
