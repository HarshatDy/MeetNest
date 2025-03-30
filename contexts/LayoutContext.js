import React, { createContext, useContext } from 'react';

// Create the context
const LayoutContext = createContext({
  resetEventsLayout: () => {},
  registerScrollPosition: () => {},
  restoreScrollPosition: () => {},
});

// Create a hook for easy consumption
export const useLayout = () => useContext(LayoutContext);

// Export the context provider and consumer
export const LayoutProvider = LayoutContext.Provider;
export const LayoutConsumer = LayoutContext.Consumer;

export default LayoutContext;
