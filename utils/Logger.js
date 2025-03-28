/**
 * Simple logging utility for debugging purposes
 */

// Set to true to enable debug logging
const DEBUG_ENABLED = true;

export const Logger = {
  /**
   * Log a debug message
   * @param {string} component - Component or context generating the log
   * @param {string} action - The action or event that's occurring
   * @param {any} data - Optional data to log
   */
  debug: (component, action, data = null) => {
    if (!DEBUG_ENABLED) return;
    
    const timestamp = new Date().toISOString();
    const dataString = data ? `: ${JSON.stringify(data, null, 2)}` : '';
    
    console.log(`[DEBUG][${timestamp}][${component}] ${action}${dataString}`);
  },
  
  /**
   * Log an error message
   * @param {string} component - Component or context generating the log
   * @param {string} action - The action or event that's occurring
   * @param {any} error - The error object or message
   */
  error: (component, action, error) => {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR][${timestamp}][${component}] ${action}: `, error);
  },
  
  /**
   * Log user interaction
   * @param {string} component - Component where the interaction occurred
   * @param {string} action - The user action (tap, swipe, etc)
   * @param {any} data - Optional additional data
   */
  userAction: (component, action, data = null) => {
    if (!DEBUG_ENABLED) return;
    
    const timestamp = new Date().toISOString();
    const dataString = data ? `: ${JSON.stringify(data, null, 2)}` : '';
    
    console.log(`[USER][${timestamp}][${component}] ${action}${dataString}`);
  },
  
  /**
   * Log state changes
   * @param {string} component - Component where state changed
   * @param {string} state - The state that changed
   * @param {any} value - New value
   */
  state: (component, state, value) => {
    if (!DEBUG_ENABLED) return;
    
    const timestamp = new Date().toISOString();
    console.log(`[STATE][${timestamp}][${component}] ${state} changed to: `, value);
  },

  /**
   * Log navigation related events
   * @param {string} action - The navigation action (navigate, goBack, etc)
   * @param {string} target - The target screen
   * @param {any} params - Navigation parameters
   */
  navigation: (action, target, params = null) => {
    if (!DEBUG_ENABLED) return;
    
    const timestamp = new Date().toISOString();
    const paramsString = params ? `: ${JSON.stringify(params, null, 2)}` : '';
    
    console.log(`[NAV][${timestamp}] ${action} → ${target}${paramsString}`);
  }
};
