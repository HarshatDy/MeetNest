import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import StandingItem from '../../../components/StandingItem';

const GLOBAL_STANDINGS = [
  {
    id: '1',
    rank: 1,
    name: 'Green Meadows',
    points: 1250,
    activities: 120,
    members: 85,
    location: 'North Side'
  },
  {
    id: '2',
    rank: 2,
    name: 'Sunset Heights',
    points: 1120,
    activities: 105,
    members: 72,
    location: 'West Side'
  },
  {
    id: '3',
    rank: 3,
    name: 'Ocean View',
    points: 980,
    activities: 98,
    members: 65,
    location: 'East Side'
  },
  {
    id: '4',
    rank: 4,
    name: 'Mountain Terrace',
    points: 920,
    activities: 87,
    members: 60,
    location: 'South Side'
  }
];

export default function GlobalStandingsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Society Rankings</Text>
      </View>
      <FlatList
        data={GLOBAL_STANDINGS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StandingItem standing={item} isGlobal={true} />}
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
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  listContent: {
    padding: 10,
  }
});
