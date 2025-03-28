import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function NotchSpacer() {
  const insets = useSafeAreaInsets();
  
  // Ensure there's always at least a small spacing for better visual appearance
  const topSpacing = Math.max(insets.top, 8);
  
  return (
    <View style={{ height: topSpacing, backgroundColor: 'white' }} />
  );
}

export function hasNotch() {
  // This is useful for components that can't use hooks directly
  return Platform.OS === 'ios' ? 
    // For iOS devices, check if iPhone X or newer
    /iPhone X|iPhone 11|iPhone 12|iPhone 13|iPhone 14|iPhone 15/.test(Platform.constants.Model) : 
    // For Android, this is harder to determine without runtime checks
    false;
}

export function useNotchHeight() {
  const insets = useSafeAreaInsets();
  return insets.top;
}

export function NotchAwareView({ children, style }) {
  const insets = useSafeAreaInsets();
  
  // Ensure there's always at least a small spacing
  const topSpacing = Math.max(insets.top, 10);
  
  return (
    <View style={[
      styles.container,
      { paddingTop: topSpacing },
      style
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
