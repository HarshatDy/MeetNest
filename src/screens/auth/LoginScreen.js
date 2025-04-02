import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Google from 'expo-auth-session/providers/google';
import { useUser } from '../../contexts/UserContext';
import { checkExistingUser, signInWithEmail, getUserSession, fetchUserDetails } from '../../services/authService';
import { Logger } from '../../utils/Logger';
import * as WebBrowser from 'expo-web-browser';

// Required for Google auth
WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sessionChecked, setSessionChecked] = useState(false);
  const navigation = useNavigation();
  const { login } = useUser();

  // Google auth setup
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: 'YOUR_EXPO_CLIENT_ID', // Replace with your Expo client ID
    androidClientId: 'YOUR_ANDROID_CLIENT_ID', // Replace with your Android client ID
    iosClientId: 'YOUR_IOS_CLIENT_ID', // Replace with your iOS client ID
    webClientId: 'YOUR_WEB_CLIENT_ID', // Replace with your Web client ID
  });

  // Handle Google auth response
  useEffect(() => {
    if (response?.type === 'success') {
      setLoading(true);
      const { authentication } = response;
      handleGoogleLogin(authentication.accessToken);
    }
  }, [response]);

  // Handle Google login
  const handleGoogleLogin = async (accessToken) => {
    try {
      // Process Google login token
      const userInfo = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(res => res.json());

      const existingUser = await checkExistingUser(userInfo.email);
      
      if (existingUser) {
        // User exists, complete login
        await login({
          id: existingUser.id,
          email: userInfo.email,
          name: userInfo.name,
          avatar: userInfo.picture,
        });
        
        Logger.userAction('LoginScreen', 'Google login successful', { email: userInfo.email });
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        // User doesn't exist, go to registration with pre-filled data
        navigation.navigate('Register', { 
          email: userInfo.email,
          name: userInfo.name,
          avatar: userInfo.picture,
          authProvider: 'google'
        });
      }
    } catch (error) {
      Logger.error('LoginScreen', 'Google login error', { error: error.message });
      Alert.alert('Login Failed', 'Could not complete Google login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle email login
  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await signInWithEmail(email, password);
      if (user) {
        await login(user);
        Logger.userAction('LoginScreen', 'Email login successful', { email });
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        Alert.alert('Login Failed', 'Invalid email or password.');
      }
    } catch (error) {
      Logger.error('LoginScreen', 'Email login error', { error: error.message });
      Alert.alert('Login Failed', error.message || 'Could not sign in with email.');
    } finally {
      setLoading(false);
    }
  };

  // Handle phone login
  const handlePhoneLogin = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      // Check if user exists with this phone number
      const userExists = await checkExistingUser(phoneNumber, 'phone');
      
      if (userExists) {
        // Go to OTP verification
        navigation.navigate('OTPVerification', { 
          phoneNumber,
          isExistingUser: true
        });
      } else {
        // User doesn't exist, go to registration
        navigation.navigate('Register', { 
          phoneNumber,
          authProvider: 'phone'
        });
      }
    } catch (error) {
      Logger.error('LoginScreen', 'Phone login error', { error: error.message });
      Alert.alert('Login Failed', 'Could not verify phone number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle between email and phone login
  const toggleAuthMethod = () => {
    setAuthMethod(authMethod === 'email' ? 'phone' : 'email');
  };

  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      try {
        const session = await getUserSession();
        if (session) {
          const userDetails = await fetchUserDetails(session.userId);
          if (userDetails) {
            await login(userDetails);
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          } else {
            Alert.alert('Session Error', 'Could not fetch user details. Please log in again.');
          }
        }
      } catch (error) {
        Logger.error('LoginScreen', 'Session check error', { error: error.message });
      } finally {
        setLoading(false);
        setSessionChecked(true);
      }
    };

    checkSession();
  }, []);

  if (!sessionChecked) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking session...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>Neighborly</Text>
        <Text style={styles.tagline}>Connect with your community</Text>
      </View>

      <View style={styles.authContainer}>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, authMethod === 'email' && styles.activeTab]}
            onPress={() => setAuthMethod('email')}
          >
            <Text style={[styles.tabText, authMethod === 'email' && styles.activeTabText]}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, authMethod === 'phone' && styles.activeTab]}
            onPress={() => setAuthMethod('phone')}
          >
            <Text style={[styles.tabText, authMethod === 'phone' && styles.activeTabText]}>Phone</Text>
          </TouchableOpacity>
        </View>

        {authMethod === 'email' ? (
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
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
            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={handleEmailLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
            </View>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={handlePhoneLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity 
          style={styles.googleButton}
          onPress={() => promptAsync()}
          disabled={loading}
        >
          <Image 
            source={require('../../assets/google-icon.png')} 
            style={styles.googleIcon} 
          />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
  },
  authContainer: {
    paddingHorizontal: 30,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 8,
    backgroundColor: '#f0f2f5',
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
  },
  inputContainer: {
    marginBottom: 20,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 16,
    color: '#333',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    marginLeft: 5,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
});

export default LoginScreen;
