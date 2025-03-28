/**
 * Utility class to manage tab bar visibility consistently across the app
 */
class TabBarVisibilityManager {
  constructor() {
    // Initialize visibility state
    this.states = new Map();
    this.listeners = [];
    this.defaultVisible = true;
  }

  /**
   * Set tab visibility for a specific screen
   * @param {string} screenId - Unique identifier for the screen
   * @param {boolean} visible - Whether tabs should be visible
   */
  setVisibility(screenId, visible) {
    this.states.set(screenId, visible);
    this.notifyListeners();
  }

  /**
   * Remove visibility setting for a specific screen
   * @param {string} screenId - Screen to remove
   */
  clearVisibility(screenId) {
    this.states.delete(screenId);
    this.notifyListeners();
  }

  /**
   * Calculate the current visibility state based on all registered screens
   * If any screen wants tabs hidden, they stay hidden
   */
  getVisibility() {
    // If any screen has explicitly requested tabs to be hidden, honor that
    for (const visible of this.states.values()) {
      if (!visible) return false;
    }
    return this.defaultVisible;
  }

  /**
   * Set the default visibility when no screens are controlling visibility
   * @param {boolean} visible - Default visibility
   */
  setDefaultVisibility(visible) {
    this.defaultVisible = visible;
    this.notifyListeners();
  }

  /**
   * Register a listener for visibility changes
   * @param {Function} listener - Callback function
   * @returns {Function} Function to remove the listener
   */
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of visibility changes
   */
  notifyListeners() {
    const currentVisibility = this.getVisibility();
    this.listeners.forEach(listener => listener(currentVisibility));
    
    // Also update global state for backward compatibility
    global.TabsVisible = currentVisibility;
  }
}

// Export a singleton instance
export const TabBarManager = new TabBarVisibilityManager();

// Backward compatibility helper
TabBarManager.addListener((visible) => {
  global.TabsVisible = visible;
});

export default TabBarManager;
