import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import React from 'react';
import App from './App';
import installPolyfills from './polyfills';

// Initialize polyfills
installPolyfills();

// Register the root component
registerRootComponent(App);
