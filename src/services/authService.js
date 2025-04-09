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
  isUserLoggedIn,
  getCurrentUser as getDbCurrentUser
} from '../utils/supabaseDatabase';
import { 
  saveUserData, 
  saveAuthToken, 
  clearUserData,
  getUserData
} from '../utils/secureStorage';

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
      console.log(`[authService][verifyRegistration] Registration verification successful for user: ${userId}`);
      
      // Store auth state in preferences
      await setPreference('isLoggedIn', 'true');
      await setPreference('currentUserId', userId);
      
      // Fetch complete user data after verification
      const userData = await getCompleteUserData(userId);
      
      if (userData) {
        console.log(`[authService][verifyRegistration] Storing user data in secure storage for user: ${userId}`);
        console.log(`[authService][verifyRegistration] Got complete user data for secure storage`, { 
          userId: userData.id, 
          email: userData.email, 
          fields: Object.keys(userData) 
        });
        
        // Store user data in secure storage
        const saveResult = await saveUserData(userData);
        
        if (saveResult) {
          console.log(`[authService][verifyRegistration] User data successfully saved to secure storage for: ${userId}`);
          
          // Verify data was stored by retrieving it
          const storedData = await getUserData();
          if (storedData && storedData.id === userId) {
            console.log(`[authService][verifyRegistration] Verified secure storage has the correct user data`, {
              id: storedData.id,
              fieldsStored: Object.keys(storedData)
            });
          } else {
            console.error(`[authService][verifyRegistration] Could not verify user data in secure storage`, {
              expected: userId,
              retrieved: storedData ? storedData.id : 'null'
            });
          }
        } else {
          console.error(`[authService][verifyRegistration] Failed to save user data to secure storage for: ${userId}`);
        }
        
        // Generate and store a simple auth token (in a real app, this would be a JWT from the server)
        const authToken = `auth_${userId}_${Date.now()}`;
        const tokenSaved = await saveAuthToken(authToken);
        
        if (tokenSaved) {
          console.log(`[authService][verifyRegistration] Auth token saved successfully to secure storage`);
        } else {
          console.error(`[authService][verifyRegistration] Failed to save auth token to secure storage`);
        }
        
        console.log(`[authService][verifyRegistration] User data saved securely for: ${userId}`);
      } else {
        console.warn(`[authService][verifyRegistration] Could not fetch complete user data for secure storage: ${userId}`);
        console.error(`[authService][verifyRegistration] Failed to get user data for secure storage: ${userId}`);
      }
    } else {
      console.error(`[authService][verifyRegistration] Registration verification failed for user: ${userId}`, { 
        reason: result.message 
      });
    }
    
    return result;
  } catch (error) {
    console.error('Verification error:', error);
    console.error(`[authService][verifyRegistration] Registration verification exception`, { error: error.message });
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
      console.log(`[authService][verifyLogin] Login verification successful for user: ${userId}`);
      
      // Skip updating login status here since verifyOTP now handles it for login
      // Just store userId in preferences for quick lookup
      await setPreference('currentUserId', userId);
      
      // Verify the database was updated correctly
      const isLoggedIn = await isUserLoggedIn();
      console.log(`[authService][verifyLogin] Verified database login status: ${isLoggedIn}`);
      
      // Fetch complete user data after login
      const userData = await getCompleteUserData(userId);
      
      if (userData) {
        console.log(`[authService][verifyLogin] Storing user data in secure storage for user: ${userId}`);
        console.log(`[authService][verifyLogin] Got complete user data for secure login storage`, {
          userId: userData.id,
          email: userData.email,
          dataSize: JSON.stringify(userData).length,
          fields: Object.keys(userData)
        });
        
        // Store user data in secure storage
        const saveResult = await saveUserData(userData);
        
        if (saveResult) {
          console.log(`[authService][verifyLogin] User login data successfully saved to secure storage for: ${userId}`);
          
          // Verify data was stored by retrieving it
          const storedData = await getUserData();
          if (storedData && storedData.id === userId) {
            console.log(`[authService][verifyLogin] Verified secure storage has the correct login data`, {
              id: storedData.id,
              email: storedData.email,
              role: storedData.role
            });
          } else {
            console.error(`[authService][verifyLogin] Could not verify login data in secure storage`, {
              expected: userId,
              retrieved: storedData ? storedData.id : 'null'
            });
          }
        } else {
          console.error(`[authService][verifyLogin] Failed to save login data to secure storage for: ${userId}`);
        }
        
        // Generate and store a simple auth token
        const authToken = `auth_${userId}_${Date.now()}`;
        const tokenSaved = await saveAuthToken(authToken);
        
        if (tokenSaved) {
          console.log(`[authService][verifyLogin] Login auth token saved successfully to secure storage`);
        } else {
          console.error(`[authService][verifyLogin] Failed to save login auth token to secure storage`);
        }
        
        console.log(`[authService][verifyLogin] User data saved securely for: ${userId}`);
      } else {
        console.warn(`[authService][verifyLogin] Could not fetch complete user data for secure storage: ${userId}`);
        console.error(`[authService][verifyLogin] Failed to get user data for secure login storage: ${userId}`);
      }
      
      // Try to sync with MongoDB
      console.log(`[authService][verifyLogin] Attempting to sync with MongoDB for user: ${userId}`);
      syncUserWithMongoDB(userId).catch(error => {
        console.warn('[authService][verifyLogin] Background sync failed:', error);
        console.error(`[authService][verifyLogin] MongoDB sync failed during login`, { 
          userId, 
          error: error.message 
        });
      });
      
      return {
        success: true,
        message: 'Login successful'
      };
    } else {
      console.log(`[authService][verifyLogin] OTP verification failed for: ${userId} - ${result.message}`);
      console.error(`[authService][verifyLogin] Login verification failed for user: ${userId}`, { 
        reason: result.message 
      });
    }
    
    return result;
  } catch (error) {
    console.error('[authService][verifyLogin] Login verification error:', error);
    console.error(`[authService][verifyLogin] Login verification exception`, { error: error.message });
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
      console.log(`[authService][logout] Updated logout status in database for user: ${userId}`);
    }
    
    // Get stored data before clearing (for logging purposes)
    const storedData = await getUserData();
    const hasStoredData = !!storedData;
    
    // Clear secure storage user data
    const clearResult = await clearUserData();
    console.log('[authService][logout] Cleared secure storage user data');
    
    if (clearResult) {
      console.log(`[authService][logout] Successfully cleared secure storage during logout`, {
        hadStoredData: hasStoredData,
        userId: storedData ? storedData.id : 'unknown'
      });
    } else {
      console.error(`[authService][logout] Failed to clear secure storage during logout`);
    }
    
    // Clear currentUserId from preferences
    console.log('[authService][logout] Clearing currentUserId');
    await setPreference('currentUserId', '');
    
    // Verify the preferences were cleared correctly
    const verifyUserId = await getPreference('currentUserId');
    console.log(`[authService][logout] Verified preferences - userId: ${verifyUserId || 'empty'}`);
    console.log(`[authService][logout] Completed logout process`, {
      preferencesCleared: !verifyUserId
    });
    
    return {
      success: true,
      message: 'Logged out successfully'
    };
  } catch (error) {
    console.error('[authService][logout] Logout error:', error);
    console.error(`[authService][logout] Logout exception`, { error: error.message });
    return {
      success: false,
      message: 'Logout failed: ' + error.message
    };
  }
}

// Get current user data
export async function getCurrentUser() {
  try {
    console.log('[authService][getCurrentUser] Checking for user data in secure storage');
    
    // First try to get user data from secure storage
    const secureStorageUser = await getUserData();
    
    if (secureStorageUser) {
      console.log(`[authService][getCurrentUser] Found user in secure storage: ${secureStorageUser.id}`);
      
      // Check if the user is logged in from the database as well (belt and suspenders approach)
      const isLoggedIn = await isUserLoggedIn();
      console.log(`[authService][getCurrentUser] Database login status: ${isLoggedIn}`);
      
      if (isLoggedIn) {
        // Get the most up-to-date user data from Supabase
        console.log(`[authService][getCurrentUser] Fetching latest user data from Supabase for ID: ${secureStorageUser.id}`);
        const userData = await getDbCurrentUser();
        
        if (userData) {
          console.log(`[authService][getCurrentUser] Successfully fetched updated user data from Supabase`);
          
          // Try to get data from MongoDB as well (if available)
          try {
            console.log(`[authService][getCurrentUser] Attempting to sync with MongoDB`);
            const mongoSyncResult = await syncUserWithMongoDB(userData.id);
            console.log(`[authService][getCurrentUser] MongoDB sync result:`, mongoSyncResult);
          } catch (mongoError) {
            console.warn(`[authService][getCurrentUser] Could not sync with MongoDB:`, mongoError);
            // Continue with Supabase data even if MongoDB sync fails
          }
          
          return userData;
        } else {
          console.log(`[authService][getCurrentUser] No user found in Supabase, falling back to secure storage data`);
          // Fallback to secure storage data if database query fails
          return secureStorageUser;
        }
      } else {
        console.log(`[authService][getCurrentUser] User found in secure storage but not logged in according to database`);
        // User has data in secure storage but is not logged in according to the database
        // This could be a logout sync issue - we'll return the secure storage data for recovery
        return secureStorageUser;
      }
    }
    
    console.log('[authService][getCurrentUser] No user found in secure storage, checking database');
    
    // If no data in secure storage, try the traditional database approach
    const isLoggedIn = await isUserLoggedIn();
    console.log(`[authService][getCurrentUser] Database login status: ${isLoggedIn}`);
    
    if (!isLoggedIn) {
      console.log('[authService][getCurrentUser] User is not logged in, returning null');
      return null;
    }
    
    // Get the logged in user from the database using Supabase implementation
    const userData = await getDbCurrentUser();
    
    if (!userData) {
      console.log('[authService][getCurrentUser] No user found in database, returning null');
      return null;
    }
    
    console.log(`[authService][getCurrentUser] User data fetched from database: success`);
    
    // Store this data in secure storage for next time
    try {
      console.log(`[authService][getCurrentUser] Storing fetched user data in secure storage as recovery point`);
      await saveUserData(userData);
    } catch (storageError) {
      console.warn(`[authService][getCurrentUser] Failed to store user data in secure storage:`, storageError);
      // Continue even if storage fails
    }
    
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