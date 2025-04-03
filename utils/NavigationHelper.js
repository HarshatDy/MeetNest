import { CommonActions } from '@react-navigation/native';
import { Logger, DEBUG_ENABLED } from './Logger';

// Navigation reference to be initialized in App.js
let navigationRef = null;

export const NavigationHelper = {
  /**
   * Initialize the navigation reference
   * @param {Object} ref - Reference to the navigation container
   */
  setNavigationRef: (ref) => {
    navigationRef = ref;
  },

  /**
   * Debug helper to log navigation state
   * @returns {Object|null} Navigation state details
   */
  getNavigationState: () => {
    if (!navigationRef) {
      Logger.error('NavigationHelper', 'getNavigationState', 'Navigation reference not set');
      return null;
    }

    try {
      const state = navigationRef.getRootState();
      
      // Log current navigation state
      if (DEBUG_ENABLED) { // Wrap debug logs with the flag
        Logger.debug('NavigationHelper', 'Current navigation state', { 
          routes: state?.routes?.map(r => r.name) || [],
          index: state?.index,
          routeNames: navigationRef.getCurrentOptions()?.routeNames || [],
          currentRoute: navigationRef.getCurrentRoute()?.name,
          currentNavigator: state?.routes?.[state?.index]?.name || 'unknown'
        });
      }

      // Try to collect names of all screens in the app
      const allScreens = [];
      const processRoutes = (routes) => {
        if (!routes) return;
        routes.forEach(route => {
          allScreens.push(route.name);
          // Process nested state (for nested navigators)
          if (route.state && route.state.routes) {
            processRoutes(route.state.routes);
          }
        });
      };
      
      processRoutes(state?.routes);
      
      if (DEBUG_ENABLED) { // Wrap debug logs with the flag
        Logger.debug('NavigationHelper', 'Available screens', { screens: allScreens });
      }
      
      return {
        state,
        currentRoute: navigationRef.getCurrentRoute()?.name,
        allScreens
      };
    } catch (error) {
      Logger.error('NavigationHelper', 'Error analyzing navigation state', error);
      return null;
    }
  },

  /**
   * Handle logout navigation - reset to the login screen
   */
  navigateToLogin: () => {
    if (!navigationRef) {
      Logger.error('NavigationHelper', 'navigateToLogin', 'Navigation reference not set');
      return false;
    }

    try {
      // First log the current navigation state for debugging
      const navState = NavigationHelper.getNavigationState();
      if (DEBUG_ENABLED) { // Wrap debug logs with the flag
        Logger.debug('NavigationHelper', 'Attempting to navigate to Login', { 
          currentState: navState?.currentRoute || 'unknown',
          resetToLogin: { index: 0, routes: [{ name: 'Login' }] }
        });
      }
      
      // NEW APPROACH: Reset the ROOT navigator instead of the current navigator
      // This ensures we're resetting to the authentication flow regardless of which screen we're on
      try {
        // First try to navigate to the root level, then reset
        navigationRef.navigate('Login');
        return true;
      } catch (directError) {
        // If that fails, try with CommonActions reset at root level
        navigationRef.dispatch(state => {
          // Create a reset action that goes to the root of the app
          const rootState = navigationRef.getRootState();
          
          // Find the outermost stack that contains Login
          // If we can't determine it, just use a simple reset
          return CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }]
          });
        });
        
        if (DEBUG_ENABLED) { // Wrap debug logs with the flag
          Logger.navigation('navigateToLogin', 'Reset navigation to root with Login screen');
        }
        return true;
      }
    } catch (error) {
      Logger.error('NavigationHelper', 'navigateToLogin', error);
      return false;
    }
  },

  /**
   * Navigate to the Timeline tab and then to the Local screen
   * @param {Object} params - Parameters to pass to the screen
   */
  navigateToLocalTimeline: (params = {}) => {
    if (!navigationRef) {
      Logger.error('NavigationHelper', 'navigateToLocalTimeline', 'Navigation reference not set');
      return;
    }

    try {
      // First navigate to the Timeline tab
      navigationRef.dispatch(
        CommonActions.navigate({
          name: 'Timeline',
        })
      );

      // Then navigate to the Local screen within the Timeline tab
      setTimeout(() => {
        navigationRef.dispatch(
          CommonActions.navigate({
            name: 'Local',
            params
          })
        );
      }, 100);

      if (DEBUG_ENABLED) { // Wrap debug logs with the flag
        Logger.navigation('navigateToLocalTimeline', 'Timeline > Local', params);
      }
    } catch (error) {
      Logger.error('NavigationHelper', 'navigateToLocalTimeline', error);
    }
  },

  /**
   * General purpose method to navigate to any screen with proper nesting
   * @param {Array} path - Array of screen names representing the navigation path
   * @param {Object} params - Parameters to pass to the target screen
   */
  navigateTo: (path, params = {}) => {
    if (!navigationRef) {
      Logger.error('NavigationHelper', 'navigateTo', 'Navigation reference not set');
      return;
    }

    if (!path || !Array.isArray(path) || path.length === 0) {
      Logger.error('NavigationHelper', 'navigateTo', 'Invalid navigation path');
      return;
    }

    try {
      // Navigate to the first screen in the path
      navigationRef.dispatch(
        CommonActions.navigate({
          name: path[0],
        })
      );

      // If there are nested screens, navigate to them with a slight delay
      if (path.length > 1) {
        setTimeout(() => {
          const target = path[path.length - 1];
          navigationRef.dispatch(
            CommonActions.navigate({
              name: target,
              params
            })
          );
        }, 100);
      }

      if (DEBUG_ENABLED) { // Wrap debug logs with the flag
        Logger.navigation('navigateTo', path.join(' > '), params);
      }
    } catch (error) {
      Logger.error('NavigationHelper', 'navigateTo', error);
    }
  }
};
