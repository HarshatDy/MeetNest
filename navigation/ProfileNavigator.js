import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AchievementsScreen from '../screens/profile/AchievementsScreen';
import ActivityHistoryScreen from '../screens/profile/ActivityHistoryScreen';
import JoinSocietyScreen from '../screens/profile/JoinSocietyScreen';
import CreateSocietyScreen from '../screens/profile/CreateSocietyScreen';

const Stack = createNativeStackNavigator();

export default function ProfileNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Your Profile" component={ProfileScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Activity History" component={ActivityHistoryScreen} />
      <Stack.Screen name="JoinSociety" component={JoinSocietyScreen} options={{ title: "Join a Society" }} />
      <Stack.Screen name="CreateSociety" component={CreateSocietyScreen} options={{ title: "Create New Society" }} />
    </Stack.Navigator>
  );
}
