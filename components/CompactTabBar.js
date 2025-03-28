import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export function CompactTabBar({ state, descriptors, navigation, position }) {
  return (
    <View style={styles.container}>
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
    height: 30, // Even more reduced height
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 0, // No vertical padding
    marginVertical: 0, // No vertical margin
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0, // No padding
    height: 30, // Fixed height
  },
  label: {
    fontSize: 11, // Smaller font
    fontWeight: '500',
    marginBottom: 3, // Just a bit of margin at the bottom for the indicator
  }
});
