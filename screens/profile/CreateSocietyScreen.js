import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Logger } from '../../utils/Logger';
import { useUser } from '../../contexts/UserContext';

export default function CreateSocietyScreen({ navigation }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [rules, setRules] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, updateUser } = useUser();

  const validateInputs = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Society name is required");
      return false;
    }
    if (!description.trim()) {
      Alert.alert("Error", "Please provide a description for your society");
      return false;
    }
    if (!location.trim()) {
      Alert.alert("Error", "Location is required");
      return false;
    }
    return true;
  };

  const handleCreateSociety = async () => {
    if (!validateInputs()) return;

    try {
      setLoading(true);
      // Import the service that communicates with MongoDB
      const { createSociety } = require('../../src/services/mongoService');
      
      const societyData = {
        name,
        description,
        location,
        rules: rules || 'No specific rules',
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        members: [user.id],
        status: 'active',
        memberCount: 1
      };
      
      // Create society in MongoDB
      const newSociety = await createSociety(societyData);
      Logger.userAction('CreateSocietyScreen', 'User created society', { societyId: newSociety._id || newSociety.id });
      
      // Update the user context with the new society
      const societyId = newSociety._id || newSociety.id;
      const updatedSocieties = [...(user.societies || []), societyId];
      await updateUser({ ...user, societies: updatedSocieties });
      
      Alert.alert(
        "Success", 
        `Your society "${name}" has been created!`,
        [
          { 
            text: "OK", 
            onPress: () => navigation.navigate('Your Profile') 
          }
        ]
      );
    } catch (error) {
      Logger.error('CreateSocietyScreen', 'Error creating society', error);
      Alert.alert("Error", "Failed to create society. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container}>
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Society Name*</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter society name"
              maxLength={50}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description*</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the purpose and goals of your society"
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.characterCount}>{description.length}/500</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location*</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Primary area or neighborhood"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Community Rules (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={rules}
              onChangeText={setRules}
              placeholder="List any rules or guidelines for members"
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.characterCount}>{rules.length}/500</Text>
          </View>
          
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.infoText}>
              As the creator, you'll automatically become the administrator of this society. 
              You can add more administrators later.
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.createButton}
            onPress={handleCreateSociety}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={24} color="white" />
                <Text style={styles.createButtonText}>Create Society</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});
