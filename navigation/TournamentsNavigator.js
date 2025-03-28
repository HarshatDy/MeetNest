import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { View, StyleSheet } from 'react-native';
import TournamentsScreen from '../screens/tournaments/TournamentsScreen';
import StandingsNavigator from './StandingsNavigator';
import { CustomTabBar } from '../components/CustomTabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createMaterialTopTabNavigator();

export default function TournamentsNavigator() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={styles.container}>
      <View style={styles.spacer} />
      
      <Tab.Navigator
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
          tabBarStyle: { backgroundColor: 'white' },
          tabBarIndicatorStyle: { backgroundColor: '#007AFF' },
          tabBarPressColor: 'rgba(0, 122, 255, 0.1)',
          contentStyle: { paddingTop: 0 },
        }}
      >
        <Tab.Screen 
          name="Tournaments" 
          component={TournamentsScreen}
        />
        <Tab.Screen 
          name="Standings" 
          component={StandingsNavigator}
          options={{
            contentStyle: { paddingTop: 0 },
            // Reduce bottom padding on the parent tab to shrink space with nested tabs
            tabBarItemStyle: { paddingBottom: 0 }
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  spacer: {
    height: 8,
    backgroundColor: 'white',
  }
});
