import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Logger } from '../../utils/Logger';
import { useUser } from '../../contexts/UserContext';

export default function JoinSocietyScreen({ navigation }) {
  const [societies, setSocieties] = useState([]);
  const [filteredSocieties, setFilteredSocieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, updateUser } = useUser();

  // Fetch societies when the component mounts
  useEffect(() => {
    fetchSocieties();
  }, []);

  // Filter societies based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = societies.filter(society => 
        society.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        society.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSocieties(filtered);
    } else {
      setFilteredSocieties(societies);
    }
  }, [searchQuery, societies]);

  const fetchSocieties = async () => {
    try {
      setLoading(true);
      // Import the service that communicates with MongoDB
      const { getSocieties } = require('../../src/services/mongoService');
      
      // Fetch societies from MongoDB
      const societiesData = await getSocieties();
      Logger.debug('JoinSocietyScreen', 'Societies fetched from MongoDB', { count: societiesData.length });
      
      // Filter out societies the user is already part of
      const userSocieties = user.societies || [];
      const availableSocieties = societiesData.filter(society => 
        !userSocieties.includes(society._id) && 
        !userSocieties.includes(society.id)
      );
      
      setSocieties(availableSocieties);
      setFilteredSocieties(availableSocieties);
    } catch (error) {
      Logger.error('JoinSocietyScreen', 'Error fetching societies', error);
      Alert.alert("Error", "Failed to load societies. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSociety = async (society) => {
    try {
      // Import the service that communicates with MongoDB
      const { joinSociety } = require('../../src/services/mongoService');
      
      // Join the society in MongoDB
      await joinSociety(user.id, society._id || society.id);
      Logger.userAction('JoinSocietyScreen', 'User joined society', { societyId: society._id || society.id });
      
      // Update the user context
      const updatedSocieties = [...(user.societies || []), society._id || society.id];
      await updateUser({ ...user, societies: updatedSocieties });
      
      Alert.alert(
        "Success", 
        `You have joined ${society.name}!`,
        [
          { 
            text: "OK", 
            onPress: () => navigation.navigate('Your Profile') 
          }
        ]
      );
    } catch (error) {
      Logger.error('JoinSocietyScreen', 'Error joining society', error);
      Alert.alert("Error", "Failed to join society. Please try again.");
    }
  };

  const renderSocietyItem = ({ item }) => (
    <View style={styles.societyItem}>
      <View style={styles.societyInfo}>
        <Text style={styles.societyName}>{item.name}</Text>
        <Text style={styles.societyDescription}>{item.description}</Text>
        <Text style={styles.memberCount}>{item.memberCount || 0} members</Text>
      </View>
      <TouchableOpacity 
        style={styles.joinButton}
        onPress={() => handleJoinSociety(item)}
      >
        <Ionicons name="add-circle-outline" size={22} color="white" />
        <Text style={styles.joinButtonText}>Join</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search societies..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading societies...</Text>
        </View>
      ) : filteredSocieties.length > 0 ? (
        <FlatList
          data={filteredSocieties}
          renderItem={renderSocietyItem}
          keyExtractor={item => item._id || item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="people" size={60} color="#ccc" />
          <Text style={styles.emptyStateText}>
            {searchQuery 
              ? "No societies matching your search" 
              : "No societies available to join"
            }
          </Text>
          {!searchQuery && (
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateSociety')}
            >
              <Text style={styles.createButtonText}>Create a New Society</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  listContainer: {
    padding: 15,
  },
  societyItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  societyInfo: {
    flex: 1,
  },
  societyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  societyDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  memberCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  joinButton: {
    flexDirection: 'row',
    backgroundColor: '#34C759',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: 10,
  },
  joinButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
