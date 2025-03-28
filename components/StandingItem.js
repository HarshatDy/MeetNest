import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StandingItem({ standing, isClan = false, isGlobal = false }) {
  // Different renders for user standings, clan standings, or society standings
  const renderRank = () => {
    let color = '#666';
    if (standing.rank === 1) {
      color = '#FFD700'; // Gold
    } else if (standing.rank === 2) {
      color = '#C0C0C0'; // Silver
    } else if (standing.rank === 3) {
      color = '#CD7F32'; // Bronze
    }

    return (
      <View style={[styles.rankContainer, { backgroundColor: color }]}>
        <Text style={styles.rankText}>{standing.rank}</Text>
      </View>
    );
  };

  const renderPersonalStanding = () => (
    <View style={styles.container}>
      {renderRank()}
      <Image source={{ uri: standing.avatar }} style={styles.avatar} />
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{standing.name}</Text>
        <Text style={styles.subText}>{standing.role}</Text>
      </View>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{standing.points}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{standing.activities}</Text>
          <Text style={styles.statLabel}>Activities</Text>
        </View>
      </View>
    </View>
  );

  const renderClanStanding = () => (
    <View style={styles.container}>
      {renderRank()}
      <View style={styles.clanIconContainer}>
        <Ionicons name="business" size={24} color="#007AFF" />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{standing.name}</Text>
        <Text style={styles.subText}>{standing.society}</Text>
      </View>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{standing.points}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{standing.members}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
      </View>
    </View>
  );

  const renderGlobalStanding = () => (
    <View style={styles.container}>
      {renderRank()}
      <View style={styles.societyIconContainer}>
        <Ionicons name="home" size={24} color="#007AFF" />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{standing.name}</Text>
        <Text style={styles.subText}>{standing.location}</Text>
      </View>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{standing.points}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{standing.members}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
      </View>
    </View>
  );

  if (isGlobal) {
    return renderGlobalStanding();
  } else if (isClan) {
    return renderClanStanding();
  } else {
    return renderPersonalStanding();
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  rankContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  clanIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  societyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  subText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
  },
  statItem: {
    alignItems: 'center',
    marginLeft: 10,
    minWidth: 50,
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
  },
});
