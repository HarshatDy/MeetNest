import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AchievementsScreen from '../screens/profile/AchievementsScreen';
import ActivityHistoryScreen from '../screens/profile/ActivityHistoryScreen';

const Stack = createNativeStackNavigator();

export default function ProfileNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Your Profile" component={ProfileScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Activity History" component={ActivityHistoryScreen} />
    </Stack.Navigator>
  );
}
