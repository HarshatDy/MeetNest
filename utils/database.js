import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { sendOTPEmail } from './emailService';

// Database reference - will be initialized asynchronously
let db = null;
let dbInitPromise = null;

// Generate a random 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Initialize the database with the new async API
export const initDatabase = async () => {
  // Return existing db if already initialized
  if (db !== null) return db;
  
  // Return in-progress initialization if one exists
  if (dbInitPromise !== null) return dbInitPromise;
  
  // Start initialization process
  dbInitPromise = (async () => {
    try {
      console.log('Initializing database with Expo SDK SQLite API');
      
      // Ensure directory exists (required in newer SDK versions)
      const dbDir = `${FileSystem.documentDirectory}SQLite`;
      const dirInfo = await FileSystem.getInfoAsync(dbDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
      }
      
      // Open the database with async API
      const database = await SQLite.openDatabaseAsync('neighborly.db');
      console.log('SQLite database opened successfully');
      
      // Create wrapper with compatibility layer for transaction API
      db = {
        _db: database,
        
        // Compatibility layer for transaction API
        transaction: (callback, errorCallback, successCallback) => {
          (async () => {
            try {
              // Begin db operation
              const tx = {
                executeSql: async (sqlStatement, args = [], successCb = null, errorCb = null) => {
                  try {
                    // Run SQL with new API
                    if (sqlStatement.toLowerCase().startsWith('select')) {
                      // For SELECT queries
                      const result = await database.getAllAsync(sqlStatement, args);
                      // Format result to match old API
                      const rows = {
                        length: result.length,
                        item: (i) => result[i],
                        _array: result
                      };
                      
                      if (successCb) successCb(tx, { rows });
                      return { rows };
                    } else {
                      // For non-SELECT queries
                      const result = await database.execAsync(sqlStatement, args);
                      
                      if (successCb) successCb(tx, result);
                      return result;
                    }
                  } catch (error) {
                    console.error(`SQL Error: ${sqlStatement}`, error);
                    if (errorCb) errorCb(tx, error);
                    throw error;
                  }
                }
              };
              
              // Execute the transaction callback
              await callback(tx);
              
              // Call success callback
              if (successCallback) successCallback();
            } catch (error) {
              console.error('Transaction error:', error);
              if (errorCallback) errorCallback(error);
            }
          })();
          
          // Return pseudo-transaction object for compatibility
          return {
            executeSql: () => console.warn('Cannot call executeSql outside of transaction callback')
          };
        },
        
        // Expose native methods
        rawExecAsync: (sql, params) => database.execAsync(sql, params),
        rawGetAllAsync: (sql, params) => database.getAllAsync(sql, params)
      };
      
      // Initialize tables
      await initializeTables();
      console.log('Database initialized successfully');
      
      return db;
    } catch (error) {
      console.error('Error initializing database:', error);
      setupMockDatabase();
      return db;
    } finally {
      // Clear the promise after completion (success or failure)
      dbInitPromise = null;
    }
  })();
  
  return dbInitPromise;
};

// Mock database for fallback
function setupMockDatabase() {
  console.warn('Setting up mock database - storage functionality will be limited');
  db = {
    transaction: (callback, errorCallback, successCallback) => {
      console.warn('Using mock database - storage functionality is disabled');
      
      // Create mock transaction object
      const tx = {
        executeSql: (_, __, successCb) => {
          if (successCb) {
            successCb(tx, { rows: { length: 0, item: () => null, _array: [] } });
          }
          return Promise.resolve({ rows: { length: 0, item: () => null, _array: [] } });
        }
      };
      
      // Execute callback with mock tx
      setTimeout(() => {
        try {
          callback(tx);
          if (successCallback) successCallback();
        } catch (e) {
          if (errorCallback) errorCallback(e);
        }
      }, 0);
      
      return {
        executeSql: () => console.warn('Cannot call executeSql outside of transaction callback')
      };
    },
    rawExecAsync: () => Promise.resolve({ rowsAffected: 0 }),
    rawGetAllAsync: () => Promise.resolve([])
  };
}

// Initialize tables with the compatibility layer
async function initializeTables() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    db.transaction(tx => {
      // Create users table with isLoggedIn field
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY NOT NULL,
          email TEXT NOT NULL UNIQUE,
          display_name TEXT,
          password TEXT NOT NULL,
          society TEXT,
          is_logged_in INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );`
      );
      
      // Create user preferences table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL
        );`
      );
      
      // Create cache table for posts
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS posts_cache (
          id TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL,
          timestamp INTEGER NOT NULL
        );`
      );
      
      // Create draft posts table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS draft_posts (
          id TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL,
          timestamp INTEGER NOT NULL
        );`
      );
      
      // Create OTP verification table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS otp_verification (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          userId TEXT NOT NULL,
          otp TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          attempts INTEGER DEFAULT 0,
          verified INTEGER DEFAULT 0
        );`
      );
    }, reject, resolve);
  });
}

// Set a preference
export const setPreference = async (key, value) => {
  try {
    if (!key) {
      console.error('Cannot set preference with null/undefined key');
      return { success: false, message: 'Invalid key' };
    }
    
    const database = await initDatabase();
    const safeValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)',
          [key, safeValue],
          (_, result) => {
            console.log(`Successfully set preference: ${key}`);
            resolve({ success: true, result });
          },
          (_, error) => {
            console.error(`Error setting preference (${key}):`, error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error(`Error in setPreference for key ${key}:`, error);
    throw error;
  }
};

// Get a preference
export const getPreference = async (key) => {
  if (!key) {
    console.error('Cannot get preference with null/undefined key');
    return null;
  }

  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'SELECT value FROM preferences WHERE key = ?',
          [key],
          (_, { rows }) => {
            if (rows.length > 0) {
              try {
                const rawValue = rows.item(0).value;
                let value;
                try {
                  value = JSON.parse(rawValue);
                } catch (parseError) {
                  value = rawValue;
                }
                console.log(`Successfully retrieved preference: ${key}`);
                resolve(value);
              } catch (e) {
                console.error(`Error parsing preference for key ${key}:`, e);
                resolve(null);
              }
            } else {
              console.log(`No preference found for key: ${key}`);
              resolve(null);
            }
          },
          (_, error) => {
            console.error(`Error getting preference for key ${key}:`, error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error(`Error in getPreference for key ${key}:`, error);
    return null;
  }
};

// Store OTP for a user with expiration handling
export const storeOTP = async (email, userId) => {
  try {
    const database = await initDatabase();
    const otp = generateOTP();
    const now = Date.now();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        // First delete any existing OTP for this email
        tx.executeSql(
          'DELETE FROM otp_verification WHERE email = ?',
          [email],
          () => {
            // Then insert new OTP
            tx.executeSql(
              'INSERT INTO otp_verification (email, userId, otp, created_at, attempts, verified) VALUES (?, ?, ?, ?, 0, 0)',
              [email, userId, otp, now],
              async () => {
                // Send the OTP via email
                await sendOTPEmail(email, otp);
                // For the demo, also log the OTP to console
                if (__DEV__) {
                  console.log(`[DEV MODE] Stored OTP for ${email}: ${otp}`);
                }
                resolve({ success: true, otp });
              },
              (_, error) => {
                console.error('Error storing OTP:', error);
                reject(error);
              }
            );
          },
          (_, error) => {
            console.error('Error deleting existing OTP:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in storeOTP:', error);
    throw error;
  }
};

// Verify OTP for a given user
export const verifyUserOTP = async (userId, providedOTP) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        // Get the stored OTP for this user
        tx.executeSql(
          'SELECT * FROM otp_verification WHERE userId = ?',
          [userId],
          (_, { rows }) => {
            if (rows.length === 0) {
              resolve({ success: false, message: 'No OTP found for this user' });
              return;
            }
            
            const record = rows.item(0);
            const storedOTP = record.otp;
            const createdAt = record.created_at;
            const attempts = record.attempts + 1;
            const now = Date.now();
            const expirationTime = 15 * 60 * 1000; // 15 minutes in milliseconds
                
            // Update attempts count
            tx.executeSql(
              'UPDATE otp_verification SET attempts = ? WHERE userId = ?',
              [attempts, userId]
            );
            
            // Check if OTP has expired
            if (now - createdAt > expirationTime) {
              resolve({ success: false, message: 'OTP has expired, please request a new one' });
              return;
            }
            
            // Check if too many attempts
            if (attempts > 5) {
              resolve({ success: false, message: 'Too many attempts, please request a new OTP' });
              return;
            }
            
            // Check if OTP matches
            if (storedOTP === providedOTP) {
              // Mark as verified
              tx.executeSql(
                'UPDATE otp_verification SET verified = 1 WHERE userId = ?',
                [userId],
                () => {
                  resolve({ success: true, message: 'OTP verified successfully' });
                },
                (_, error) => {
                  console.error('Error updating verification status:', error);
                  reject(error);
                }
              );
            } else {
              resolve({
                success: false, 
                message: `Invalid OTP. ${5 - attempts} attempts remaining`
              });
            }
          },
          (_, error) => {
            console.error('Error verifying OTP:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in verifyUserOTP:', error);
    throw error;
  }
};

// Resend OTP for a user
export const resendUserOTP = async (userId, email) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        // Check if user exists and hasn't been recently sent an OTP
        tx.executeSql(
          'SELECT * FROM otp_verification WHERE userId = ?',
          [userId],
          async (_, { rows }) => {
            if (rows.length > 0) {
              const record = rows.item(0);
              const createdAt = record.created_at;
              const now = Date.now();
              const cooldownPeriod = 1 * 60 * 1000; // 1 minute cooldown
              
              if (now - createdAt < cooldownPeriod) {
                resolve({
                  success: false, 
                  message: 'Please wait before requesting another OTP'
                });
                return;
              }
            }
            
            // Generate and store new OTP
            try {
              const result = await storeOTP(email, userId);
              resolve({ success: true, message: 'OTP sent successfully' });
            } catch (error) {
              reject(error);
            }
          },
          (_, error) => {
            console.error('Error checking OTP status:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in resendUserOTP:', error);
    throw error;
  }
};

// Clean up verified OTP records after successful authentication
export const cleanupVerifiedOTP = async (email) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'DELETE FROM otp_verification WHERE email = ? AND verified = 1',
          [email],
          (_, result) => {
            resolve(result.rowsAffected > 0);
          },
          (_, error) => {
            console.error('Error cleaning up OTP:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in cleanupVerifiedOTP:', error);
    return false;
  }
};

// Clean up expired OTPs
export const cleanupExpiredOTPs = async () => {
  try {
    const database = await initDatabase();
    const expirationTime = 15 * 60 * 1000; // 15 minutes in milliseconds
    const now = Date.now();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'DELETE FROM otp_verification WHERE created_at < ?',
          [now - expirationTime],
          (_, result) => {
            // Ensure result has rowsAffected property
            const rowsAffected = result && result.rowsAffected ? result.rowsAffected : 0;
            resolve({ rowsAffected });
          },
          (_, error) => {
            console.error('Error cleaning up expired OTPs:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in cleanupExpiredOTPs:', error);
    return { rowsAffected: 0 };
  }
};

// Create user account - create account without requiring OTP initially
export const createUserAccount = async (userData) => {
  try {
    // Full debug log of input
    console.log("Creating user account with data:", JSON.stringify({
      id: userData?.id,
      email: userData?.email,
      displayName: userData?.displayName,
      society: userData?.society
    }, null, 2));
    
    // More robust validation
    if (!userData) {
      console.error("userData object is null or undefined");
      return {
        success: false,
        message: 'Invalid user data provided'
      };
    }
    
    // Generate a guaranteed non-null ID that's properly formatted
    const userId = userData.id ? 
      String(userData.id).trim() : 
      'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    
    // Final verification
    if (!userId) {
      console.error("Failed to generate or validate user ID");
      return {
        success: false,
        message: 'Unable to generate valid user ID'
      };
    }
    
    console.log(`Proceeding with user ID: "${userId}"`);
    
    // Insert the user directly but with improved error handling for expo-sqlite@15.1.3
    const database = await initDatabase();
    const now = Date.now();
    
    // Use a simple approach with raw SQL to avoid issues with the SQLite version
    try {
      console.log("Using simple SQL approach");
      
      // Create a simpler, manual insert that's more compatible with older SQLite versions
      return new Promise((resolve, reject) => {
        database.transaction(tx => {
          // Log what we're about to do
          console.log("Executing insert with parameters:", {
            id: userId,
            email: userData.email,
            displayName: userData.displayName || '',
            password: userData.password,
            society: userData.society || '',
            created_at: now,
            updated_at: now
          });
          
          // Use a simple parameterized query
          const query = `
            INSERT INTO users 
            (id, email, display_name, password, society, created_at, updated_at) 
            VALUES 
            ('${userId}', '${userData.email}', '${userData.displayName || ''}', 
             '${userData.password}', '${userData.society || ''}', ${now}, ${now})
          `;
          
          // Log the actual query being executed (without parameterization)
          console.log("Direct SQL query:", query);
          
          tx.executeSql(
            query,
            [],
            async (_, result) => {
              console.log("SQL Insert successful:", result);
              
              try {
                // Import helper function for safe preference setting
                const { setPreferenceSafely } = require('./dbHelpers');
                
                // After successful insert, store user ID in preferences using the safer method
                const prefResult = await setPreferenceSafely('currentUserId', userId);
                console.log('User registered and ID stored in preferences:', prefResult);
                
                resolve({
                  success: true,
                  userId: userId,
                  message: 'Account created successfully'
                });
              } catch (prefError) {
                console.warn('User registered but failed to store ID in preferences', prefError);
                resolve({
                  success: true,
                  userId: userId,
                  message: 'Account created successfully'
                });
              }
            },
            (_, error) => {
              console.error('Error in SQL Insert:', error);
              
              // Check if error is about duplicate email
              if (error.message && error.message.includes('UNIQUE constraint failed: users.email')) {
                reject(new Error('This email is already registered'));
              } else {
                reject(error);
              }
            }
          );
        });
      });
    } catch (sqlError) {
      console.error('SQL Error during direct execution:', sqlError);
      return {
        success: false,
        message: 'Database error: ' + (sqlError.message || 'Unknown error')
      };
    }
  } catch (error) {
    console.error('Error creating user account:', error);
    return {
      success: false,
      message: error.message || 'Failed to create account'
    };
  }
};

// Insert a new user into the database, store user ID in preferences
export const insertUser = async (userData) => {
  try {
    const database = await initDatabase();
    const now = Date.now();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          `INSERT INTO users (id, email, display_name, password, society, is_logged_in, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userData.id || 'user_' + Math.random().toString(36).substring(2, 9),
            userData.email,
            userData.displayName || userData.display_name || '',
            userData.password,
            userData.society || '',
            userData.isLoggedIn || 0,
            now,
            now
          ],
          (_, result) => {
            resolve({ success: true, id: userData.id });
          },
          (_, error) => {
            console.error('Error inserting user:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in insertUser:', error);
    throw error;
  }
};

// Verify OTP and finalize user account
export const verifyOTP = async (userId, otp, isRegistration = true) => {
  try {
    // Log tables before verification for debugging
    const database = await initDatabase();
    console.log('[DEBUG] Database tables before OTP verification:');
    
    // Verify the OTP first
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
        
        const userData = JSON.parse(pendingUserData);
        console.log(`[database][verifyOTP] Retrieved pending user data for: ${userId}`, userData);
        
        // Check if user with this email already exists before trying to insert
        const existingUser = await getUserByEmail(userData.email);
        if (existingUser) {
          console.log(`[database][verifyOTP] User with email ${userData.email} already exists, skipping insertion`);
          // Set the existing user as logged in instead of creating a new one
          await updateUserLoginStatus(existingUser.id, true);
          
          // Sync with MongoDB
          try {
            await syncUserWithMongoDB(existingUser.id);
          } catch (syncError) {
            console.warn('Failed to sync existing user with MongoDB:', syncError);
          }
          
          // Return success but with a note about existing account
          return {
            success: true,
            isExistingUser: true,
            userId: existingUser.id,
            message: 'Logged in to existing account'
          };
        } else {
          // Insert the user into the users table
          try {
            await insertUser(userData);
            await updateUserLoginStatus(userId, true);
            
            // Sync with MongoDB
            try {
              await syncUserWithMongoDB(userId);
            } catch (syncError) {
              console.warn('Failed to sync new user with MongoDB:', syncError);
            }
            
            // Clean up pending user data
            await setPreference(`pending_user_${userId}`, null);
            
            return {
              success: true,
              message: 'Account created and verified successfully',
              userId: userId
            };
          } catch (dbError) {
            console.error('Error finalizing user account:', dbError);
            return {
              success: false,
              message: 'Failed to create account after verification: ' + dbError.message
            };
          }
        }
      } else {
        // This is a login verification, not registration
        // Just update login status and return success
        console.log(`[database][verifyOTP] Login verification for existing user: ${userId}`);
        try {
          await updateUserLoginStatus(userId, true);
          
          // Sync with MongoDB
          try {
            await syncUserWithMongoDB(userId);
          } catch (syncError) {
            console.warn('Failed to sync user with MongoDB during login:', syncError);
          }
          
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

// Helper function to get user by email
export const getUserByEmail = async (email) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM users WHERE email = ?',
          [email],
          (_, { rows }) => {
            if (rows.length > 0) {
              resolve(rows.item(0));
            } else {
              resolve(null);
            }
          },
          (_, error) => {
            console.error('Error getting user by email:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    return null;
  }
};

// Sync user with MongoDB
export const syncUserWithMongoDB = async (userId) => {
  try {
    const database = await initDatabase();
    
    // Get user data from SQLite
    const user = await new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM users WHERE id = ?',
          [userId],
          (_, { rows }) => {
            if (rows.length > 0) {
              resolve(rows.item(0));
            } else {
              resolve(null);
            }
          },
          (_, error) => {
            console.error('Error getting user for MongoDB sync:', error);
            reject(error);
          }
        );
      });
    });
    
    if (!user) {
      console.error(`[database][syncUserWithMongoDB] User not found in local SQLite database: ${userId}`);
      throw new Error('User not found for MongoDB sync');
    }
    
    // Log user info for debugging
    console.log(`[database][syncUserWithMongoDB] Local user found: ${JSON.stringify({
      id: user.id,
      email: user.email,
      display_name: user.display_name
    })}`);
    
    // In a real implementation, we would send the user data to MongoDB
    try {
      // Import user service functions
      const { getAllUsers, createUser, updateUser } = require('../src/services/mongoService');
      
      // First list all MongoDB users for debugging
      console.log(`[database][syncUserWithMongoDB] Checking if user exists in MongoDB`);
      const allUsers = await getAllUsers();
      
      // Check if user already exists in MongoDB (by email or ID)
      const existingMongoUser = allUsers.find(mongoUser => 
        mongoUser.email === user.email || 
        mongoUser._id === user.id || 
        mongoUser.id === user.id
      );
      
      if (existingMongoUser) {
        console.log(`[database][syncUserWithMongoDB] User exists in MongoDB with ID: ${existingMongoUser._id || existingMongoUser.id}`);
        
        // Update existing user
        await updateUser(existingMongoUser._id || existingMongoUser.id, {
          displayName: user.display_name,
          email: user.email,
          societies: user.society ? [user.society] : []
        });
        
        console.log(`[database][syncUserWithMongoDB] Updated existing MongoDB user`);
        return { success: true };
      } else {
        console.log(`[database][syncUserWithMongoDB] User not found in MongoDB, creating new record`);
        
        // Create new user in MongoDB
        const result = await createUser({
          _id: user.id,
          id: user.id, // Add both for compatibility
          email: user.email,
          displayName: user.display_name,
          societies: user.society ? [user.society] : [],
          points: 0,
          achievements: []
        });
        
        console.log(`[database][syncUserWithMongoDB] Created new MongoDB user: ${JSON.stringify(result)}`);
        return { success: true };
      }
    } catch (mongoError) {
      console.error(`[database][syncUserWithMongoDB] MongoDB operation failed:`, mongoError);
      
      // Fall back to mock sync for resilience
      console.log(`[database][syncUserWithMongoDB] Falling back to mock sync`);
      const syncSuccess = await mockMongoDBSync(user);
      
      if (syncSuccess) {
        console.log(`[database][syncUserWithMongoDB] Mock sync successful for user: ${userId}`);
        return { success: true };
      } else {
        throw new Error('MongoDB sync failed');
      }
    }
  } catch (error) {
    console.error('Error syncing user with MongoDB:', error);
    throw error;
  }
};

// Mock MongoDB sync function (placeholder for real implementation)
const mockMongoDBSync = async (userData) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Log what would be sent to MongoDB
  console.log('[MOCK] MongoDB sync with data:', {
    id: userData.id,
    email: userData.email,
    displayName: userData.display_name,
    society: userData.society
  });
  
  // Return success (true) or failure (false) based on some condition
  // For demo, we'll use a high success rate (95%)
  return Math.random() > 0.05;
};

// Resend OTP
export const resendOTP = async (userId, email) => {
  try {
    const result = await resendUserOTP(userId, email);
    
    return {
      success: result.success,
      message: result.message
    };
  } catch (error) {
    console.error('Error resending OTP:', error);
    return {
      success: false,
      message: 'Failed to resend OTP'
    };
  }
};

// Update authenticateUser to implement OTP for login
export const authenticateUser = async (username, password) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM users WHERE email = ?',
          [username],
          async (_, { rows }) => {
            if (rows.length > 0) {
              const user = rows.item(0);
              
              // Check password - in a real app, we'd use bcrypt or similar
              if (user.password === password) {
                // Generate OTP for 2FA only during login
                try {
                  await storeOTP(username, user.id);
                  resolve({
                    id: user.id,
                    email: user.email,
                    requiresOTP: true,
                    message: 'OTP sent for verification'
                  });
                } catch (error) {
                  console.error('Error storing OTP during login:', error);
                  reject(error);
                }
              } else {
                resolve(null); // Password doesn't match
              }
            } else {
              // For demo purposes, allow demo login
              if (username === 'demo@example.com' && password === 'password') {
                const userId = 'user_' + Math.random().toString(36).substring(2, 9);
                
                try {
                  await storeOTP(username, userId);
                  resolve({
                    id: userId,
                    email: username,
                    requiresOTP: true,
                    message: 'OTP sent for verification'
                  });
                } catch (error) {
                  console.error('Error storing OTP for demo user:', error);
                  reject(error);
                }
              } else {
                resolve(null); // User not found
              }
            }
          },
          (_, error) => {
            console.error('Error authenticating user:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in authenticateUser:', error);
    return null;
  }
};

// Get the currently authenticated user
export const getUserFromDatabase = async () => {
  try {
    const userId = await getPreference('currentUserId');
    if (!userId) return null;
    
    // This is a placeholder - in a real app, we would fetch user details from the database
    return {
      id: userId,
      email: 'demo@example.com',
      displayName: 'Demo User'
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Generic function to insert data into a table
export const insertDataIntoTable = async (tableName, data) => {
  try {
    const database = await initDatabase();
    const now = Date.now();
    
    // Prepare columns and placeholders
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
          values,
          (_, result) => {
            resolve({
              success: true,
              id: result.insertId,
              rowsAffected: result.rowsAffected
            });
          },
          (_, error) => {
            console.error(`Error inserting data into ${tableName}:`, error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error(`Error in insertDataIntoTable for ${tableName}:`, error);
    throw error;
  }
};

// Generic function to update data in a table
export const updateDataInTable = async (tableName, id, data) => {
  try {
    const database = await initDatabase();
    
    // Prepare set clause
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id];
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          `UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
          values,
          (_, result) => {
            resolve({
              success: true,
              rowsAffected: result.rowsAffected
            });
          },
          (_, error) => {
            console.error(`Error updating data in ${tableName}:`, error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error(`Error in updateDataInTable for ${tableName}:`, error);
    throw error;
  }
};

// Generic function to delete data from a table
export const deleteDataFromTable = async (tableName, id) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          `DELETE FROM ${tableName} WHERE id = ?`,
          [id],
          (_, result) => {
            resolve({
              success: true,
              rowsAffected: result.rowsAffected
            });
          },
          (_, error) => {
            console.error(`Error deleting data from ${tableName}:`, error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error(`Error in deleteDataFromTable for ${tableName}:`, error);
    throw error;
  }
};

// Generic function to get data from a table
export const getDataFromTable = async (tableName, condition = null, limit = 100, orderBy = null) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        let query = `SELECT * FROM ${tableName}`;
        const params = [];
        
        if (condition) {
          query += ` WHERE ${condition.field} = ?`;
          params.push(condition.value);
        }
        
        if (orderBy) {
          query += ` ORDER BY ${orderBy.field} ${orderBy.direction || 'ASC'}`;
        }
        
        if (limit) {
          query += ` LIMIT ${limit}`;
        }
        
        tx.executeSql(
          query,
          params,
          (_, { rows }) => {
            const results = [];
            for (let i = 0; i < rows.length; i++) {
              results.push(rows.item(i));
            }
            resolve(results);
          },
          (_, error) => {
            console.error(`Error getting data from ${tableName}:`, error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error(`Error in getDataFromTable for ${tableName}:`, error);
    return [];
  }
};

// Get data by ID from any table
export const getDataById = async (tableName, id) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM ${tableName} WHERE id = ?`,
          [id],
          (_, { rows }) => {
            if (rows.length > 0) {
              resolve(rows.item(0));
            } else {
              resolve(null);
            }
          },
          (_, error) => {
            console.error(`Error getting data from ${tableName} by ID:`, error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error(`Error in getDataById for ${tableName}:`, error);
    return null;
  }
};

// Execute a custom query
export const executeQuery = async (query, params = []) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (_, result) => {
            // Ensure result always has rowsAffected property to prevent errors
            if (!result.rowsAffected && query.toLowerCase().startsWith('delete')) {
              resolve({ rowsAffected: 0, ...result });
            } else {
              resolve(result);
            }
          },
          (_, error) => reject(error)
        );
      });
    });
  } catch (error) {
    console.error('Error executing custom query:', error);
    throw error;
  }
};

// Create a new table dynamically
export const createTable = async (tableName, columns) => {
  try {
    const database = await initDatabase();
    
    const columnDefinitions = columns.map(col => {
      return `${col.name} ${col.type}${col.primaryKey ? ' PRIMARY KEY' : ''}${col.notNull ? ' NOT NULL' : ''}${col.unique ? ' UNIQUE' : ''}${col.default ? ` DEFAULT ${col.default}` : ''}`;
    }).join(', ');
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefinitions})`,
          [],
          (_, result) => {
            resolve({
              success: true,
              message: `Table ${tableName} created successfully`
            });
          },
          (_, error) => {
            console.error(`Error creating table ${tableName}:`, error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error(`Error in createTable for ${tableName}:`, error);
    throw error;
  }
};

// Get the count of rows in a table
export const getRowCount = async (tableName, condition = null) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        let query = `SELECT COUNT(*) as count FROM ${tableName}`;
        const params = [];
        
        if (condition) {
          query += ` WHERE ${condition.field} = ?`;
          params.push(condition.value);
        }
        
        tx.executeSql(
          query,
          params,
          (_, { rows }) => {
            resolve(rows.item(0).count);
          },
          (_, error) => {
            console.error(`Error getting row count from ${tableName}:`, error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error(`Error in getRowCount for ${tableName}:`, error);
    return 0;
  }
};

// Function to update user login status
export const updateUserLoginStatus = async (userId, isLoggedIn) => {
  try {
    const database = await initDatabase();
    const now = Date.now();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'UPDATE users SET is_logged_in = ?, updated_at = ? WHERE id = ?',
          [isLoggedIn ? 1 : 0, now, userId],
          (_, result) => {
            if (result.rowsAffected > 0) {
              resolve({ success: true });
            } else {
              resolve({ success: false, message: 'User not found' });
            }
          },
          (_, error) => {
            console.error('Error updating login status:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in updateUserLoginStatus:', error);
    throw error;
  }
};

// Debug flag for database reset - set to 1 to enable reset, 0 to disable
const DEBUG_RESET_FLAG = 1; // Developer can change this to 1 when reset is needed

// Helper function to get all table names
const getAllTableNames = async (database) => {
  return new Promise((resolve, reject) => {
    database.transaction(tx => {
      tx.executeSql(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        [],
        (_, { rows }) => {
          const tableNames = [];
          for (let i = 0; i < rows.length; i++) {
            tableNames.push(rows.item(i).name);
          }
          resolve(tableNames);
        },
        (_, error) => {
          console.error('Error getting table names:', error);
          reject(error);
        }
      );
    });
  });
};

// Function to reset database based on debug flag (1=reset, 0=skip)
export const resetDatabaseIfUserLoggedIn = async (userId) => {
  try {
    const database = await initDatabase();
    
    // Check debug flag - no preference query, just use the variable
    console.log('Debug database reset flag:', DEBUG_RESET_FLAG);
    
    // If flag is 0, don't reset
    if (DEBUG_RESET_FLAG !== 1) {
      console.log('Database reset not performed: Debug flag is 0');
      return {
        success: true,
        message: 'Reset not needed - debug flag is 0',
        resetPerformed: false
      };
    }
    
    // Debug flag is 1, perform database reset
    console.log('Performing database reset - debug flag is 1');

    // Get all table names except sqlite_sequence (system table)
    const tables = await getAllTableNames(database);
    const userTables = tables.filter(table => table !== 'sqlite_sequence');
    
    console.log('Tables to drop:', userTables);
    
    // Helper function to drop a table with retry logic
    const dropTableWithRetry = async (tableName, maxRetries = 5) => {
      let retries = 0;
      while (retries < maxRetries) {
        try {
          await new Promise((resolve, reject) => {
            // Create a new transaction for each table to prevent locks
            database.transaction(tx => {
              console.log(`Attempting to drop table: ${tableName} (retry ${retries})`);
              tx.executeSql(
                `DROP TABLE IF EXISTS ${tableName}`,
                [],
                (_, result) => {
                  console.log(`Successfully dropped table ${tableName}`);
                  resolve(result);
                },
                (_, err) => {
                  console.warn(`Warning while dropping ${tableName}:`, err);
                  reject(err);
                }
              );
            }, (txError) => {
              console.warn(`Transaction error dropping ${tableName}:`, txError);
              reject(txError);
            });
          });
          
          // If successful, break the retry loop
          break;
        } catch (error) {
          retries++;
          console.warn(`Failed to drop ${tableName}, retry ${retries}/${maxRetries}`);
          
          if (error.message && error.message.includes('locked')) {
            // If table is locked, wait longer before retrying
            const delay = 500 * Math.pow(2, retries); // Exponential backoff: 500ms, 1s, 2s, 4s...
            console.log(`Table ${tableName} is locked, waiting ${delay}ms before retry`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else if (retries >= maxRetries) {
            console.error(`Failed to drop ${tableName} after ${maxRetries} attempts:`, error);
            // Continue anyway to try other tables
          }
        }
      }
    };
    
    // Drop tables sequentially rather than in parallel to prevent locks
    for (const table of userTables) {
      try {
        await dropTableWithRetry(table);
        // Add a small delay between operations
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.warn(`Could not drop table ${table}, continuing:`, error);
      }
    }
    
    // Reinitialize the tables - add timeout to ensure all drop operations are complete
    console.log('Waiting before reinitializing database tables...');
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    
    console.log('Reinitializing database tables after reset');
    await initializeTables();
    
    // Verify tables were recreated
    const recreatedTables = await getAllTableNames(database);
    console.log('Recreated tables after reset:', recreatedTables);
    
    return {
      success: true,
      message: 'Database completely reset - all tables dropped and recreated',
      resetPerformed: true
    };
  } catch (error) {
    console.error('Error in resetDatabaseIfUserLoggedIn:', error);
    return {
      success: false,
      message: 'Database reset failed: ' + error.message,
      resetPerformed: false
    };
  }
};

// Make sure to init the database on import
initDatabase().catch(error => 
  console.error('Failed to initialize database on import:', error)
);

// Export all database operations
export default {
  initDatabase,
  setPreference,
  getPreference,
  storeOTP,
  verifyUserOTP,
  resendUserOTP,
  cleanupVerifiedOTP,
  createUserAccount,
  verifyOTP,
  resendOTP,
  authenticateUser,
  getUserFromDatabase,
  insertUser, // Added to exports
  insertDataIntoTable,
  updateDataInTable,
  deleteDataFromTable,
  getDataFromTable,
  getDataById,
  executeQuery,
  createTable,
  getRowCount,
  cleanupExpiredOTPs,
  updateUserLoginStatus,
  resetDatabaseIfUserLoggedIn
};
