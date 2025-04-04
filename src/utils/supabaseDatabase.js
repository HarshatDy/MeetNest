import { createClient } from '@supabase/supabase-js';
import { sendOTPEmail } from '../../utils/emailService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration - replace with your actual values
// In production, use environment variables
const SUPABASE_URL = 'https://zecfuirebwdiitxxhmod.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplY2Z1aXJlYndkaWl0eHhobW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NzMxNzIsImV4cCI6MjA1OTM0OTE3Mn0.tFTaJeh5IPno3Roo8vvZMaCESbESo_oou9HPEA7YII4';

// Initialize Supabase client with AsyncStorage for React Native
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Debug flags
const DEBUG_SQL_ENABLED = true;
const DEBUG_GENERAL_ENABLED = true;

// Generate a random 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Helper function to log table contents
const logTableContents = async (tableName) => {
  try {
    if (DEBUG_GENERAL_ENABLED) {
      console.log(`[DEBUG] Logging contents of table: ${tableName}`);
    }
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(100);
      
    if (error) {
      if (DEBUG_GENERAL_ENABLED) {
        console.error(`[DEBUG] Error reading ${tableName} table:`, error);
      }
      return [];
    }
    
    if (DEBUG_GENERAL_ENABLED) {
      console.log(`[DEBUG] ${tableName} contents:`, data);
      console.log(`[DEBUG] ${tableName} row count: ${data.length}`);
    }
    
    return data;
  } catch (error) {
    if (DEBUG_GENERAL_ENABLED) {
      console.error(`[DEBUG] Error reading ${tableName} table:`, error);
    }
    return [];
  }
};

// Required tables based on our SQLite schema
const REQUIRED_TABLES = ['users', 'preferences', 'posts_cache', 'draft_posts', 'otp_verification'];

// Initialize database connection
export const initDatabase = async () => {
  try {
    console.log('Initializing Supabase client');
    
    // Check if required tables exist
    try {
      // Test if we can access the tables - just try to get count from each required table
      await Promise.all(REQUIRED_TABLES.map(async (tableName) => {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .limit(1);
          
        if (error) {
          throw new Error(`Table '${tableName}' might not exist: ${error.message}`);
        }
        
        console.log(`Table '${tableName}' exists with ${count || 0} records`);
      }));
      
      console.log('All required tables exist in Supabase');
    } catch (tableError) {
      console.error('Schema validation error:', tableError.message);
      console.error('Please run the initSupabaseSchema.sql script in your Supabase SQL Editor');
      
      // We don't throw here, just display the warning and continue
      // This allows the app to run even if some tables are missing
    }
    
    console.log('Supabase connection established successfully');
    return supabase;
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    return null;
  }
};

// Set a preference
export const setPreference = async (key, value) => {
  try {
    if (!key) {
      console.error('Error: No key provided for preference');
      return { error: 'No key provided' };
    }
    
    // Check if preference exists
    const { data: existingData, error: existingError } = await supabase
      .from('preferences')
      .select()
      .eq('key', key)
      .single();
      
    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is not found error
      console.error('Error checking for existing preference:', existingError);
      return { error: existingError };
    }
    
    // Insert or update the preference
    const jsonValue = JSON.stringify(value);
    
    if (existingData) {
      // Update existing preference
      const { error } = await supabase
        .from('preferences')
        .update({ value: jsonValue })
        .eq('key', key);
        
      if (error) {
        console.error('Error updating preference:', error);
        return { error };
      }
    } else {
      // Insert new preference
      const { error } = await supabase
        .from('preferences')
        .insert({ key, value: jsonValue });
        
      if (error) {
        console.error('Error inserting preference:', error);
        return { error };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error setting preference:', error);
    return { error };
  }
};

// Get a preference
export const getPreference = async (key) => {
  try {
    if (!key) {
      console.error('Error: No key provided for preference');
      return null;
    }
    
    const { data, error } = await supabase
      .from('preferences')
      .select('value')
      .eq('key', key)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      console.error('Error getting preference:', error);
      return null;
    }
    
    try {
      return JSON.parse(data.value);
    } catch (e) {
      console.error('Error parsing preference:', e);
      return null;
    }
  } catch (error) {
    console.error('Error getting preference:', error);
    return null;
  }
};

// Store OTP for verification
export const storeOTP = async (email, user_Id) => {
  try {
    const otp = generateOTP();
    const now = Date.now();
    
    console.log(`[database][storeOTP] Storing OTP for email: ${email}, userId: ${user_Id}`);
    
    if (!email) {
      console.error('[database][storeOTP] Error: Email is null or undefined');
      throw new Error('Email is required to store OTP');
    }
    
    if (typeof email !== 'string') {
      console.error(`[database][storeOTP] Email is not a string: ${typeof email}`);
      email = String(email);
      console.log(`[database][storeOTP] Converted email to string: ${email}`);
    }
    
    // Trim email to remove whitespace
    email = email.trim();
    
    // First delete any existing OTP for this email
    const { error: deleteError } = await supabase
      .from('otp_verification')
      .delete()
      .eq('email', email);
      
    if (deleteError) {
      console.error('[database][storeOTP] Error deleting existing OTP:', deleteError);
    }
    
    // Insert new OTP
    const { error: insertError } = await supabase
      .from('otp_verification')
      .insert({
        email,
        userid: user_Id,  // Changed from userId to userid (lowercase)
        otp,
        created_at: now,
        attempts: 0,
        verified: false
      });
      
    if (insertError) {
      console.error('[database][storeOTP] Error inserting OTP:', insertError);
      throw insertError;
    }
    
    // Send OTP via email
    await sendOTPEmail(email, otp);
    
    // For demo, log OTP to console in development
    if (__DEV__) {
      console.log(`[DEV MODE] Stored OTP for ${email}: ${otp}`);
    }
    
    return { success: true, otp };
  } catch (error) {
    console.error('Error in storeOTP:', error);
    throw error;
  }
};

// Verify OTP
export const verifyUserOTP = async (userId, providedOTP) => {
  try {
    // Debug: log table contents
    await logTableContents('otp_verification');
    
    // Get the stored OTP for this user
    const { data, error } = await supabase
      .from('otp_verification')
      .select()
      .eq('userid', userId)  // Changed from userId to userid (lowercase)
      .single();
      
    if (error) {
      console.error('Error getting OTP:', error);
      return { success: false, message: 'No OTP found for this user' };
    }
    
    const storedOTP = data.otp;
    const createdAt = data.created_at;
    const attempts = data.attempts + 1;
    const now = Date.now();
    const expirationTime = 15 * 60 * 1000; // 15 minutes in milliseconds
    
    // Update attempts count
    await supabase
      .from('otp_verification')
      .update({ attempts })
      .eq('userid', userId);  // Changed from userId to userid (lowercase)
      
    // Check if OTP has expired
    if (now - createdAt > expirationTime) {
      return { success: false, message: 'OTP has expired, please request a new one' };
    }
    
    // Check if too many attempts
    if (attempts > 5) {
      return { success: false, message: 'Too many attempts, please request a new OTP' };
    }
    
    // Check if OTP matches
    if (storedOTP === providedOTP) {
      // Mark as verified
      await supabase
        .from('otp_verification')
        .update({ verified: true })
        .eq('userid', userId);  // Changed from userId to userid (lowercase)
        
      return { success: true, message: 'OTP verified successfully' };
    } else {
      return { 
        success: false, 
        message: `Invalid OTP. ${5 - attempts} attempts remaining`
      };
    }
  } catch (error) {
    console.error('Error in verifyUserOTP:', error);
    throw error;
  }
};

// Resend OTP for a user
export const resendUserOTP = async (userId, email) => {
  try {
    // Check for existing OTP and cooldown period
    const { data, error } = await supabase
      .from('otp_verification')
      .select()
      .eq('userid', userId)  // Changed from userId to userid (lowercase)
      .single();
      
    if (!error && data) {
      const createdAt = data.created_at;
      const now = Date.now();
      const cooldownPeriod = 1 * 60 * 1000; // 1 minute cooldown
      
      if (now - createdAt < cooldownPeriod) {
        return { 
          success: false, 
          message: 'Please wait before requesting another OTP'
        };
      }
    }
    
    // Generate and store new OTP
    const result = await storeOTP(email, userId);
    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Error in resendUserOTP:', error);
    throw error;
  }
};

// Resend OTP (public wrapper)
export const resendOTP = async (userId, email) => {
  try {
    return await resendUserOTP(userId, email);
  } catch (error) {
    console.error('Error resending OTP:', error);
    return {
      success: false,
      message: 'Failed to resend verification code'
    };
  }
};

// Clean up verified OTP records
export const cleanupVerifiedOTP = async (email) => {
  try {
    const { error } = await supabase
      .from('otp_verification')
      .delete()
      .eq('email', email)
      .eq('verified', true);
      
    if (error) {
      console.error('Error cleaning up OTP:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in cleanupVerifiedOTP:', error);
    return false;
  }
};

// Insert a new user
export const insertUser = async (userData) => {
  try {
    // Debug: log users table
    await logTableContents('users');
    
    const now = Date.now();
    const userId = userData.id || 'user_' + Math.random().toString(36).substring(2, 9);
    
    const { error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: userData.email,
        display_name: userData.displayName || userData.display_name || '',
        password: userData.password,  // Note: In production, store hashed passwords
        society: userData.society || '',
        is_logged_in: userData.isLoggedIn || userData.is_logged_in || false,
        created_at: now,
        updated_at: now
      });
      
    if (error) {
      console.error('Error inserting user:', error);
      throw error;
    }
    
    return { success: true, id: userId };
  } catch (error) {
    console.error('Error in insertUser:', error);
    throw error;
  }
};

// Get a user by ID
export const getUserById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
    
    // Don't send password back to client
    if (data) {
      const { password, ...user } = data;
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('Error in getUserById:', error);
    return null;
  }
};

// Get a user by email
export const getUserByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('email', email)
      .single();
      
    if (error) {
      // Check specifically for "not found" error code
      if (error.code === 'PGRST116') {
        // This is actually expected when no user exists with this email
        return null;
      }
      console.error('Error getting user by email:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    return null;
  }
};

// Update a user
export const updateUser = async (userId, userData) => {
  try {
    const now = Date.now();
    
    const { error } = await supabase
      .from('users')
      .update({
        display_name: userData.displayName || userData.display_name,
        society: userData.society,
        updated_at: now
      })
      .eq('id', userId);
      
    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw error;
  }
};

// Delete a user
export const deleteUser = async (userId) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
      
    if (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in deleteUser:', error);
    throw error;
  }
};

// Update user password
export const updateUserPassword = async (userId, newPassword) => {
  try {
    const now = Date.now();
    
    const { error } = await supabase
      .from('users')
      .update({
        password: newPassword, // Note: In production, store hashed passwords
        updated_at: now
      })
      .eq('id', userId);
      
    if (error) {
      console.error('Error updating password:', error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in updateUserPassword:', error);
    throw error;
  }
};

// Cache posts
export const cachePosts = async (posts) => {
  try {
    const now = Date.now();
    
    // Prepare batch insert data
    const postsToInsert = posts.map(post => ({
      id: post.id,
      data: JSON.stringify(post),
      timestamp: now
    }));
    
    // Use upsert (insert with on conflict do update)
    const { error } = await supabase
      .from('posts_cache')
      .upsert(postsToInsert, {
        onConflict: 'id'
      });
      
    if (error) {
      console.error('Error caching posts:', error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in cachePosts:', error);
    throw error;
  }
};

// Get cached posts
export const getCachedPosts = async () => {
  try {
    const { data, error } = await supabase
      .from('posts_cache')
      .select()
      .order('timestamp', { ascending: false })
      .limit(50);
      
    if (error) {
      console.error('Error getting cached posts:', error);
      return [];
    }
    
    // Parse JSON data
    const posts = data.map(item => {
      try {
        return JSON.parse(item.data);
      } catch (e) {
        console.error('Error parsing cached post:', e);
        return null;
      }
    }).filter(Boolean); // Remove any null entries
    
    return posts;
  } catch (error) {
    console.error('Error in getCachedPosts:', error);
    return [];
  }
};

// Save draft post
export const saveDraftPost = async (post) => {
  try {
    const now = Date.now();
    const id = post.id || `draft_${now}`;
    
    const { error } = await supabase
      .from('draft_posts')
      .upsert({
        id,
        data: JSON.stringify(post),
        timestamp: now
      }, {
        onConflict: 'id'
      });
      
    if (error) {
      console.error('Error saving draft post:', error);
      throw error;
    }
    
    return { ...post, id };
  } catch (error) {
    console.error('Error in saveDraftPost:', error);
    throw error;
  }
};

// Get all draft posts
export const getDraftPosts = async () => {
  try {
    const { data, error } = await supabase
      .from('draft_posts')
      .select()
      .order('timestamp', { ascending: false });
      
    if (error) {
      console.error('Error getting draft posts:', error);
      return [];
    }
    
    // Parse JSON data
    const posts = data.map(item => {
      try {
        return JSON.parse(item.data);
      } catch (e) {
        console.error('Error parsing draft post:', e);
        return null;
      }
    }).filter(Boolean); // Remove any null entries
    
    return posts;
  } catch (error) {
    console.error('Error in getDraftPosts:', error);
    return [];
  }
};

// Delete draft post
export const deleteDraftPost = async (id) => {
  try {
    const { error } = await supabase
      .from('draft_posts')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting draft post:', error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in deleteDraftPost:', error);
    throw error;
  }
};

// Create user account - combines OTP and user creation
export const createUserAccount = async (userData) => {
  try {
    // Debug: log tables before creating account
    console.log('[DEBUG] Database tables before account creation:');
    await logTableContents('users');
    await logTableContents('otp_verification');
    
    // Generate a temporary userId
    const userId = 'temp_' + Math.random().toString(36).substring(2, 9);
    console.log(`[database][createUserAccount] Creating account for ${userData.email} with temp ID: ${userId}`);
    
    if (!userData.email) {
      console.error('[database][createUserAccount] Error: Email is null or undefined');
      return {
        success: false,
        message: 'Email is required to create an account'
      };
    }
    
    if (typeof userData.email !== 'string') {
      console.error(`[database][createUserAccount] Email is not a string: ${typeof userData.email}`);
      userData.email = String(userData.email);
      console.log(`[database][createUserAccount] Converted email to string: ${userData.email}`);
    }
    
    // Trim email to remove any whitespace
    userData.email = userData.email.trim();
    console.log(`[database][createUserAccount] Trimmed email: "${userData.email}"`);
    
    // First check if user already exists with this email
    const existingUser = await getUserByEmail(userData.email);
    if (existingUser) {
      console.error(`[database][createUserAccount] User already exists with email: ${userData.email}`);
      return {
        success: false,
        message: 'A user with this email already exists'
      };
    }
    
    // Store pending user data
    console.log(`[database][createUserAccount] Storing pending user data`);
    const pendingUserData = {
      email: userData.email,
      displayName: userData.displayName || '',
      password: userData.password,
      society: userData.society || '',
      createdAt: Date.now()
    };
    
    await setPreference(`pending_user_${userId}`, pendingUserData);
    console.log(`[database][createUserAccount] Stored pending user data for: ${userId}`);
    
    // Store the OTP for this email
    console.log(`[database][createUserAccount] Generating and storing OTP`);
    try {
      const otpResult = await storeOTP(userData.email, userId);
      console.log(`[database][createUserAccount] OTP stored:`, otpResult.success);
    } catch (error) {
      console.error(`[database][createUserAccount] Error storing OTP:`, error);
      return {
        success: false,
        message: 'Failed to generate verification code: ' + error.message
      };
    }
    
    return {
      success: true,
      userId: userId,
      message: 'OTP sent to your email'
    };
  } catch (error) {
    console.error(`[database][createUserAccount] Error:`, error);
    return {
      success: false,
      message: 'Failed to create account'
    };
  }
};

// Verify OTP and finalize user account
export const verifyOTP = async (userId, otp, isRegistration = true) => {
  try {
    // Debug: log tables before verification
    console.log('[DEBUG] Database tables before OTP verification:');
    await logTableContents('otp_verification');
    await logTableContents('users');
    
    const result = await verifyUserOTP(userId, otp);
    
    if (result.success) {
      // If this is a registration process (not a login)
      if (isRegistration) {
        // Get pending user data for new registration
        const pendingUserData = await getPreference(`pending_user_${userId}`);
        
        if (!pendingUserData) {
          return {
            success: false,
            message: 'User registration data not found'
          };
        }
        
        const userData = pendingUserData; // Already parsed by getPreference
        console.log(`[database][verifyOTP] Retrieved pending user data for: ${userId}`, userData);
        
        // Check if user with this email already exists before trying to insert
        const existingUser = await getUserByEmail(userData.email);
        if (existingUser) {
          console.log(`[database][verifyOTP] User with email ${userData.email} already exists, skipping insertion`);
          // Set the existing user as logged in instead of creating a new one
          await updateUserLoginStatus(existingUser.id, true);
          
          // Return success but with a note about existing account
          return {
            success: true,
            message: 'Logged in to existing account',
            userId: existingUser.id,
            isExistingUser: true
          };
        }
        
        // Insert into Supabase database after OTP verification
        try {
          const localResult = await insertUser({
            id: userId,
            email: userData.email,
            display_name: userData.displayName,
            password: userData.password,
            society: userData.society,
            is_logged_in: true  // Set user as logged in
          });
          console.log(`[database][verifyOTP] User inserted into database: ${userId}`);
          
          // Insert into MongoDB via API
          try {
            const { createUser } = require('../services/mongoService');
            const mongoResult = await createUser({
              _id: userId,
              email: userData.email,
              displayName: userData.displayName,
              societies: userData.society ? [userData.society] : [],
              points: 0,
              achievements: []
            });
            console.log(`[database][verifyOTP] User created in MongoDB: ${userId}`);
            
            // Clean up pending user data
            await setPreference(`pending_user_${userId}`, null);
            
            return {
              success: true,
              message: 'Account verified and created successfully',
              userId: userId
            };
          } catch (mongoError) {
            console.error('Error creating MongoDB user:', mongoError);
            // Proceed even if MongoDB creation fails - will sync later
            
            return {
              success: true,
              message: 'Account created with limited functionality. Some features may be unavailable until you reconnect.',
              userId: userId
            };
          }
        } catch (dbError) {
          console.error('Error creating local user:', dbError);
          // Check specifically for duplicate email error
          if (dbError.message && dbError.message.includes('duplicate key value')) {
            // Try to get the existing user and log them in
            const existingUser = await getUserByEmail(userData.email);
            if (existingUser) {
              await updateUserLoginStatus(existingUser.id, true);
              return {
                success: true,
                message: 'Logged in to existing account',
                userId: existingUser.id,
                isExistingUser: true
              };
            }
          }
          
          return {
            success: false,
            message: 'Failed to create account after verification: ' + dbError.message
          };
        }
      } else {
        // This is a login verification, not registration
        console.log(`[database][verifyOTP] Login verification for existing user: ${userId}`);
        try {
          await updateUserLoginStatus(userId, true);
          
          return {
            success: true,
            message: 'Login successful',
            userId: userId
          };
        } catch (loginError) {
          console.error('Error updating login status:', loginError);
          // Continue anyway since authentication was successful
          return {
            success: true,
            message: 'Login successful, but login status update failed',
            userId: userId
          };
        }
      }
    } else {
      return {
        success: false,
        message: result.message
      };
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      message: 'Failed to verify OTP: ' + error.message
    };
  }
};

// Enhanced login function with OTP authentication
export const authenticateUser = async (email, password) => {
  try {
    // Debug: log users table before authentication
    await logTableContents('users');
    
    // Ensure email is trimmed
    if (email && typeof email === 'string') {
      email = email.trim();
      console.log(`[database][authenticateUser] Trimmed email: "${email}"`);
    }
    
    // Find user by email
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);
      
    if (error) {
      console.error('Error querying user:', error);
      throw error;
    }
    
    if (users && users.length > 0) {
      const user = users[0];
      
      // In production, use bcrypt.compare or similar
      if (user.password === password) {
        try {
          // Check if we need to sync with MongoDB
          let shouldSyncWithMongo = false;
          const lastSyncTime = await getPreference(`last_mongo_sync_${user.id}`);
          
          if (!lastSyncTime || (Date.now() - parseInt(lastSyncTime)) > 86400000) { // 24 hours
            shouldSyncWithMongo = true;
          }
          
          // Generate OTP for 2FA
          await storeOTP(email, user.id);
          
          return {
            id: user.id,
            email: user.email,
            requiresOTP: true,
            shouldSyncWithMongo,
            message: 'OTP sent for verification'
          };
        } catch (error) {
          console.error('Error in post-authentication:', error);
          throw error;
        }
      } else {
        return { success: false, message: 'Invalid credentials' };
      }
    } else {
      // For demo purposes, handle special demo login
      if (email === 'demo@example.com' && password === 'password') {
        console.log('[database][authenticateUser] Demo login requested, but no user creation');
        
        return {
          success: false,
          isDemoLogin: true,
          message: 'Demo account not found. Please register first.'
        };
      } else {
        return { success: false, message: 'User not found' };
      }
    }
  } catch (error) {
    console.error('Error in authenticateUser:', error);
    return { success: false, message: 'Authentication error' };
  }
};

// Login a user after OTP verification
export const loginUserAfterOTP = async (userId) => {
  try {
    // First, ensure all other users are logged out
    await logoutAllUsers();
    
    // Then set this user as logged in
    const { error } = await supabase
      .from('users')
      .update({ 
        is_logged_in: true,
        updated_at: Date.now()
      })
      .eq('id', userId);
      
    if (error) {
      console.error('Error logging in user:', error);
      throw error;
    }
    
    // Store the current user ID in preferences for easy lookup
    try {
      await setPreference('currentUserId', userId);
      return { success: true, message: 'User logged in successfully' };
    } catch (prefError) {
      console.error('Error storing user ID preference:', prefError);
      // Still return success since database was updated
      return { success: true, message: 'User logged in but preference not stored' };
    }
  } catch (error) {
    console.error('Error in loginUserAfterOTP:', error);
    return { success: false, message: 'Login error: ' + error.message };
  }
};

// Logout all users
export const logoutAllUsers = async () => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        is_logged_in: false,
        updated_at: Date.now()
      })
      .eq('is_logged_in', true);
      
    if (error) {
      console.error('Error logging out all users:', error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in logoutAllUsers:', error);
    return { success: false, message: 'Logout error: ' + error.message };
  }
};

// Logout current user
export const logoutCurrentUser = async () => {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return { success: false, message: 'No user is currently logged in' };
    }
    
    const { error } = await supabase
      .from('users')
      .update({ 
        is_logged_in: false,
        updated_at: Date.now()
      })
      .eq('id', currentUser.id);
      
    if (error) {
      console.error('Error logging out user:', error);
      throw error;
    }
    
    return { success: true, message: 'User logged out successfully' };
  } catch (error) {
    console.error('Error in logoutCurrentUser:', error);
    return { success: false, message: 'Logout error: ' + error.message };
  }
};

// Get the currently logged in user
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_logged_in', true)
      .limit(1)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      console.error('Error getting logged in user:', error);
      throw error;
    }
    
    // Don't send password back to client
    if (data) {
      const { password, ...user } = data;
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
};

// Check if any user is logged in
export const isUserLoggedIn = async () => {
  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_logged_in', true);
      
    if (error) {
      console.error('Error checking if user is logged in:', error);
      throw error;
    }
    
    return count > 0;
  } catch (error) {
    console.error('Error in isUserLoggedIn:', error);
    return false;
  }
};

// Update user profile in both Supabase and MongoDB
export const updateUserProfile = async (userId, profileData) => {
  try {
    // Update local database
    const localResult = await updateUser(userId, {
      displayName: profileData.displayName,
      society: profileData.society
    });
    
    // Try to update MongoDB
    try {
      const { updateUser: updateMongoUser } = require('../services/mongoService');
      await updateMongoUser(userId, {
        displayName: profileData.displayName,
        society: profileData.society ? [profileData.society] : []
      });
      
      // Update sync timestamp
      await setPreference(`last_mongo_sync_${userId}`, Date.now().toString());
      
      return {
        success: true,
        message: 'Profile updated successfully'
      };
    } catch (mongoError) {
      console.error('Error updating MongoDB profile:', mongoError);
      // Queue for later sync
      const pendingUpdates = await getPreference('pending_mongo_updates') || {};
      pendingUpdates[userId] = {
        ...profileData,
        timestamp: Date.now()
      };
      await setPreference('pending_mongo_updates', pendingUpdates);
      
      return {
        success: true,
        message: 'Profile updated with limited sync. Changes will be synchronized when connection is restored.'
      };
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    return {
      success: false,
      message: 'Failed to update profile'
    };
  }
};

// Sync local and remote user data
export const syncUserWithMongoDB = async (userId) => {
  try {
    // Get local user data
    const localUser = await getUserById(userId);
    
    if (!localUser) {
      return {
        success: false,
        message: 'Local user not found'
      };
    }
    
    // Try to get MongoDB user data
    try {
      const { getUser, updateUser: updateMongoUser } = require('../services/mongoService');
      const mongoUser = await getUser(userId);
      
      if (mongoUser) {
        // MongoDB user exists, sync both ways
        
        // Update MongoDB with local data that might be newer
        await updateMongoUser(userId, {
          displayName: localUser.display_name,
          email: localUser.email,
          society: localUser.society ? [localUser.society] : []
        });
        
        // Update local with MongoDB data (like points, achievements)
        await setPreference(`user_points_${userId}`, mongoUser.points?.toString() || '0');
        await setPreference(`user_achievements_${userId}`, mongoUser.achievements || []);
        
      } else {
        // MongoDB user doesn't exist, create it
        const { createUser } = require('../services/mongoService');
        await createUser({
          _id: userId,
          email: localUser.email,
          displayName: localUser.display_name,
          societies: localUser.society ? [localUser.society] : [],
          points: 0,
          achievements: []
        });
      }
      
      // Update sync timestamp
      await setPreference(`last_mongo_sync_${userId}`, Date.now().toString());
      
      return {
        success: true,
        message: 'User data synchronized successfully'
      };
    } catch (mongoError) {
      console.error('Error syncing with MongoDB:', mongoError);
      return {
        success: false,
        message: 'Failed to synchronize with cloud database'
      };
    }
  } catch (error) {
    console.error('Error in syncUserWithMongoDB:', error);
    return {
      success: false,
      message: 'Synchronization error'
    };
  }
};

// Get complete user data from both local and MongoDB
export const getCompleteUserData = async (userId) => {
  try {
    // Get basic user from Supabase
    const localUser = await getUserById(userId);
    
    if (!localUser) {
      return null;
    }
    
    // Try to get MongoDB data
    try {
      const { getUser } = require('../services/mongoService');
      const mongoUser = await getUser(userId);
      
      if (mongoUser) {
        // Combine data from both sources
        return {
          ...localUser,
          points: mongoUser.points || 0,
          achievements: mongoUser.achievements || [],
          societies: mongoUser.societies || [],
          isFullySynced: true
        };
      }
    } catch (mongoError) {
      console.error('Error getting MongoDB user data:', mongoError);
      // Continue with local data only
    }
    
    // Return local data with cached MongoDB data if available
    const points = await getPreference(`user_points_${userId}`);
    const achievements = await getPreference(`user_achievements_${userId}`);
    
    return {
      ...localUser,
      points: points ? parseInt(points) : 0,
      achievements: achievements || [],
      societies: localUser.society ? [localUser.society] : [],
      isFullySynced: false
    };
  } catch (error) {
    console.error('Error getting complete user data:', error);
    return null;
  }
};

// Get data from database (generic function)
export const getDataFromDatabase = async (table, condition = null, limit = 100) => {
  try {
    let query = supabase
      .from(table)
      .select('*')
      .limit(limit);
      
    if (condition) {
      query = query.eq(condition.field, condition.value);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error getting data from ${table}:`, error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error(`Error in getDataFromDatabase for ${table}:`, error);
    return [];
  }
};

// Execute a custom RPC call for more complex operations
export const executeQuery = async (functionName, params = {}) => {
  try {
    if (DEBUG_SQL_ENABLED) {
      console.log(`[SQL] Executing RPC: ${functionName}`);
      console.log(`[SQL] Parameters:`, params);
    }
    
    const { data, error } = await supabase.rpc(functionName, params);
    
    if (error) {
      if (DEBUG_SQL_ENABLED) {
        console.error(`[SQL] Error executing RPC: ${functionName}`, error);
      }
      throw error;
    }
    
    if (DEBUG_SQL_ENABLED) {
      console.log(`[SQL] RPC executed successfully: ${functionName}`);
    }
    
    return data;
  } catch (error) {
    if (DEBUG_SQL_ENABLED) {
      console.error(`[SQL] Error executing RPC: ${functionName}`, error);
    }
    throw error;
  }
};

// Update user login status
export const updateUserLoginStatus = async (userId, isLoggedIn) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        is_logged_in: isLoggedIn,
        updated_at: Date.now()
      })
      .eq('id', userId);
      
    if (error) {
      console.error('Error updating login status:', error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in updateUserLoginStatus:', error);
    throw error;
  }
};

// Clean up expired OTPs
export const cleanupExpiredOTPs = async () => {
  try {
    // First check if the table exists by doing a lightweight query
    try {
      const { count, error: checkError } = await supabase
        .from('otp_verification')
        .select('*', { count: 'exact', head: true })
        .limit(1);
        
      if (checkError) {
        if (checkError.code === '42P01') { // Table doesn't exist error
          console.log('OTP verification table does not exist yet. Please run the schema initialization script.');
          return { rowsAffected: 0, tableExists: false };
        }
        throw checkError; // Re-throw other errors
      }
    } catch (checkError) {
      if (checkError.code === '42P01') { // Table doesn't exist error
        console.log('OTP verification table does not exist yet. Please run the schema initialization script.');
        return { rowsAffected: 0, tableExists: false };
      }
      throw checkError; // Re-throw other errors
    }
    
    // If table check passes, proceed with cleanup
    const expirationTime = 15 * 60 * 1000; // 15 minutes in milliseconds
    const now = Date.now();

    const { error, data } = await supabase
      .from('otp_verification')
      .delete()
      .lt('created_at', now - expirationTime)
      .select();
      
    if (error) {
      console.error('Error cleaning up expired OTPs:', error);
      throw error;
    }
    
    const rowsAffected = data ? data.length : 0;
    return { rowsAffected, tableExists: true };
  } catch (error) {
    console.error('Error in cleanupExpiredOTPs:', error);
    return { rowsAffected: 0, tableExists: false, error };
  }
};

// Export default object with all functions
export default {
  initDatabase,
  setPreference,
  getPreference,
  storeOTP,
  verifyUserOTP,
  resendUserOTP,
  resendOTP,
  cleanupVerifiedOTP,
  insertUser,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  updateUserPassword,
  cachePosts,
  getCachedPosts,
  saveDraftPost,
  getDraftPosts,
  deleteDraftPost,
  createUserAccount,
  verifyOTP,
  authenticateUser,
  loginUserAfterOTP,
  logoutAllUsers,
  logoutCurrentUser,
  getCurrentUser,
  isUserLoggedIn,
  updateUserProfile,
  syncUserWithMongoDB,
  getCompleteUserData,
  getDataFromDatabase,
  executeQuery,
  updateUserLoginStatus,
  cleanupExpiredOTPs
};
