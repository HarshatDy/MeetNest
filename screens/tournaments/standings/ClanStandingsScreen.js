import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import StandingItem from '../../../components/StandingItem';

const CLAN_STANDINGS = [
  {
    id: '1',
    rank: 1,
    name: 'Tower A',
    points: 520,
    activities: 48,
    members: 25,
    society: 'Green Meadows'
  },
  {
    id: '2',
    rank: 2,
    name: 'Tower B',
    points: 485,
    activities: 43,
    members: 30,
    society: 'Green Meadows'
  },
  {
    id: '3',
    rank: 3,
    name: 'Tower C',
    points: 420,
    activities: 39,
    members: 28,
    society: 'Green Meadows'
  }
];

export default function ClanStandingsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Building/Tower Rankings</Text>
      </View>
      <FlatList
        data={CLAN_STANDINGS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StandingItem standing={item} isClan={true} />}
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
