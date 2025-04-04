import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { sendOTPEmail } from '../../utils/emailService';

// Database reference - will be initialized asynchronously
let db = null;
let dbInitPromise = null;

const DEBUG_SQL_ENABLED = true; // Add a flag to control SQL debug prints
const DEBUG_GENERAL_ENABLED = true; // Add a flag to control general debug prints

// Generate a random 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Helper function to get all table names
const getAllTableNames = async (database) => {
  try {
    if (DEBUG_GENERAL_ENABLED) {
      console.log('[DEBUG] Fetching all table names');
    }
    const result = await database.rawGetAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      []
    );
    if (DEBUG_GENERAL_ENABLED) {
      console.log('[DEBUG] Tables in database:', result.map(row => row.name));
    }
    return result.map(row => row.name);
  } catch (error) {
    if (DEBUG_GENERAL_ENABLED) {
      console.error('[DEBUG] Error getting table names:', error);
    }
    return [];
  }
};

// Dump all tables content for debugging
const dumpAllTables = async (database) => {
  try {
    if (DEBUG_GENERAL_ENABLED) {
      console.log('====== DUMPING ALL DATABASE TABLES CONTENT ======');
    }
    const tables = await getAllTableNames(database);
    
    // Log all tables content
    for (const table of tables) {
      await logTableContents(table, database);
    }
    
    if (DEBUG_GENERAL_ENABLED) {
      console.log('====== DATABASE CONTENT DUMP COMPLETED ======');
    }
  } catch (error) {
    if (DEBUG_GENERAL_ENABLED) {
      console.error('[DEBUG] Error dumping tables:', error);
    }
  }
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
      console.log('Initializing database with Expo SDK 52 SQLite API');
      
      // Ensure directory exists (required in SDK 52)
      const dbDir = `${FileSystem.documentDirectory}SQLite`;
      const dirInfo = await FileSystem.getInfoAsync(dbDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
      }
      
      // Open the database with new async API
      const database = await SQLite.openDatabaseAsync('neighborly.db');
      console.log('SQLite database opened successfully');
      
      // Create wrapper with compatibility layer for old transaction API
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
                    // Add detailed debug logging for all SQL operations
                    if (DEBUG_SQL_ENABLED) {
                      console.log(`[SQL] Executing: ${sqlStatement}`);
                      console.log(`[SQL] Parameters:`, args);
                      console.log(`[SQL] Parameter types:`, args.map(arg => typeof arg));
                    }
                    
                    // Check for null or undefined values and log warnings
                    const nullArgs = args.map((arg, idx) => arg === null || arg === undefined ? idx : null).filter(idx => idx !== null);
                    if (nullArgs.length > 0) {
                      console.warn(`[SQL] Warning: NULL or undefined parameters at positions: ${nullArgs.join(', ')}`);
                    }
                    
                    // Format SQL statement with parameters directly embedded
                    let formattedSql = sqlStatement;
                    const sanitizedArgs = [];
                    
                    if (args && args.length > 0) {
                      // Handle parameter substitution manually for better control
                      for (let i = 0; i < args.length; i++) {
                        const arg = args[i];
                        
                        if (arg === null || arg === undefined) {
                          sanitizedArgs.push('NULL');
                        } else if (typeof arg === 'string') {
                          // Escape single quotes in strings by doubling them (SQLite convention)
                          const escaped = arg.replace(/'/g, "''");
                          sanitizedArgs.push(`'${escaped}'`);
                        } else if (typeof arg === 'number' || typeof arg === 'boolean') {
                          sanitizedArgs.push(arg.toString());
                        } else {
                          // For objects, dates, etc. - convert to string
                          sanitizedArgs.push(`'${String(arg).replace(/'/g, "''")}'`);
                        }
                      }
                      
                      // Replace ? placeholders with actual values
                      let argIndex = 0;
                      formattedSql = formattedSql.replace(/\?/g, () => {
                        const replacement = sanitizedArgs[argIndex];
                        argIndex++;
                        return replacement;
                      });
                    }
                    
                    if (DEBUG_SQL_ENABLED) {
                      console.log(`[SQL] Formatted SQL: ${formattedSql}`);
                    }
                    
                    // Run SQL with new API
                    if (sqlStatement.toLowerCase().startsWith('select')) {
                      // For SELECT queries
                      const result = await database.getAllAsync(formattedSql, []);
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
                      if (DEBUG_SQL_ENABLED) {
                        console.log(`[SQL] Executing non-SELECT query: ${formattedSql}`);
                      }
                      const result = await database.execAsync(formattedSql, []);
                      if (DEBUG_SQL_ENABLED) {
                        console.log(`[SQL] Query executed successfully`);
                      }
                      
                      if (successCb) successCb(tx, result);
                      return result;
                    }
                  } catch (error) {
                    if (DEBUG_SQL_ENABLED) {
                      console.error(`[SQL] Error executing: ${sqlStatement}`, error);
                      console.error(`[SQL] Failed parameters:`, args);
                    }
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
        
        // Expose native methods with direct SQL formatting
        rawExecAsync: (sql, params = []) => {
          // Format the SQL with params
          let formattedSql = sql;
          const sanitizedArgs = [];
          
          if (params && params.length > 0) {
            for (let i = 0; i < params.length; i++) {
              const param = params[i];
              
              if (param === null || param === undefined) {
                sanitizedArgs.push('NULL');
              } else if (typeof param === 'string') {
                const escaped = param.replace(/'/g, "''");
                sanitizedArgs.push(`'${escaped}'`);
              } else if (typeof param === 'number' || typeof param === 'boolean') {
                sanitizedArgs.push(param.toString());
              } else {
                sanitizedArgs.push(`'${String(param).replace(/'/g, "''")}'`);
              }
            }
            
            let paramIndex = 0;
            formattedSql = formattedSql.replace(/\?/g, () => {
              const replacement = sanitizedArgs[paramIndex];
              paramIndex++;
              return replacement;
            });
          }
          
          if (DEBUG_SQL_ENABLED) {
            console.log(`[SQL] Direct execution: ${formattedSql}`);
          }
          return database.execAsync(formattedSql, []);
        },
        
        rawGetAllAsync: (sql, params = []) => {
          // Format the SQL with params
          let formattedSql = sql;
          const sanitizedArgs = [];
          
          if (params && params.length > 0) {
            for (let i = 0; i < params.length; i++) {
              const param = params[i];
              
              if (param === null || param === undefined) {
                sanitizedArgs.push('NULL');
              } else if (typeof param === 'string') {
                const escaped = param.replace(/'/g, "''");
                sanitizedArgs.push(`'${escaped}'`);
              } else if (typeof param === 'number' || typeof param === 'boolean') {
                sanitizedArgs.push(param.toString());
              } else {
                sanitizedArgs.push(`'${String(param).replace(/'/g, "''")}'`);
              }
            }
            
            let paramIndex = 0;
            formattedSql = formattedSql.replace(/\?/g, () => {
              const replacement = sanitizedArgs[paramIndex];
              paramIndex++;
              return replacement;
            });
          }
          
          if (DEBUG_SQL_ENABLED) {
            console.log(`[SQL] Direct query: ${formattedSql}`);
          }
          return database.getAllAsync(formattedSql, []);
        }
      };
      
      // Initialize tables
      await initializeTables();
      console.log('Database initialized successfully');
      
      // Dump all tables content
      await dumpAllTables(db);
      
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

// Helper function to log table contents for debugging
const logTableContents = async (tableName, db) => {
  try {
    if (DEBUG_GENERAL_ENABLED) {
      console.log(`[DEBUG] Logging contents of table: ${tableName}`);
    }
    const result = await db.rawGetAllAsync(`SELECT * FROM ${tableName} LIMIT 100`, []);
    if (DEBUG_GENERAL_ENABLED) {
      console.log(`[DEBUG] ${tableName} contents:`, result);
      console.log(`[DEBUG] ${tableName} row count: ${result.length}`);
    }
    return result;
  } catch (error) {
    if (DEBUG_GENERAL_ENABLED) {
      console.error(`[DEBUG] Error reading ${tableName} table:`, error);
    }
    return [];
  }
};

// Set a preference
export const setPreference = async (key, value) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)',
          [key, JSON.stringify(value)],
          (_, result) => resolve(result),
          (_, error) => reject(error)
        );
      });
    });
  } catch (error) {
    console.error('Error setting preference:', error);
    throw error;
  }
};

// Get a preference
export const getPreference = async (key) => {
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
                resolve(JSON.parse(rows.item(0).value));
              } catch (e) {
                console.error('Error parsing preference:', e);
                resolve(null);
              }
            } else {
              resolve(null);
            }
          },
          (_, error) => reject(error)
        );
      });
    });
  } catch (error) {
    console.error('Error getting preference:', error);
    return null;
  }
};

// Store OTP for a user with expiration handling
export const storeOTP = async (email, userId) => {
  try {
    const database = await initDatabase();
    const otp = generateOTP();
    const now = Date.now();
    
    console.log(`[database][storeOTP] Storing OTP for email: ${email}, userId: ${userId}`);
    console.log(`[database][storeOTP] Email type: ${typeof email}, userId type: ${typeof userId}`);
    console.log(`[database][storeOTP] OTP: ${otp}, timestamp: ${now}`);
    
    // Debug: log table contents before operation
    await logTableContents('otp_verification', database);
    
    if (!email) {
      console.error('[database][storeOTP] Error: Email is null or undefined');
      throw new Error('Email is required to store OTP');
    }
    
    if (typeof email !== 'string') {
      console.error(`[database][storeOTP] Email is not a string: ${typeof email}`);
      email = String(email);
      console.log(`[database][storeOTP] Converted email to string: ${email}`);
    }
    
    // Trim email to remove any whitespace
    email = email.trim();
    console.log(`[database][storeOTP] Trimmed email: "${email}"`);

    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        // First delete any existing OTP for this email
        console.log(`[database][storeOTP] Deleting existing OTP for email: ${email}`);
        tx.executeSql(
          'DELETE FROM otp_verification WHERE email = ?',
          [email],
          () => {
            // Then insert new OTP
            console.log(`[database][storeOTP] Inserting new OTP - Email: ${email}, UserId: ${userId}, OTP: ${otp}, Now: ${now}`);
            tx.executeSql(
              'INSERT INTO otp_verification (email, userId, otp, created_at, attempts, verified) VALUES (?, ?, ?, ?, 0, 0)',
              [email, userId, otp, now],
              async () => {
                // Send the OTP via email (mock in dev environment)
                await sendOTPEmail(email, otp);
                
                // For the demo, also log the OTP to console
                if (__DEV__) {
                  console.log(`[DEV MODE] Stored OTP for ${email}: ${otp}`);
                }
                
                resolve({ success: true, otp });
              },
              (_, error) => {
                console.error('[database][storeOTP] Error inserting OTP:', error);
                console.error('[database][storeOTP] Failed parameters - Email:', email, 'UserId:', userId, 'OTP:', otp, 'Now:', now);
                reject(error);
              }
            );
          },
          (_, error) => {
            console.error('[database][storeOTP] Error deleting existing OTP:', error);
            console.error('[database][storeOTP] Failed parameter - Email:', email);
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
    
    // Debug: log table contents before verification
    await logTableContents('otp_verification', database);
    
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

// Resend OTP
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

// Insert a new user into the database
export const insertUser = async (userData) => {
  try {
    const database = await initDatabase();
    
    // Debug: log users table before insertion
    await logTableContents('users', database);
    
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
            userData.isLoggedIn || userData.is_logged_in|| 0,  // Default to not logged in
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

// Get a user by ID
export const getUserById = async (userId) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM users WHERE id = ?',
          [userId],
          (_, { rows }) => {
            if (rows.length > 0) {
              const user = rows.item(0);
              // Don't send password back to client
              delete user.password;
              resolve(user);
            } else {
              resolve(null);
            }
          },
          (_, error) => {
            console.error('Error getting user by ID:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in getUserById:', error);
    return null;
  }
};

// Get a user by email
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

// Update a user
export const updateUser = async (userId, userData) => {
  try {
    const database = await initDatabase();
    const now = Date.now();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          `UPDATE users SET 
           display_name = ?, 
           society = ?, 
           updated_at = ?
           WHERE id = ?`,
          [
            userData.displayName || userData.display_name,
            userData.society,
            now,
            userId
          ],
          (_, result) => {
            if (result.rowsAffected > 0) {
              resolve({ success: true });
            } else {
              resolve({ success: false, message: 'User not found' });
            }
          },
          (_, error) => {
            console.error('Error updating user:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw error;
  }
};

// Delete a user
export const deleteUser = async (userId) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'DELETE FROM users WHERE id = ?',
          [userId],
          (_, result) => {
            if (result.rowsAffected > 0) {
              resolve({ success: true });
            } else {
              resolve({ success: false, message: 'User not found' });
            }
          },
          (_, error) => {
            console.error('Error deleting user:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    throw error;
  }
};

// Update user password
export const updateUserPassword = async (userId, newPassword) => {
  try {
    const database = await initDatabase();
    const now = Date.now();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'UPDATE users SET password = ?, updated_at = ? WHERE id = ?',
          [newPassword, now, userId],
          (_, result) => {
            if (result.rowsAffected > 0) {
              resolve({ success: true });
            } else {
              resolve({ success: false, message: 'User not found' });
            }
          },
          (_, error) => {
            console.error('Error updating password:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in updateUserPassword:', error);
    throw error;
  }
};

// Cache posts
export const cachePosts = async (posts) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const now = Date.now();
      
      database.transaction(tx => {
        posts.forEach(post => {
          tx.executeSql(
            'INSERT OR REPLACE INTO posts_cache (id, data, timestamp) VALUES (?, ?, ?)',
            [post.id, JSON.stringify(post), now],
            null,
            (_, error) => console.error('Error caching post:', error)
          );
        });
      }, reject, () => resolve());
    });
  } catch (error) {
    console.error('Error caching posts:', error);
    throw error;
  }
};

// Get cached posts
export const getCachedPosts = async () => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM posts_cache ORDER BY timestamp DESC LIMIT 50',
          [],
          (_, { rows }) => {
            const posts = [];
            for (let i = 0; i < rows.length; i++) {
              try {
                posts.push(JSON.parse(rows.item(i).data));
              } catch (e) {
                console.error('Error parsing cached post:', e);
              }
            }
            resolve(posts);
          },
          (_, error) => reject(error)
        );
      });
    });
  } catch (error) {
    console.error('Error getting cached posts:', error);
    return [];
  }
};

// Save draft post
export const saveDraftPost = async (post) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const now = Date.now();
      const id = post.id || `draft_${now}`;
      database.transaction(tx => {
        tx.executeSql(
          'INSERT OR REPLACE INTO draft_posts (id, data, timestamp) VALUES (?, ?, ?)',
          [id, JSON.stringify(post), now],
          (_, result) => resolve({ ...post, id }),
          (_, error) => reject(error)
        );
      });
    });
  } catch (error) {
    console.error('Error saving draft post:', error);
    throw error;
  }
};

// Get all draft posts
export const getDraftPosts = async () => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM draft_posts ORDER BY timestamp DESC',
          [],
          (_, { rows }) => {
            const posts = [];
            for (let i = 0; i < rows.length; i++) {
              try {
                posts.push(JSON.parse(rows.item(i).data));
              } catch (e) {
                console.error('Error parsing draft post:', e);
              }
            }
            resolve(posts);
          },
          (_, error) => reject(error)
        );
      });
    });
  } catch (error) {
    console.error('Error getting draft posts:', error);
    return [];
  }
};

// Delete draft post
export const deleteDraftPost = async (id) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'DELETE FROM draft_posts WHERE id = ?',
          [id],
          (_, result) => resolve(result),
          (_, error) => reject(error)
        );
      });
    });
  } catch (error) {
    console.error('Error deleting draft post:', error);
    throw error;
  }
};

// Create user account - combines OTP and user creation
export const createUserAccount = async (userData) => {
  try {
    const database = await initDatabase();
    
    // Debug: log tables before creating account
    console.log('[DEBUG] Database tables before account creation:');
    await logTableContents('users', database);
    await logTableContents('otp_verification', database);
    
    // Generate a temporary userId
    const userId = 'temp_' + Math.random().toString(36).substring(2, 9);
    console.log(`[database][createUserAccount] Creating account for ${userData.email} with temp ID: ${userId}`);
    console.log(`[database][createUserAccount] Email type: ${typeof userData.email}`);
    
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
    
    // Store pending user data - DON'T insert into users table yet
    console.log(`[database][createUserAccount] Storing pending user data`);
    const pendingUserData = {
      email: userData.email,
      displayName: userData.displayName || '',
      password: userData.password,
      society: userData.society || '',
      createdAt: Date.now()
    };
    
    await setPreference(`pending_user_${userId}`, JSON.stringify(pendingUserData));
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

// Verify OTP and finalize user account in both SQLite and MongoDB
export const verifyOTP = async (userId, otp, isRegistration = true) => {
  try {
    // Debug: log tables before verification
    const database = await initDatabase();
    console.log('[DEBUG] Database tables before OTP verification:');
    await logTableContents('otp_verification', database);
    await logTableContents('users', database);
    
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
          
          // Return success but with a note about existing account
          return {
            success: true,
            message: 'Logged in to existing account',
            userId: existingUser.id,
            isExistingUser: true
          };
        }
        
        // Only now insert into local SQLite database after OTP verification
        try {
          const localResult = await insertUser({
            id: userId,
            email: userData.email,
            display_name: userData.displayName,
            password: userData.password,
            society: userData.society,
            is_logged_in: 1  // Set user as logged in directly in database
          });
          console.log(`[database][verifyOTP] User inserted into local database: ${userId}`);
          
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
          if (dbError.message && dbError.message.includes('UNIQUE constraint failed: users.email')) {
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
        // Just update login status and return success
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

// Enhanced login function to handle Instagram-like authentication flow
export const authenticateUser = async (email, password) => {
  try {
    const database = await initDatabase();
    
    // Debug: log users table before authentication
    await logTableContents('users', database);
    
    // Ensure email is trimmed
    if (email && typeof email === 'string') {
      email = email.trim();
      console.log(`[database][authenticateUser] Trimmed email: "${email}"`);
    }
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM users WHERE email = ?',
          [email],
          async (_, { rows }) => {
            if (rows.length > 0) {
              const user = rows.item(0);
              
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
                  
                  resolve({
                    id: user.id,
                    email: user.email,
                    requiresOTP: true,
                    shouldSyncWithMongo,
                    message: 'OTP sent for verification'
                  });
                } catch (error) {
                  console.error('Error in post-authentication:', error);
                  reject(error);
                }
              } else {
                resolve({ success: false, message: 'Invalid credentials' });
              }
            } else {
              // For demo purposes, handle special demo login without creating a user
              if (email === 'demo@example.com' && password === 'password') {
                console.log('[database][authenticateUser] Demo login requested, but no user creation');
                
                // Return special demo login response without creating a user
                // The client will need to handle this case by directing to registration
                resolve({
                  success: false,
                  isDemoLogin: true,
                  message: 'Demo account not found. Please register first.'
                });
              } else {
                resolve({ success: false, message: 'User not found' });
              }
            }
          },
          (_, error) => {
            console.error('Error querying user:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in authenticateUser:', error);
    return { success: false, message: 'Authentication error' };
  }
};

// Login a user after OTP verification
export const loginUserAfterOTP = async (userId) => {
  try {
    const database = await initDatabase();
    
    // First, ensure all other users are logged out
    await logoutAllUsers();
    
    // Then set this user as logged in
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'UPDATE users SET is_logged_in = 1, updated_at = ? WHERE id = ?',
          [Date.now(), userId],
          (_, result) => {
            // Don't rely on rowsAffected which may be undefined
            // Store the current user ID in preferences for easy lookup
            setPreference('currentUserId', userId)
              .then(() => {
                resolve({ success: true, message: 'User logged in successfully' });
              })
              .catch(error => {
                console.error('Error storing user ID preference:', error);
                // Still resolve as success since database was updated
                resolve({ success: true, message: 'User logged in but preference not stored' });
              });
          },
          (_, error) => {
            console.error('Error logging in user:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in loginUserAfterOTP:', error);
    return { success: false, message: 'Login error: ' + error.message };
  }
};

// Logout all users
export const logoutAllUsers = async () => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'UPDATE users SET is_logged_in = 0, updated_at = ? WHERE is_logged_in = 1',
          [Date.now()],
          (_, result) => {
            // Don't rely on rowsAffected which may be undefined
            resolve({ success: true });
          },
          (_, error) => {
            console.error('Error logging out all users:', error);
            reject(error);
          }
        );
      });
    });
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
    
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'UPDATE users SET is_logged_in = 0, updated_at = ? WHERE id = ?',
          [Date.now(), currentUser.id],
          (_, result) => {
            // Don't rely on rowsAffected which may be undefined
            resolve({ success: true, message: 'User logged out successfully' });
          },
          (_, error) => {
            console.error('Error logging out user:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in logoutCurrentUser:', error);
    return { success: false, message: 'Logout error: ' + error.message };
  }
};

// Get the currently logged in user
export const getCurrentUser = async () => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM users WHERE is_logged_in = 1 LIMIT 1',
          [],
          (_, { rows }) => {
            if (rows.length > 0) {
              const user = rows.item(0);
              // Don't send password back to client
              delete user.password;
              resolve(user);
            } else {
              resolve(null);
            }
          },
          (_, error) => {
            console.error('Error getting logged in user:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
};

// Check if any user is logged in
export const isUserLoggedIn = async () => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          'SELECT COUNT(*) as count FROM users WHERE is_logged_in = 1',
          [],
          (_, { rows }) => {
            resolve(rows.item(0).count > 0);
          },
          (_, error) => {
            console.error('Error checking if user is logged in:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in isUserLoggedIn:', error);
    return false;
  }
};

// Update user profile in both SQLite and MongoDB
export const updateUserProfile = async (userId, profileData) => {
  try {
    // Update local SQLite database
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
      const pendingUpdates = await getPreference('pending_mongo_updates') || '{}';
      const updates = JSON.parse(pendingUpdates);
      updates[userId] = {
        ...profileData,
        timestamp: Date.now()
      };
      await setPreference('pending_mongo_updates', JSON.stringify(updates));
      
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
        await setPreference(`user_achievements_${userId}`, JSON.stringify(mongoUser.achievements || []));
        
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
    // Get basic user from SQLite
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
      achievements: achievements ? JSON.parse(achievements) : [],
      societies: localUser.society ? [localUser.society] : [],
      isFullySynced: false
    };
  } catch (error) {
    console.error('Error getting complete user data:', error);
    return null;
  }
};

// Get data from database (generic function for future use)
export const getDataFromDatabase = async (table, condition = null, limit = 100) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        let query = `SELECT * FROM ${table}`;
        const params = [];
        
        if (condition) {
          query += ` WHERE ${condition.field} = ?`;
          params.push(condition.value);
        }
        
        query += ` LIMIT ${limit}`;
        
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
            console.error(`Error getting data from ${table}:`, error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error(`Error in getDataFromDatabase for ${table}:`, error);
    return [];
  }
};

// Execute a custom query for more complex operations
export const executeQuery = async (query, params = []) => {
  try {
    if (DEBUG_SQL_ENABLED) {
      console.log(`[SQL] Executing query: ${query}`);
      console.log(`[SQL] Parameters:`, params);
    }
    const database = await initDatabase();
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (_, result) => {
            if (DEBUG_SQL_ENABLED) {
              console.log(`[SQL] Query executed successfully: ${query}`);
            }
            resolve(result);
          },
          (_, error) => {
            if (DEBUG_SQL_ENABLED) {
              console.error(`[SQL] Error executing query: ${query}`, error);
            }
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    if (DEBUG_SQL_ENABLED) {
      console.error(`[SQL] Error executing query: ${query}`, error);
    }
    throw error;
  }
};

// Debug flag for database reset - set to 0 to disable, 1 to enable reset
const DEBUG_RESET_FLAG = 0; // Developer can change this to 1 when reset is needed

// Function to retry SQL execution with delay
const retryWithDelay = async (fn, retries = 3, delay = 500) => {
  while (retries > 0) {
    try {
      return await fn();
    } catch (error) {
      if (retries === 1 || !error.message.includes('database table is locked')) {
        throw error;
      }
      console.warn(`[SQL] Retrying due to table lock. Retries left: ${retries - 1}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries--;
    }
  }
};

// Function to reset database based on debug flag (1=reset, 0=skip)
export const resetDatabaseIfUserLoggedIn = async () => {
  try {
    // If flag is 0, don't reset
    if (DEBUG_RESET_FLAG !== 1) {
      console.log('Database reset not performed: Debug flag is 0');
      return {
        success: true,
        message: 'Reset not needed - debug flag is 0',
        resetPerformed: false
      };
    }
    
    console.log('Performing complete database reset based on debug flag');
    
    // Ensure database is initialized (it should already be at this point)
    const database = await initDatabase();
    
    // Get all tables
    const tables = await getAllTableNames(database);
    console.log('Tables to drop:', tables);
    
    // Filter out system tables
    const userTables = tables.filter(table => table !== 'sqlite_sequence');
    
    // Instead of dropping tables one by one, use a single transaction with multiple statements
    // This helps prevent "database table is locked" errors
    try {
      console.log('Starting database reset transaction');
      await new Promise((resolve, reject) => {
        database.transaction(tx => {
          // Drop all user tables in a single transaction
          userTables.forEach(table => {
            console.log(`Queuing drop for table: ${table}`);
            tx.executeSql(
              `DROP TABLE IF EXISTS ${table}`,
              [],
              () => console.log(`Queued drop for table: ${table}`),
              (_, err) => console.warn(`Warning while queuing drop for ${table}:`, err)
            );
          });
        }, 
        async (error) => {
          console.error('Transaction failed:', error);
          console.log('Retrying table drops individually with delay...');
          try {
            for (const table of userTables) {
              await retryWithDelay(() => database.rawExecAsync(`DROP TABLE IF EXISTS ${table}`));
              console.log(`Successfully dropped table: ${table}`);
            }
            resolve();
          } catch (retryError) {
            console.error('Retrying individual table drops failed:', retryError);
            reject(retryError);
          }
        },
        () => {
          console.log('All tables dropped successfully');
          resolve();
        });
      });
    } catch (dropError) {
      console.error('Error during drop tables transaction:', dropError);
      
      // If transaction approach fails, try one more time with a more aggressive approach
      console.log('Trying alternative approach with PRAGMA and individual drops...');
      
      try {
        // Disable foreign keys and journaling temporarily for more reliable drops
        await database.rawExecAsync('PRAGMA foreign_keys = OFF;');
        await database.rawExecAsync('PRAGMA journal_mode = OFF;');
        
        // Add a small delay to ensure settings are applied
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to drop tables individually with retries
        for (const table of userTables) {
          let retries = 3;
          while (retries > 0) {
            try {
              console.log(`Dropping table ${table} (retries left: ${retries})`);
              await database.rawExecAsync(`DROP TABLE IF EXISTS ${table};`);
              console.log(`Successfully dropped table: ${table}`);
              break;
            } catch (err) {
              console.warn(`Error dropping ${table}, retries left: ${retries - 1}`, err);
              retries--;
              if (retries === 0) {
                console.error(`Failed to drop table ${table} after multiple attempts`);
              } else {
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            }
          }
        }
        
        // Re-enable foreign keys
        await database.rawExecAsync('PRAGMA foreign_keys = ON;');
        await database.rawExecAsync('PRAGMA journal_mode = DELETE;');
      } catch (alternativeError) {
        console.error('Alternative drop approach also failed:', alternativeError);
      }
    }
    
    // Reinitialize the tables regardless of whether drop succeeded
    console.log('Reinitializing database tables after reset');
    await initializeTables();
    
    // Verify tables were recreated
    const recreatedTables = await getAllTableNames(database);
    console.log('Recreated tables after reset:', recreatedTables);
    
    // If we have the expected tables, consider it a success
    if (recreatedTables.length >= 5) { // At least our core tables
      return {
        success: true,
        message: 'Database reset completed - tables recreated successfully',
        resetPerformed: true
      };
    } else {
      return {
        success: false,
        message: 'Database reset may be incomplete - some tables might be missing',
        resetPerformed: true,
        recreatedTables
      };
    }
  } catch (error) {
    console.error('Error in resetDatabaseIfUserLoggedIn:', error);
    return {
      success: false,
      message: 'Database reset failed: ' + error.message,
      resetPerformed: false
    };
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
            // Don't rely on rowsAffected property which might be undefined
            // Always consider the update successful unless there's an explicit error
            resolve({ success: true });
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

// Clean up expired OTPs
export const cleanupExpiredOTPs = async () => {
  try {
    const database = await initDatabase();
    const expirationTime = 15 * 60 * 1000; // 15 minutes in milliseconds
    const now = Date.now();

    return retryWithDelay(() => {
      return new Promise((resolve, reject) => {
        database.transaction(tx => {
          tx.executeSql(
            'DELETE FROM otp_verification WHERE created_at < ?',
            [now - expirationTime],
            (_, result) => {
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
    });
  } catch (error) {
    console.error('Error in cleanupExpiredOTPs:', error);
    return { rowsAffected: 0 };
  }
};

// Make sure to init the database on import
initDatabase().catch(error => 
  console.error('Failed to initialize database on import:', error)
);

export default {
  initDatabase,
  setPreference,
  getPreference,
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
  resendOTP,
  authenticateUser,
  getCurrentUser,
  isUserLoggedIn,
  loginUserAfterOTP,
  logoutCurrentUser,
  logoutAllUsers,
  updateUserProfile,
  syncUserWithMongoDB,
  getCompleteUserData,
  getDataFromDatabase,
  executeQuery,
  resetDatabaseIfUserLoggedIn,
  updateUserLoginStatus, // Add this to exports
  cleanupExpiredOTPs // Add this to exports
};