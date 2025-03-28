import { CommonActions } from '@react-navigation/native';
import { Logger } from './Logger';

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

      Logger.navigation('navigateToLocalTimeline', 'Timeline > Local', params);
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

      Logger.navigation('navigateTo', path.join(' > '), params);
    } catch (error) {
      Logger.error('NavigationHelper', 'navigateTo', error);
    }
  }
};
