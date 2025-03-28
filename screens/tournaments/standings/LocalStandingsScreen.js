import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import StandingItem from '../../../components/StandingItem';

const LOCAL_STANDINGS = [
  {
    id: '1',
    rank: 1,
    name: 'John Doe',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    role: 'President',
    points: 120,
    activities: 15
  },
  {
    id: '2',
    rank: 2,
    name: 'Michael Green',
    avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
    role: 'Member',
    points: 105,
    activities: 12
  },
  {
    id: '3',
    rank: 3,
    name: 'Emma Wilson',
    avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
    role: 'Treasurer',
    points: 98,
    activities: 10
  }
];

export default function LocalStandingsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Green Meadows Society Rankings</Text>
      </View>
      <FlatList
        data={LOCAL_STANDINGS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StandingItem standing={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    paddingTop: 0, // No top padding
    marginTop: 0, // No top margin
  },
  header: {
    padding: 8, // Reduced padding
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 14, // Smaller font
    fontWeight: 'bold',
    color: '#333',
  },
  listContent: {
    padding: 10,
  }
});
