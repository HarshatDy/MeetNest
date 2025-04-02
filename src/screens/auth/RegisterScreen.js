import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useUser } from '../../contexts/UserContext';
import { createUser, checkExistingUser, sendOTP } from '../../services/authService';
import { Logger } from '../../utils/Logger';
import * as ImagePicker from 'expo-image-picker';

const RegisterScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { login } = useUser();
  
  // Initial values may come from social login
  const initialParams = route.params || {};
  
  const [name, setName] = useState(initialParams.name || '');
  const [email, setEmail] = useState(initialParams.email || '');
  const [phoneNumber, setPhoneNumber] = useState(initialParams.phoneNumber || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState(initialParams.avatar || null);
  const [society, setSociety] = useState('');
  const [authProvider, setAuthProvider] = useState(initialParams.authProvider || 'email');
  const [loading, setLoading] = useState(false);

  // Helper for image picking
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatar(result.assets[0].uri);
      }
    } catch (error) {
      Logger.error('RegisterScreen', 'Error picking image', { error: error.message });
      Alert.alert('Error', 'Could not select image. Please try again.');
    }
  };

  // Validate registration inputs
  const validateInputs = () => {
    if (!name.trim()) {
      Alert.alert('Missing Information', 'Please enter your name.');
      return false;
    }
    
    if (authProvider === 'email' && !email.trim()) {
      Alert.alert('Missing Information', 'Please enter your email address.');
      return false;
    }
    
    if (authProvider === 'email' && !password) {
      Alert.alert('Missing Information', 'Please enter a password.');
      return false;
    }
    
    if (authProvider === 'email' && password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return false;
    }
    
    if (authProvider === 'phone' && !phoneNumber) {
      Alert.alert('Missing Information', 'Please enter your phone number.');
      return false;
    }
    
    if (!society.trim()) {
      Alert.alert('Missing Information', 'Please enter your society name.');
      return false;
    }
    
    return true;
  };

  // Handle registration submission
  const handleRegister = async () => {
    if (!validateInputs()) return;
    
    setLoading(true);
    
    try {
      if (authProvider === 'phone') {
        // Send OTP for phone verification
        const otpSent = await sendOTP(phoneNumber);
        if (otpSent) {
          navigation.navigate('OTPVerification', {
            phoneNumber,
            isExistingUser: false,
            userData: {
              name,
              email,
              society,
              avatar,
              authProvider,
            },
          });
        } else {
          Alert.alert('Error', 'Failed to send OTP. Please try again.');
        }
        setLoading(false);
        return;
      }
      
      // Check if user already exists
      if (authProvider === 'email') {
        const exists = await checkExistingUser(email);
        if (exists) {
          Alert.alert(
            'Account Exists', 
            'An account with this email already exists. Please log in instead.'
          );
          setLoading(false);
          return;
        }
      }
      
      // For email/password registration, create user directly
      const user = await createUser({
        name,
        email,
        password,
        phoneNumber,
        society,
        avatar,
        authProvider
      });
      
      // Login with new user
      await login(user);
      
      Logger.userAction('RegisterScreen', 'Registration successful', { email, authProvider });
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (error) {
      Logger.error('RegisterScreen', 'Registration error', { error: error.message });
      Alert.alert('Registration Failed', error.message || 'Could not complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={pickImage}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#ccc" />
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={18} color="white" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarText}>Profile Photo</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="business-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Society/Community Name"
              value={society}
              onChangeText={setSociety}
            />
          </View>

          {/* Show email input for all providers, but it's required only for email auth */}
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={authProvider === 'email' ? "Email (required)" : "Email (optional)"}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!initialParams.email} // Can't edit if pre-filled from social login
            />
          </View>

          {/* Phone number input */}
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={authProvider === 'phone' ? "Phone Number (required)" : "Phone Number (optional)"}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!initialParams.phoneNumber} // Can't edit if pre-filled
            />
          </View>

          {/* Password fields only for email auth */}
          {authProvider === 'email' && (
            <>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By signing up, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 60 : 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 24, // For balance
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  formContainer: {
    paddingHorizontal: 30,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  registerButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsContainer: {
    marginTop: 20,
  },
  termsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  termsLink: {
    color: '#007AFF',
  },
});

export default RegisterScreen;
