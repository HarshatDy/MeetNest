import { 
  createUserAccount, 
  verifyOTP, 
  authenticateUser, 
  updateUserProfile,
  syncUserWithMongoDB,
  getCompleteUserData,
  setPreference,
  getPreference
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
    const result = await verifyOTP(userId, otp);
    
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
    const result = await verifyOTP(userId, otp);
    
    if (result.success) {
      console.log(`[authService][verifyLogin] OTP verification successful for: ${userId}`);
      // Store auth state
      console.log(`[authService][verifyLogin] Setting isLoggedIn to 'true'`);
      await setPreference('isLoggedIn', 'true');
      console.log(`[authService][verifyLogin] Setting currentUserId to: ${userId}`);
      await setPreference('currentUserId', userId);
      
      // Verify the preferences were set correctly
      const verifyLoginStatus = await getPreference('isLoggedIn');
      const verifyUserId = await getPreference('currentUserId');
      console.log(`[authService][verifyLogin] Verified preferences - isLoggedIn: ${verifyLoginStatus}, userId: ${verifyUserId}`);
      
      // Try to sync with MongoDB
      console.log(`[authService][verifyLogin] Attempting to sync with MongoDB for user: ${userId}`);
      syncUserWithMongoDB(userId).catch(error => {
        console.warn('[authService][verifyLogin] Background sync failed:', error);
      });
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
    console.log('[authService][logout] Setting isLoggedIn to false');
    await setPreference('isLoggedIn', 'false');
    console.log('[authService][logout] Clearing currentUserId');
    await setPreference('currentUserId', '');
    
    // Verify the preferences were cleared correctly
    const verifyLoginStatus = await getPreference('isLoggedIn');
    const verifyUserId = await getPreference('currentUserId');
    console.log(`[authService][logout] Verified preferences - isLoggedIn: ${verifyLoginStatus}, userId: ${verifyUserId || 'empty'}`);
    
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
    console.log('[authService][getCurrentUser] Checking if user is logged in');
    const isLoggedIn = await getPreference('isLoggedIn');
    console.log(`[authService][getCurrentUser] isLoggedIn from preferences: ${isLoggedIn}`);
    
    if (isLoggedIn !== 'true') {
      console.log('[authService][getCurrentUser] User is not logged in, returning null');
      return null;
    }
    
    console.log('[authService][getCurrentUser] Getting currentUserId from preferences');
    const userId = await getPreference('currentUserId');
    console.log(`[authService][getCurrentUser] currentUserId from preferences: ${userId || 'not found'}`);
    
    if (!userId) {
      console.log('[authService][getCurrentUser] No userId found, returning null');
      return null;
    }
    
    console.log(`[authService][getCurrentUser] Fetching complete user data for userId: ${userId}`);
    const userData = await getCompleteUserData(userId);
    console.log(`[authService][getCurrentUser] User data fetched: ${userData ? 'success' : 'null'}`);
    
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