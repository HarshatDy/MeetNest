import { Dimensions, Platform, PixelRatio, StatusBar } from 'react-native';
import { Logger } from './Logger';

/**
 * Utility for debugging layout information
 */
export const LayoutDebugger = {
  /**
   * Log detailed screen dimensions
   * @param {string} component - Component requesting the information
   * @param {string} context - Additional context about when the logging is happening
   */
  logScreenDimensions: (component, context = '') => {
    const window = Dimensions.get('window');
    const screen = Dimensions.get('screen');
    const statusBarHeight = StatusBar.currentHeight || 0;
    const pixelRatio = PixelRatio.get();
    const fontScale = PixelRatio.getFontScale();
    
    const data = {
      window: {
        width: window.width,
        height: window.height,
        scale: window.scale,
      },
      screen: {
        width: screen.width,
        height: screen.height,
        scale: screen.scale,
      },
      pixelRatio,
      fontScale,
      statusBarHeight,
      platform: Platform.OS,
      platformVersion: Platform.Version,
      deviceModel: Platform.constants?.Model || 'Unknown',
      isIphoneX: isIphoneXOrNewer(),
      context
    };
    
    Logger.debug(component, 'Screen dimensions', data);
    return data;
  },
  
  /**
   * Log layout measurements of a component
   * @param {string} component - Component name
   * @param {string} elementName - Name of the UI element being measured
   * @param {object} layout - The layout object (from onLayout event)
   * @param {object} additionalInfo - Any additional information to log
   */
  logLayout: (component, elementName, layout, additionalInfo = {}) => {
    if (!layout) return;
    
    const data = {
      element: elementName,
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
      ...additionalInfo
    };
    
    Logger.debug(component, `Layout of ${elementName}`, data);
    return data;
  },
  
  /**
   * Log the position of an element relative to another reference point
   * @param {string} component - Component name
   * @param {string} elementName - Element being positioned
   * @param {object} elementLayout - Layout of the element
   * @param {object} referenceLayout - Layout of the reference point
   * @param {string} referencePoint - Name of the reference point (e.g., "BottomTabBar")
   */
  logRelativePosition: (component, elementName, elementLayout, referenceLayout, referencePoint) => {
    if (!elementLayout || !referenceLayout) return;
    
    const data = {
      element: elementName,
      reference: referencePoint,
      // Position of element relative to reference
      distanceFromTop: elementLayout.y - referenceLayout.y,
      distanceFromBottom: (referenceLayout.y + referenceLayout.height) - (elementLayout.y + elementLayout.height),
      distanceFromLeft: elementLayout.x - referenceLayout.x,
      distanceFromRight: (referenceLayout.x + referenceLayout.width) - (elementLayout.x + elementLayout.width),
      // Absolute positions
      elementTop: elementLayout.y,
      referenceTop: referenceLayout.y,
      elementBottom: elementLayout.y + elementLayout.height,
      referenceBottom: referenceLayout.y + referenceLayout.height,
    };
    
    Logger.debug(component, `Position of ${elementName} relative to ${referencePoint}`, data);
    return data;
  },
  
  /**
   * Log components in the render tree with their heights
   * @param {string} component - Component name
   * @param {Object} components - Object mapping component names to their heights
   */
  logComponentTree: (component, components) => {
    Logger.debug(component, 'Component render tree heights', components);
  },
  
  /**
   * Log transition details when navigating between screens
   * @param {string} component - Component name
   * @param {string} fromScreen - Screen transitioning from
   * @param {string} toScreen - Screen transitioning to
   * @param {object} metrics - Any transition metrics
   */
  logTransition: (component, fromScreen, toScreen, metrics = {}) => {
    const data = {
      from: fromScreen,
      to: toScreen,
      timestamp: new Date().toISOString(),
      ...metrics
    };
    
    Logger.debug(component, `Screen transition: ${fromScreen} → ${toScreen}`, data);
  },

  /**
   * Log timeline-related measurements for debugging layout issues
   * @param {string} component - Component name
   * @param {object} measurements - Object containing various height measurements
   */
  logTimelineHeights: (component, measurements) => {
    const window = Dimensions.get('window');
    
    const data = {
      windowHeight: window.height,
      windowWidth: window.width,
      usableScreenHeight: window.height - (measurements.topTabHeight || 0) - (measurements.bottomTabHeight || 0),
      topOffset: measurements.topOffset || 0,
      bottomOffset: measurements.bottomOffset || 0,
      ...measurements,
      timestamp: new Date().toISOString(),
    };
    
    // Calculate some derived values
    if (measurements.contentHeight) {
      data.contentHeightPercentage = Math.round((measurements.contentHeight / window.height) * 100) + '%';
    }
    
    if (measurements.visibleContentHeight && measurements.totalContentHeight) {
      data.visibleContentPercentage = Math.round((measurements.visibleContentHeight / measurements.totalContentHeight) * 100) + '%';
    }
    
    Logger.debug(component, 'Timeline height measurements', data);
    return data;
  },
  
  /**
   * Log a complete layout report of all major components
   * @param {string} component - Component name
   * @param {object} layoutData - Comprehensive layout data for the entire screen
   */
  logLayoutReport: (component, layoutData) => {
    // Organize all layout measurements into a structured report
    const report = {
      screenInfo: {
        dimensions: Dimensions.get('window'),
        pixelRatio: PixelRatio.get(),
        platform: Platform.OS,
        statusBarHeight: StatusBar.currentHeight || 0,
      },
      navigationLayout: layoutData.navigation || {},
      timelineLayout: layoutData.timeline || {},
      tabBarLayout: layoutData.tabBar || {},
      contentLayout: layoutData.content || {},
      relativePositions: layoutData.positions || {},
      timestamp: new Date().toISOString(),
    };
    
    // Calculate the space distribution
    const totalHeight = report.screenInfo.dimensions.height;
    const allocatedHeight = (report.navigationLayout.height || 0) + 
                           (report.tabBarLayout.height || 0) + 
                           (report.timelineLayout.height || 0);
    
    report.spaceAllocation = {
      totalHeight,
      allocatedHeight,
      unallocatedHeight: totalHeight - allocatedHeight,
      navigationPercentage: Math.round(((report.navigationLayout.height || 0) / totalHeight) * 100),
      tabBarPercentage: Math.round(((report.tabBarLayout.height || 0) / totalHeight) * 100),
      timelinePercentage: Math.round(((report.timelineLayout.height || 0) / totalHeight) * 100),
    };
    
    Logger.debug(component, 'Complete layout report', report);
    return report;
  }
};

/**
 * Check if the device is iPhone X or newer model with a notch
 */
function isIphoneXOrNewer() {
  const { height, width } = Dimensions.get('window');
  
  // iPhone X/XS/11 Pro/12 Pro/13 Pro
  // iPhone XR/XS Max/11/11 Pro Max/12/12 Pro Max/13/13 Pro Max
  return (
    Platform.OS === 'ios' &&
    !Platform.isPad &&
    !Platform.isTV &&
    ((height === 812 || width === 812) || (height === 896 || width === 896) || (height >= 844 || width >= 844))
  );
}
