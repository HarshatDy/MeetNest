import { 
  createUserAccount, 
  verifyOTP, 
  authenticateUser, 
  updateUserProfile,
  syncUserWithMongoDB,
  getCompleteUserData,
  setPreference,
  getPreference,
  updateUserLoginStatus,
  isUserLoggedIn
} from '../utils/database';

// Register a new user
export async function registerUser(userData) {
  try {
    console.log(`[authService][registerUser] Processing registration for email: ${userData.email}`);
    
    // Add debugging to check the email validity
    if (!userData.email) {
      console.error('[authService][registerUser] Email is missing or empty');
      return { success: false, message: 'Email is required for registration' };
    }
    
    if (typeof userData.email !== 'string') {
      console.error(`[authService][registerUser] Email is not a string: ${typeof userData.email}`);
      userData.email = String(userData.email);
      console.log(`[authService][registerUser] Converted email to string: ${userData.email}`);
    }
    
    // Trim the email to remove any whitespace
    userData.email = userData.email.trim();
    console.log(`[authService][registerUser] Trimmed email: "${userData.email}"`);
    
    console.log(`[authService][registerUser] User data:`, {
      email: userData.email,
      displayName: userData.displayName,
      society: userData.society || 'Not specified',
      hasPassword: !!userData.password
    });
    
    const result = await createUserAccount(userData);
    console.log(`[authService][registerUser] Registration result:`, result);
    return result;
  } catch (error) {
    console.error(`[authService][registerUser] Registration error:`, error);
    return {
      success: false,
      message: 'Registration failed: ' + error.message
    };
  }
}

// Complete registration with OTP verification
export async function verifyRegistration(userId, otp) {
  try {
    // Pass true to indicate this is a registration OTP verification
    const result = await verifyOTP(userId, otp, true);
    
    if (result.success) {
      // Store auth state
      await setPreference('isLoggedIn', 'true');
      await setPreference('currentUserId', userId);
    }
    
    return result;
  } catch (error) {
    console.error('Verification error:', error);
    return {
      success: false,
      message: 'Verification failed: ' + error.message
    };
  }
}

// Login with email and password
export async function login(email, password) {
  try {
    const result = await authenticateUser(email, password);
    
    if (result.requiresOTP) {
      // Return the user ID for OTP verification
      return {
        success: true,
        requiresOTP: true,
        userId: result.id,
        message: 'OTP sent to your email'
      };
    }
    
    // Special handling for demo login without user creation
    if (result.isDemoLogin) {
      return {
        success: false,
        isDemoLogin: true,
        message: result.message
      };
    }
    
    if (result.success === false) {
      return result;
    }
    
    // If we got here without requiresOTP, something went wrong
    return {
      success: false,
      message: 'Authentication error: Invalid response format'
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'Login failed: ' + error.message
    };
  }
}

// Verify login with OTP
export async function verifyLogin(userId, otp) {
  try {
    console.log(`[authService][verifyLogin] Verifying login OTP for user: ${userId}`);
    // Pass false to indicate this is a login OTP verification, not registration
    const result = await verifyOTP(userId, otp, false);
    
    if (result.success) {
      console.log(`[authService][verifyLogin] OTP verification successful for: ${userId}`);
      
      // Skip updating login status here since verifyOTP now handles it for login
      // Just store userId in preferences for quick lookup
      await setPreference('currentUserId', userId);
      
      // Verify the database was updated correctly
      const isLoggedIn = await isUserLoggedIn();
      console.log(`[authService][verifyLogin] Verified database login status: ${isLoggedIn}`);
      
      // Try to sync with MongoDB
      console.log(`[authService][verifyLogin] Attempting to sync with MongoDB for user: ${userId}`);
      syncUserWithMongoDB(userId).catch(error => {
        console.warn('[authService][verifyLogin] Background sync failed:', error);
      });
      
      return {
        success: true,
        message: 'Login successful'
      };
    } else {
      console.log(`[authService][verifyLogin] OTP verification failed for: ${userId} - ${result.message}`);
    }
    
    return result;
  } catch (error) {
    console.error('[authService][verifyLogin] Login verification error:', error);
    return {
      success: false,
      message: 'Login verification failed: ' + error.message
    };
  }
}

// Logout
export async function logout() {
  try {
    console.log('[authService][logout] Logging out user');
    
    // Get current user ID for database update
    const userId = await getPreference('currentUserId');
    
    // If we have a userId, update the database record
    if (userId) {
      // Update the is_logged_in status in the database
      await updateUserLoginStatus(userId, false);
      console.log(`[authService][logout] Updated user ${userId} login status in database to false`);
    }
    
    // Clear currentUserId from preferences
    console.log('[authService][logout] Clearing currentUserId');
    await setPreference('currentUserId', '');
    
    // Verify the preferences were cleared correctly
    const verifyUserId = await getPreference('currentUserId');
    console.log(`[authService][logout] Verified preferences - userId: ${verifyUserId || 'empty'}`);
    
    return {
      success: true,
      message: 'Logged out successfully'
    };
  } catch (error) {
    console.error('[authService][logout] Logout error:', error);
    return {
      success: false,
      message: 'Logout failed: ' + error.message
    };
  }
}

// Get current user data
export async function getCurrentUser() {
  try {
    console.log('[authService][getCurrentUser] Checking if user is logged in from database');
    
    // Replace preference check with database query
    const isLoggedIn = await isUserLoggedIn();
    console.log(`[authService][getCurrentUser] isLoggedIn from database: ${isLoggedIn}`);
    
    if (!isLoggedIn) {
      console.log('[authService][getCurrentUser] User is not logged in, returning null');
      return null;
    }
    
    // Get the logged in user from the database
    const { getCurrentUser: getDbCurrentUser } = require('../utils/database');
    const userData = await getDbCurrentUser();
    
    if (!userData) {
      console.log('[authService][getCurrentUser] No user found in database, returning null');
      return null;
    }
    
    console.log(`[authService][getCurrentUser] User data fetched: success`);
    return userData;
  } catch (error) {
    console.error('[authService][getCurrentUser] Error getting current user:', error);
    return null;
  }
}

// Update user profile
export async function updateProfile(userId, profileData) {
  try {
    return await updateUserProfile(userId, profileData);
  } catch (error) {
    console.error('Profile update error:', error);
    return {
      success: false,
      message: 'Profile update failed: ' + error.message
    };
  }
}

export default {
  registerUser,
  verifyRegistration,
  login,
  verifyLogin,
  logout,
  getCurrentUser,
  updateProfile
};