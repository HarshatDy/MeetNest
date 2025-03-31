import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import MainTabNavigator from './navigation/MainTabNavigator';
import { UserProvider } from './contexts/UserContext';
import installPolyfills from './polyfills';
import { Logger } from './utils/Logger';
import { TimelineProvider } from './context/TimelineContext';
import { NavigationHelper } from './utils/NavigationHelper';
import { MongoDBProvider } from './src/context/MongoDBContext';
import { initDatabase } from './src/utils/database';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Warning: A props object containing a "key" prop is being spread into JSX',
  "React Native's New Architecture",
  // This will ignore warnings containing keys
  "object containing a \"key\" prop",
  // This is more specific to the actual warning
  "A props object containing a \"key\" prop is being spread into JSX"
]);

export default function App() {
  const navigationRef = useRef(null);
  
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
    initDatabase()
      .then(() => console.log('Local database initialized'))
      .catch(err => console.error('Error initializing database', err));
  }, []);

  // Set navigation reference for NavigationHelper when ref is available
  useEffect(() => {
    if (navigationRef.current) {
      NavigationHelper.setNavigationRef(navigationRef.current);
    }
  }, [navigationRef.current]);

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
              <MainTabNavigator />
              <StatusBar style="auto" />
            </NavigationContainer>
          </TimelineProvider>
        </UserProvider>
      </MongoDBProvider>
    </SafeAreaProvider>
  );
}
