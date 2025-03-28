import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import LocalStandingsScreen from '../screens/tournaments/standings/LocalStandingsScreen';
import ClanStandingsScreen from '../screens/tournaments/standings/ClanStandingsScreen';
import GlobalStandingsScreen from '../screens/tournaments/standings/GlobalStandingsScreen';
import { CompactTabBar } from '../components/CompactTabBar';
import { View, StyleSheet } from 'react-native';

const Tab = createMaterialTopTabNavigator();

export default function StandingsNavigator() {
  return (
    <View style={styles.container}>
      <Tab.Navigator
        tabBar={props => <CompactTabBar {...props} />}
        screenOptions={{
          tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
          tabBarStyle: { backgroundColor: 'white', height: 30 },
          tabBarIndicatorStyle: { backgroundColor: '#007AFF' },
          tabBarPressColor: 'rgba(0, 122, 255, 0.1)',
          tabBarItemStyle: { padding: 0, margin: 0, height: 30 },
          tabBarContentContainerStyle: { height: 30 },
          lazy: false, // Load all tabs immediately to avoid layout jumps
          swipeEnabled: true, // Moved from props to screenOptions
        }}
      >
        <Tab.Screen 
          name="Local" 
          component={LocalStandingsScreen}
        />
        <Tab.Screen 
          name="Clan" 
          component={ClanStandingsScreen}
        />
        <Tab.Screen 
          name="Global" 
          component={GlobalStandingsScreen}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    marginTop: -5, // Negative margin to reduce space with parent tab
  }
});
