import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

// Database reference - will be initialized asynchronously
let db = null;
let dbInitPromise = null;

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
    }, reject, resolve);
  });
}

// Keep existing database functions but make them async
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

// Make sure to init the database on import
initDatabase().catch(error => 
  console.error('Failed to initialize database on import:', error)
);

export default {
  initDatabase,
  setPreference,
  getPreference,
  cachePosts,
  getCachedPosts,
  saveDraftPost,
  getDraftPosts,
  deleteDraftPost
};