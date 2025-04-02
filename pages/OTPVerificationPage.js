import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import { Logger } from '../utils/Logger';
import { resendUserOTP } from '../src/utils/database';

const OTPVerificationPage = ({ navigation, route }) => {
  const { userId, email, isRegistration = true } = route.params || {};
  
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const { verifyRegistration, verifyLogin } = useUser();
  const intervalRef = useRef(null);
  
  // Start countdown timer for OTP resend
  useEffect(() => {
    startCountdown();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  const startCountdown = () => {
    setCountdown(60);
    setCanResend(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      setCountdown(prevCount => {
        if (prevCount <= 1) {
          clearInterval(intervalRef.current);
          setCanResend(true);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);
  };
  
  const handleResendOTP = async () => {
    if (!canResend || isLoading) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      // Resend OTP
      const result = await resendUserOTP(userId, email);
      
      if (result.success) {
        startCountdown();
        Alert.alert('OTP Sent', 'A new verification code has been sent to your email');
      } else {
        setError(result.message || 'Failed to resend code. Please try again.');
      }
    } catch (error) {
      Logger.error('OTPVerificationPage', 'Error resending OTP', error);
      setError('Failed to resend verification code');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerify = async () => {
    if (!otp) {
      setError('Please enter the verification code');
      return;
    }
    
    if (otp.length !== 4) {
      setError('Verification code must be 4 digits');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      // Use appropriate verification method based on context
      const verifyFn = isRegistration ? verifyRegistration : verifyLogin;
      const result = await verifyFn(userId, otp);
      
      if (result.success) {
        if (isRegistration) {
          // Registration success - show welcome
          Alert.alert(
            'Welcome to Neighborly!',
            'Your account has been created successfully.',
            [{ text: 'Continue', onPress: () => navigation.replace('Home') }]
          );
        } else {
          // Login success - go to home
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainApp' }],
          });
        }
      } else {
        setError(result.message || 'Invalid verification code');
      }
    } catch (error) {
      Logger.error('OTPVerificationPage', 'Verification error', error);
      setError('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail" size={60} color="#007AFF" />
          </View>
          
          <Text style={styles.title}>Email Verification</Text>
          
          <Text style={styles.instructions}>
            We've sent a 4-digit verification code to
          </Text>
          
          <Text style={styles.email}>{email}</Text>
          
          <View style={styles.otpContainer}>
            <TextInput
              style={styles.otpInput}
              placeholder="Enter 4-digit code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={4}
              editable={!isLoading}
            />
          </View>
          
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {isRegistration ? 'Complete Registration' : 'Verify & Log In'}
              </Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>
              Didn't receive the code? 
            </Text>
            
            {canResend ? (
              <TouchableOpacity onPress={handleResendOTP} disabled={isLoading}>
                <Text style={styles.resendLink}>Resend Code</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.countdownText}>
                Resend in {countdown}s
              </Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EFF3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  instructions: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
  },
  otpContainer: {
    width: '100%',
    marginBottom: 20,
  },
  otpInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 5,
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendText: {
    color: '#666',
    fontSize: 14,
  },
  resendLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  countdownText: {
    color: '#999',
    fontSize: 14,
    marginLeft: 5,
  },
});

export default OTPVerificationPage;
