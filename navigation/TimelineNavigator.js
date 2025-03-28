import React, { useEffect, useRef, useState } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { View, StyleSheet, Dimensions, AppState, findNodeHandle, UIManager } from 'react-native';
import GlobalTimelineScreen from '../screens/timeline/GlobalTimelineScreen';
import LocalTimelineScreen from '../screens/timeline/LocalTimelineScreen';
import { CustomTabBar } from '../components/CustomTabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logger } from '../utils/Logger';
import { useNavigation } from '@react-navigation/native';
import { LayoutDebugger } from '../utils/LayoutDebugger';

const Tab = createMaterialTopTabNavigator();

// Global state for tab visibility
global.TabsVisible = true;

// Global reference for refresh functionality
global.TimelineRefresh = () => {
  Logger.debug('TimelineNavigator', 'Global refresh called');
};

// Adding a new function to explicitly reset timeline layout
global.resetTimelineLayout = () => {
  Logger.debug('TimelineNavigator', 'Global resetTimelineLayout called');
};

export default function TimelineNavigator() {
  const insets = useSafeAreaInsets();
  const [screenHeight, setScreenHeight] = React.useState(Dimensions.get('window').height);
  const appState = useRef(AppState.currentState);
  const navigation = useNavigation();
  const containerRef = useRef(null);
  const tabBarRef = useRef(null);
  const [layoutMeasurements, setLayoutMeasurements] = useState({
    container: null,
    tabBar: null,
    content: null,
  });
  const [forceRefresh, setForceRefresh] = useState(0);
  const [tabsVisible, setTabsVisible] = useState(true);
  
  // Initialize global measurements object for cross-component tracking
  if (!global.TimelineMeasurements) {
    global.TimelineMeasurements = {
      topOffset: 0,
      bottomOffset: 0,
      topTabHeight: 0,
      bottomTabHeight: 60, // Approximate value
      mainContainerHeight: 0,
      visibleContentHeight: 0,
      getReport: () => logCurrentMeasurements(),
    };
  }
  
  // Function to log comprehensive measurements
  const logCurrentMeasurements = () => {
    const measurements = {
      ...global.TimelineMeasurements,
      windowHeight: screenHeight,
      insets: {
        top: insets.top,
        bottom: insets.bottom,
      },
      layouts: layoutMeasurements,
    };
    
    LayoutDebugger.logTimelineHeights('TimelineNavigator', measurements);
    return measurements;
  };
  
  // Make measurement function globally available
  global.logTimelineMeasurements = logCurrentMeasurements;
  
  // Log component mounting
  useEffect(() => {
    Logger.debug('TimelineNavigator', 'Component mounted', { 
      screenHeight,
      topInset: insets.top
    });
    
    // Log detailed screen dimensions
    LayoutDebugger.logScreenDimensions('TimelineNavigator', 'Initial mount');
    
    // Set up global refresh function that can be called from other components
    global.TimelineRefresh = () => {
      Logger.debug('TimelineNavigator', 'Global refresh called');
      // Force navigation to reset its state by navigating to current route
      if (navigation) {
        const currentRoute = navigation.getCurrentRoute?.();
        if (currentRoute) {
          Logger.debug('TimelineNavigator', `Refreshing route: ${currentRoute.name}`);
          navigation.setParams({ refresh: Date.now() });
        }
      }
      
      // Force remount of screens to fix layout
      setForceRefresh(prev => prev + 1);
      
      // Ensure tabs are visible
      global.TabsVisible = true;
      setTabsVisible(true);
    };
    
    // Setup global function to reset timeline layout
    global.resetTimelineLayout = () => {
      Logger.debug('TimelineNavigator', 'Resetting timeline layout');
      setForceRefresh(prev => prev + 1);
      
      // Ensure tabs are visible
      global.TabsVisible = true;
      setTabsVisible(true);
      
      // Force measurement after reset
      setTimeout(() => {
        measureAllElements();
      }, 100);
    };
    
    // Schedule a layout measurement after component is fully mounted
    setTimeout(() => {
      measureAllElements();
    }, 500);
    
    return () => {
      Logger.debug('TimelineNavigator', 'Component unmounting');
      global.TimelineRefresh = () => {};
      global.resetTimelineLayout = () => {};
    };
  }, [navigation]);
  
  // Measure all key elements to establish relative positions
  const measureAllElements = () => {
    if (containerRef.current) {
      containerRef.current.measure((x, y, width, height, pageX, pageY) => {
        const containerMeasurements = { x, y, width, height, pageX, pageY };
        Logger.debug('TimelineNavigator', 'Container measurements', containerMeasurements);
        
        // Update global measurements
        global.TimelineMeasurements.mainContainerHeight = height;
        global.TimelineMeasurements.topOffset = pageY;
        
        // Update layout state
        setLayoutMeasurements(prev => ({
          ...prev,
          container: containerMeasurements
        }));
        
        // Measure tab bar if available
        if (tabBarRef.current) {
          tabBarRef.current.measure((x, y, width, height, pageX, pageY) => {
            const tabBarMeasurements = { x, y, width, height, pageX, pageY };
            Logger.debug('TimelineNavigator', 'Tab bar measurements', tabBarMeasurements);
            
            // Update global measurements
            global.TimelineMeasurements.topTabHeight = height;
            
            // Update layout state
            setLayoutMeasurements(prev => ({
              ...prev,
              tabBar: tabBarMeasurements
            }));
            
            // Calculate and update content height
            const contentHeight = containerMeasurements.height - tabBarMeasurements.height;
            global.TimelineMeasurements.visibleContentHeight = contentHeight;
            
            setLayoutMeasurements(prev => ({
              ...prev,
              content: {
                height: contentHeight,
                y: tabBarMeasurements.pageY + tabBarMeasurements.height,
              }
            }));
            
            // Log a complete report
            logCurrentMeasurements();
          });
        }
      });
    }
  };
  
  // Monitor screen dimensions to handle any changes
  useEffect(() => {
    const handleDimensionsChange = ({ window }) => {
      Logger.debug('TimelineNavigator', 'Screen dimensions changed', { 
        height: window.height,
        width: window.width
      });
      setScreenHeight(window.height);
      
      // Log detailed dimensions after change
      LayoutDebugger.logScreenDimensions('TimelineNavigator', 'After dimensions change');
      
      // Re-measure after dimensions change
      setTimeout(() => {
        measureAllElements();
      }, 300);
    };
    
    Dimensions.addEventListener('change', handleDimensionsChange);
    
    return () => {
      // Clean up the listener
      Logger.debug('TimelineNavigator', 'Cleaning up dimensions listener');
      const dimensionsHandler = Dimensions.removeEventListener?.('change', handleDimensionsChange);
      if (dimensionsHandler?.remove) {
        dimensionsHandler.remove();
      }
    };
  }, []);
  
  // Track app state changes
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      Logger.debug('TimelineNavigator', `App state changed from ${appState.current} to ${nextAppState}`);
      
      // When app comes back to foreground, log dimensions and reset if needed
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        Logger.debug('TimelineNavigator', 'App returned to foreground');
        LayoutDebugger.logScreenDimensions('TimelineNavigator', 'App returned to foreground');
        
        // Force refresh after returning to foreground
        setTimeout(() => {
          global.TimelineRefresh();
        }, 50);
        
        // Re-measure after a delay to ensure UI is settled
        setTimeout(() => {
          measureAllElements();
        }, 500);
      }
      
      appState.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  // Log when screen height changes
  useEffect(() => {
    Logger.state('TimelineNavigator', 'screenHeight', screenHeight);
  }, [screenHeight]);
  
  // Watch global tab visibility state
  useEffect(() => {
    const checkTabsVisible = () => {
      if (global.TabsVisible !== tabsVisible) {
        setTabsVisible(global.TabsVisible);
      }
    };
    
    // Check periodically
    const interval = setInterval(checkTabsVisible, 200);
    
    return () => {
      clearInterval(interval);
    };
  }, [tabsVisible]);
  
  return (
    <View 
      ref={containerRef}
      style={[styles.container, { height: screenHeight }]}
      onLayout={(e) => {
        LayoutDebugger.logLayout('TimelineNavigator', 'Container', e.nativeEvent.layout);
        // Schedule a layout measurement after a short delay to allow child components to render
        setTimeout(() => {
          measureAllElements();
        }, 300);
      }}
    >
      {/* Always add some spacing at the top */}
      <View style={[
        styles.spacer, 
        { height: Math.max(8, insets.top / 2) }
      ]} />
      
      <Tab.Navigator
        key={`tab-navigator-${forceRefresh}`}
        tabBar={props => <CustomTabBar {...props} tabBarRef={tabBarRef} />}
        screenOptions={{
          tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
          tabBarStyle: { 
            backgroundColor: 'white',
            // Ensure tab bar is always visible
            display: tabsVisible ? 'flex' : 'flex',
            zIndex: 100,
            elevation: 2,
          },
          tabBarIndicatorStyle: { backgroundColor: '#007AFF' },
          tabBarPressColor: 'rgba(0, 122, 255, 0.1)',
          // Disable lazy loading to prevent blank screens
          lazy: false,
          // Control swipe behavior - moved from props to screenOptions
          swipeEnabled: true,
          // Make sure screens always remount properly by not preserving state
          unmountOnBlur: false,
          // Force screens to remount when focused - critical for fixing the blank screen issue
          freezeOnBlur: false,
        }}
        initialLayout={{ width: Dimensions.get('window').width }}
        style={{ flex: 1 }}
        listeners={{
          tabPress: e => {
            Logger.userAction('TimelineNavigator', 'Tab pressed', { target: e.target });
            // Re-measure after tab changes
            setTimeout(() => {
              measureAllElements();
            }, 300);
          },
        }}
      >
        <Tab.Screen 
          name="Local" 
          component={LocalTimelineScreen}
          initialParams={{ refresh: forceRefresh }}
          listeners={{
            focus: () => {
              Logger.debug('TimelineNavigator', 'Local tab focused');
              LayoutDebugger.logScreenDimensions('TimelineNavigator', 'Local tab focused');
              // Measure when focused
              setTimeout(() => {
                measureAllElements();
              }, 300);
            },
            blur: () => Logger.debug('TimelineNavigator', 'Local tab blurred'),
          }}
        />
        <Tab.Screen 
          name="Global" 
          component={GlobalTimelineScreen}
          initialParams={{ refresh: forceRefresh }}
          listeners={{
            focus: () => {
              Logger.debug('TimelineNavigator', 'Global tab focused');
              LayoutDebugger.logScreenDimensions('TimelineNavigator', 'Global tab focused');
              // Measure when focused
              setTimeout(() => {
                measureAllElements();
              }, 300);
            },
            blur: () => Logger.debug('TimelineNavigator', 'Global tab blurred'),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  spacer: {
    height: 8,
    backgroundColor: 'white',
  }
});
