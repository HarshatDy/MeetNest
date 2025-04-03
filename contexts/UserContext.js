import React, { createContext, useState, useContext, useEffect } from 'react';
import { Logger } from '../utils/Logger';
// Fix the import path for authService
import authService from '../src/services/authService';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Changed from true to false

  // Modify the useEffect to not load user on mount
  useEffect(() => {
    // Skip automatic user loading on mount to avoid errors
    setIsLoading(false);
    Logger.debug('UserContext', 'UserContext initialized');
    
    // Original user loading code is removed to prevent errors
    // Instead, we'll rely on explicit login/registration
  }, []);

  // Register a new user
  const register = async (userData) => {
    try {
      console.log(`[UserContext][register] Registration attempt with email: ${userData.email}, display name: ${userData.displayName}`);
      Logger.userAction('UserContext', 'Registration attempt', { 
        email: userData.email,
        displayName: userData.displayName,
        society: userData.society || 'Not specified'
      });
      setIsLoading(true);
      
      const result = await authService.registerUser(userData);
      console.log(`[UserContext][register] Registration result:`, result);
      
      if (result.success) {
        Logger.debug('UserContext', 'Registration successful, OTP sent', { userId: result.userId });
        return {
          success: true,
          userId: result.userId,
          message: result.message
        };
      } else {
        Logger.error('UserContext', 'Registration failed', { message: result.message });
        return {
          success: false,
          message: result.message
        };
      }
    } catch (error) {
      console.error(`[UserContext][register] Registration error:`, error);
      Logger.error('UserContext', 'Registration error', error);
      return {
        success: false,
        message: 'Registration failed: ' + error.message
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Verify registration OTP
  const verifyRegistration = async (userId, otp) => {
    try {
      Logger.userAction('UserContext', 'OTP verification attempt', { userId });
      setIsLoading(true);
      
      const result = await authService.verifyRegistration(userId, otp);
      
      if (result.success) {
        // Load the new user data
        const userData = await authService.getCurrentUser();
        
        if (userData) {
          setUser({
            ...userData,
            // Don't need to add isLoggedIn property here since it's already in the userData
            // from is_logged_in column in the database
          });
          Logger.debug('UserContext', 'User verified and logged in', { userId });
        }
        
        return {
          success: true,
          message: result.message
        };
      } else {
        Logger.error('UserContext', 'OTP verification failed', { message: result.message });
        return {
          success: false,
          message: result.message
        };
      }
    } catch (error) {
      Logger.error('UserContext', 'OTP verification error', error);
      return {
        success: false,
        message: 'Verification failed: ' + error.message
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Login with email/password
  const login = async (credentials) => {
    try {
      Logger.userAction('UserContext', 'Login attempt', { email: credentials.email });
      setIsLoading(true);
      
      const result = await authService.login(credentials.email, credentials.password);
      
      // Special handling for demo login
      if (result.isDemoLogin) {
        Logger.debug('UserContext', 'Demo login requested, redirecting to registration');
        return {
          success: false,
          isDemoLogin: true,
          message: 'Demo account requires registration first',
          email: credentials.email,
          password: credentials.password
        };
      }
      
      if (result.success && result.requiresOTP) {
        Logger.debug('UserContext', 'Login requires OTP', { userId: result.userId });
        return {
          success: true,
          requiresOTP: true,
          userId: result.userId,
          message: result.message
        };
      } else if (result.success) {
        // This branch shouldn't be reached with current flow, but keeping for flexibility
        // Load user data
        const userData = await authService.getCurrentUser();
        
        if (userData) {
          setUser(userData);
          Logger.debug('UserContext', 'User logged in', { userId: userData.id });
        }
        
        return {
          success: true,
          message: result.message
        };
      } else {
        Logger.error('UserContext', 'Login failed', { message: result.message });
        return {
          success: false,
          message: result.message
        };
      }
    } catch (error) {
      Logger.error('UserContext', 'Login error', error);
      return {
        success: false,
        message: 'Login failed: ' + error.message
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Verify login OTP
  const verifyLogin = async (userId, otp) => {
    try {
      Logger.userAction('UserContext', 'Login OTP verification attempt', { userId });
      setIsLoading(true);
      
      const result = await authService.verifyLogin(userId, otp);
      
      if (result.success) {
        // Load the user data
        const userData = await authService.getCurrentUser();
        
        if (userData) {
          setUser(userData); // userData already has is_logged_in from the database
          Logger.debug('UserContext', 'User verified and logged in', { userId });
        }
        
        return {
          success: true,
          message: result.message
        };
      } else {
        Logger.error('UserContext', 'Login OTP verification failed', { message: result.message });
        return {
          success: false,
          message: result.message
        };
      }
    } catch (error) {
      Logger.error('UserContext', 'Login OTP verification error', error);
      return {
        success: false,
        message: 'Verification failed: ' + error.message
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      Logger.userAction('UserContext', 'Logout');
      setIsLoading(true);
      
      await authService.logout();
      
      setUser(null);
      Logger.debug('UserContext', 'User logged out');
      
      return true;
    } catch (error) {
      Logger.error('UserContext', 'Logout error', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      if (!user || !user.id) {
        return {
          success: false,
          message: 'Not logged in'
        };
      }
      
      Logger.userAction('UserContext', 'Profile update', profileData);
      setIsLoading(true);
      
      const result = await authService.updateProfile(user.id, profileData);
      
      if (result.success) {
        // Reload user data
        const userData = await authService.getCurrentUser();
        
        if (userData) {
          setUser({
            ...userData,
            isLoggedIn: true
          });
          Logger.debug('UserContext', 'Profile updated', { userId: user.id });
        }
        
        return {
          success: true,
          message: result.message
        };
      } else {
        Logger.error('UserContext', 'Profile update failed', { message: result.message });
        return {
          success: false,
          message: result.message
        };
      }
    } catch (error) {
      Logger.error('UserContext', 'Profile update error', error);
      return {
        success: false,
        message: 'Update failed: ' + error.message
      };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      isLoading,
      register,
      verifyRegistration,
      login,
      verifyLogin,
      logout,
      updateProfile
    }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
