import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { View, StyleSheet, InteractionManager } from 'react-native';
import ScheduledEventsScreen from '../screens/events/ScheduledEventsScreen';
import OngoingEventsScreen from '../screens/events/OngoingEventsScreen';
import CompletedEventsScreen from '../screens/events/CompletedEventsScreen';
import { NotchSpacer } from '../components/NotchDetector';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Logger } from '../utils/Logger';
import { LayoutProvider } from '../contexts/LayoutContext';

const Tab = createMaterialTopTabNavigator();

// Create a wrapped version of each screen component using forwardRef
const WrappedScheduledEventsScreen = React.forwardRef((props, ref) => (
  <ScheduledEventsScreen {...props} />
));
WrappedScheduledEventsScreen.displayName = 'WrappedScheduledEventsScreen';

const WrappedOngoingEventsScreen = React.forwardRef((props, ref) => (
  <OngoingEventsScreen {...props} />
));
WrappedOngoingEventsScreen.displayName = 'WrappedOngoingEventsScreen';

const WrappedCompletedEventsScreen = React.forwardRef((props, ref) => (
  <CompletedEventsScreen {...props} />
));
WrappedCompletedEventsScreen.displayName = 'WrappedCompletedEventsScreen';

// Using React.forwardRef to properly handle refs
const EventsNavigator = React.forwardRef((props, ref) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [forceRefresh, setForceRefresh] = useState(0);
  const mountedRef = useRef(true);
  
  // Track tab visibility to prevent layout shifts
  const [tabsHaveAppeared, setTabsHaveAppeared] = useState(false);
  
  // Track if we're in the middle of a layout adjustment
  const isAdjustingLayout = useRef(false);
  
  // Store scroll positions for each screen
  const scrollPositions = useRef({
    Scheduled: 0,
    Ongoing: 0,
    Completed: 0
  });
  
  // Track the current active tab
  const [activeTab, setActiveTab] = useState('Scheduled');

  // Centralized function to reset layouts across all event screens
  const resetEventsLayout = useCallback((tabName) => {
    if (!mountedRef.current) return;
    
    const tabToReset = tabName || activeTab;
    Logger.debug('EventsNavigator', 'Resetting events layout', { tab: tabToReset });
    
    // Don't trigger layout changes if we're already adjusting
    if (isAdjustingLayout.current) {
      Logger.debug('EventsNavigator', 'Skipping layout reset - already in progress');
      return;
    }
    
    isAdjustingLayout.current = true;
    
    // Ensure tabs are visible first
    global.TabsVisible = true;
    
    // Wait for tab bar to appear
    InteractionManager.runAfterInteractions(() => {
      if (!mountedRef.current) return;
      
      // Update layout after tab bar appears
      setTimeout(() => {
        if (!mountedRef.current) return;
        
        // Force refresh by incrementing counter
        setForceRefresh(prev => prev + 1);
        
        // Mark layout adjustment as complete after animation
        setTimeout(() => {
          isAdjustingLayout.current = false;
        }, 100);
      }, 50);
    });
  }, [activeTab]);

  // Function to register a scroll position for a specific tab
  const registerScrollPosition = useCallback((tab, position) => {
    if (scrollPositions.current) {
      scrollPositions.current[tab] = position;
    }
  }, []);

  // Function to get a stored scroll position
  const restoreScrollPosition = useCallback((tab) => {
    return scrollPositions.current?.[tab] || 0;
  }, []);

  // Make layout context value
  const layoutContextValue = {
    resetEventsLayout,
    registerScrollPosition,
    restoreScrollPosition,
    activeTab
  };
  
  // Setup global function for backward compatibility
  useEffect(() => {
    // Provide backward compatibility through global function
    global.resetEventsLayout = resetEventsLayout;
    
    return () => {
      mountedRef.current = false;
      global.resetEventsLayout = null;
    };
  }, [resetEventsLayout]);
  
  // Track tab bar visibility changes
  useEffect(() => {
    // Create a listener for TabsVisible changes
    const intervalId = setInterval(() => {
      if (!mountedRef.current) return;
      
      // If tabs become visible and we haven't registered it yet
      if (global.TabsVisible && !tabsHaveAppeared) {
        setTabsHaveAppeared(true);
        Logger.debug('EventsNavigator', 'Tab bar appeared');
        
        // Force layout refresh when tabs appear
        InteractionManager.runAfterInteractions(() => {
          if (mountedRef.current) {
            setForceRefresh(prev => prev + 1);
          }
        });
      }
    }, 100);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [tabsHaveAppeared]);
  
  React.useImperativeHandle(ref, () => ({
    // Expose any methods needed from this component
    resetLayout: resetEventsLayout
  }));
  
  const handleTabChange = (e) => {
    const route = e?.navigation?.getState()?.routes?.[e.navigation.getState().index];
    if (route) {
      setActiveTab(route.name);
    }
  };
  
  return (
    <LayoutProvider value={layoutContextValue}>
      <View style={styles.container} key={`events-container-${forceRefresh}`}>
        {/* Use NotchSpacer for proper top spacing */}
        <NotchSpacer />
        
        <Tab.Navigator
          screenOptions={{
            tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
            tabBarStyle: { 
              backgroundColor: 'white',
              position: 'relative',
              height: 48,
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
            },
            tabBarIndicatorStyle: { backgroundColor: '#007AFF' },
            tabBarPressColor: 'rgba(0, 122, 255, 0.1)',
            swipeEnabled: true,
            lazy: false, // Don't use lazy loading to prevent layout shifts
          }}
          onIndexChange={(index) => {
            const tabName = ['Scheduled', 'Ongoing', 'Completed'][index];
            setActiveTab(tabName);
          }}
        >
          <Tab.Screen 
            name="Scheduled" 
            component={WrappedScheduledEventsScreen}
            options={{ resetKey: forceRefresh }}
            listeners={{
              tabPress: () => setActiveTab('Scheduled')
            }}
          />
          <Tab.Screen 
            name="Ongoing" 
            component={WrappedOngoingEventsScreen}
            options={{ resetKey: forceRefresh }}
            listeners={{
              tabPress: () => setActiveTab('Ongoing')
            }}
          />
          <Tab.Screen 
            name="Completed" 
            component={WrappedCompletedEventsScreen}
            options={{ resetKey: forceRefresh }}
            listeners={{
              tabPress: () => setActiveTab('Completed')
            }}
          />
        </Tab.Navigator>
      </View>
    </LayoutProvider>
  );
});

// Add display name to help with debugging
EventsNavigator.displayName = 'EventsNavigator';

export default EventsNavigator;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
});
