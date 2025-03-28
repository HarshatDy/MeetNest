import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logger } from '../utils/Logger';

export function CustomTabBar({ state, descriptors, navigation, position }) {
  // Get safe area insets to detect notch
  const insets = useSafeAreaInsets();
  
  return (
    <View 
      style={[
        styles.container, 
        // Ensure there's always some padding at the top, even without a notch
        { paddingTop: insets.top > 0 ? insets.top : 10 }
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title || route.name;
        
        const isFocused = state.index === index;
        
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };
        
        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };
        
        // Use a regular style object since we're not using animations
        const tabStyle = {
          opacity: isFocused ? 1 : 0.7,
          borderBottomWidth: isFocused ? 2 : 0,
          borderBottomColor: '#007AFF',
        };
        
        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.accessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[styles.tabItem, tabStyle]}
          >
            <Text 
              style={[
                styles.label, 
                { color: isFocused ? '#007AFF' : '#666' }
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    minHeight: 48,
    paddingBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  }
});
