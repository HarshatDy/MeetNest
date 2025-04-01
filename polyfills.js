// This file provides polyfills for potential compatibility issues
// with react-native-safe-area-context and other components

// Fix for missing global React in newer Expo/React Native versions
if (typeof global.React === 'undefined') {
  const React = require('react');
  global.React = React;
}

// Add any necessary global polyfills here
if (!global.setImmediate) {
  global.setImmediate = setTimeout;
}

// Patch any event handling issues
if (!global.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  global.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { isDisabled: true };
}

export default function installPolyfills() {
  // This function can be called from index.js or App.js if needed
  console.log('Polyfills installed');
}
