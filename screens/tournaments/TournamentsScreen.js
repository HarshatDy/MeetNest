import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import TournamentCard from '../../components/TournamentCard';

const DUMMY_TOURNAMENTS = {
  dated: [
    {
      id: '1',
      title: 'Summer Football Championship',
      date: '2023-09-15',
      location: 'Central Park',
      participants: 8,
      society: 'Green Meadows',
      image: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12'
    },
    {
      id: '2',
      title: 'Inter-Society Basketball Cup',
      date: '2023-09-22',
      location: 'Sports Complex',
      participants: 6,
      society: 'Multiple',
      image: 'https://images.unsplash.com/photo-1519861531473-9200262188bf'
    }
  ],
  ongoing: [
    {
      id: '3',
      title: 'Table Tennis Tournament',
      startDate: '2023-08-01',
      endDate: '2023-08-18',
      location: 'Community Center',
      participants: 16,
      society: 'Sunset Heights',
      image: 'https://images.unsplash.com/photo-1534158914592-062992fbe900'
    }
  ],
  completed: [
    {
      id: '4',
      title: 'Spring Chess Competition',
      date: '2023-07-10',
      location: 'Library Hall',
      participants: 12,
      winner: 'Alex Chen',
      society: 'Green Meadows',
      image: 'https://images.unsplash.com/photo-1528819622765-d6bcf132f793'
    },
    {
      id: '5',
      title: 'Swimming Competition',
      date: '2023-06-25',
      location: 'Aquatic Center',
      participants: 20,
      winner: 'Sarah Johnson',
      society: 'Ocean View',
      image: 'https://images.unsplash.com/photo-1559285092-a9acd7c38bf0'
    }
  ]
};

export default function TournamentsScreen() {
  const [activeTab, setActiveTab] = useState('dated');
  
  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'dated' && styles.activeTab]}
        onPress={() => setActiveTab('dated')}
      >
        <Text style={[styles.tabText, activeTab === 'dated' && styles.activeTabText]}>
          Upcoming
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'ongoing' && styles.activeTab]}
        onPress={() => setActiveTab('ongoing')}
      >
        <Text style={[styles.tabText, activeTab === 'ongoing' && styles.activeTabText]}>
          Ongoing
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
        onPress={() => setActiveTab('completed')}
      >
        <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
          Completed
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderTabs()}
      <FlatList
        data={DUMMY_TOURNAMENTS[activeTab]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TournamentCard tournament={item} status={activeTab} />
        )}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600', // Use numeric weight instead of 'bold'
  },
  listContent: {
    padding: 10,
  }
});
