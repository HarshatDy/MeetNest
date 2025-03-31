import * as SQLite from 'expo-sqlite';

// Open the database with the correct API for the current expo-sqlite version
let db = null;

// Detect and use the appropriate SQLite API
try {
  // For expo-sqlite version 11.0.0 and later (async version)
  if (SQLite.openDatabaseAsync) {
    // We need to handle this asynchronously
    console.log('Using SQLite.openDatabaseAsync API (newer version)');
    
    // Initialize a temporary object until async initialization completes
    db = {
      _isInitializing: true,
      transaction: function() {
        console.error('Database still initializing, please wait');
        return Promise.reject(new Error('Database still initializing'));
      }
    };
    
    // Start async initialization
    (async () => {
      try {
        const realDb = await SQLite.openDatabaseAsync('neighborly.db');
        
        // When initialization completes, replace our temporary object with the real one
        if (realDb && typeof realDb.transactionAsync === 'function') {
          // For newer versions using transactionAsync
          db = {
            transaction: (callback, errorCallback, successCallback) => {
              realDb.transactionAsync(async (tx) => {
                return callback(tx);
              })
              .then(() => successCallback && successCallback())
              .catch((error) => errorCallback && errorCallback(error));
            },
            // Expose the original async methods too
            transactionAsync: realDb.transactionAsync.bind(realDb),
            _rawDatabase: realDb
          };
          console.log('Database initialized successfully with transactionAsync');
        } else if (realDb && typeof realDb.transaction === 'function') {
          // If it has a direct transaction method
          db = realDb;
          console.log('Database initialized successfully with direct transaction');
        } else {
          console.error('Opened database does not have transaction methods');
          throw new Error('Incompatible SQLite implementation');
        }
        
        // Initialize tables once we have a working db
        initializeTables().catch(err => console.error('Failed to initialize tables:', err));
      } catch (error) {
        console.error('Async database initialization failed:', error);
        setupMockDatabase();
      }
    })();
  }
  // For expo-sqlite before version 11 (sync version)
  else if (SQLite.openDatabase) {
    db = SQLite.openDatabase('neighborly.db');
    console.log('SQLite database opened with SQLite.openDatabase');
    
    // Verify db was properly initialized
    if (!db || typeof db.transaction !== 'function') {
      throw new Error('Database initialization failed: transaction method not available');
    }
    
    // Initialize tables immediately for sync version
    initializeTables().catch(err => console.error('Failed to initialize tables:', err));
  } 
  // Other possible APIs
  else if (SQLite.createDatabase) {
    db = SQLite.createDatabase('neighborly.db');
    console.log('SQLite database opened with createDatabase');
    
    if (!db || typeof db.transaction !== 'function') {
      throw new Error('Database initialization failed: transaction method not available');
    }
    
    initializeTables().catch(err => console.error('Failed to initialize tables:', err));
  } 
  // Fallback approaches
  else if (SQLite.default) {
    // Handle cases where the default export is the function
    if (typeof SQLite.default === 'function') {
      db = SQLite.default('neighborly.db');
      console.log('SQLite database opened with SQLite.default as a function');
    } else if (SQLite.default.openDatabase) {
      db = SQLite.default.openDatabase('neighborly.db');
      console.log('SQLite database opened with SQLite.default.openDatabase');
    }
    
    if (!db || typeof db.transaction !== 'function') {
      throw new Error('Database initialization failed: transaction method not available');
    }
    
    initializeTables().catch(err => console.error('Failed to initialize tables:', err));
  } else {
    throw new Error('No compatible SQLite API found');
  }
} catch (error) {
  console.error('Error opening SQLite database:', error);
  setupMockDatabase();
}

function setupMockDatabase() {
  console.warn('Setting up mock database - storage functionality will be limited');
  // Create a mock DB object to prevent app crashes
  db = {
    transaction: (callback, errorCallback, successCallback) => {
      console.warn('Using mock database - storage functionality is disabled');
      // Mock transaction that does nothing but successfully resolves
      setTimeout(() => successCallback && successCallback(), 0);
      return Promise.resolve({
        executeSql: () => Promise.resolve({ rows: { length: 0, item: () => null } })
      });
    }
  };
}

// Separate function to initialize database tables
function initializeTables() {
  return new Promise((resolve, reject) => {
    try {
      if (!db || typeof db.transaction !== 'function') {
        console.error('Database not properly initialized for table creation');
        reject(new Error('Database not properly initialized'));
        return;
      }

      db.transaction(tx => {
        // Create user preferences table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS preferences (
            id INTEGER PRIMARY KEY NOT NULL,
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
      }, (error) => {
        console.error('Database transaction error:', error);
        reject(error);
      }, () => {
        console.log('Database tables initialized successfully');
        resolve();
      });
    } catch (error) {
      console.error('Database initialization error:', error);
      reject(error);
    }
  });
}

// Initialize the database - exposed for external calls if needed
export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    // If we're using the async API and still initializing, wait a bit
    if (db && db._isInitializing) {
      console.log('Database is still initializing, waiting...');
      setTimeout(() => initDatabase().then(resolve).catch(reject), 500);
      return;
    }
    
    try {
      if (!db || typeof db.transaction !== 'function') {
        console.error('Database not properly initialized');
        reject(new Error('Database not properly initialized'));
        return;
      }

      // We have a valid db object, so just initialize tables
      initializeTables().then(resolve).catch(reject);
    } catch (error) {
      console.error('Database initialization failed:', error);
      reject(error);
    }
  });
};

// The rest of your database functions remain unchanged

// Set a preference
export const setPreference = (key, value) => {
  return new Promise((resolve, reject) => {
    if (!db || typeof db.transaction !== 'function') {
      console.warn('Database not available for setting preference');
      reject(new Error('Database not available'));
      return;
    }
    
    db.transaction(tx => {
      tx.executeSql(
        'INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)',
        [key, JSON.stringify(value)],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

// Get a preference
export const getPreference = (key) => {
  return new Promise((resolve, reject) => {
    if (!db || typeof db.transaction !== 'function') {
      console.warn('Database not available for getting preference');
      reject(new Error('Database not available'));
      return;
    }

    db.transaction(tx => {
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
};

// Cache posts
export const cachePosts = (posts) => {
  return new Promise((resolve, reject) => {
    if (!db || typeof db.transaction !== 'function') {
      console.warn('Database not available for caching posts');
      reject(new Error('Database not available'));
      return;
    }

    const now = Date.now();
    
    db.transaction(tx => {
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
};

// Get cached posts
export const getCachedPosts = () => {
  return new Promise((resolve, reject) => {
    if (!db || typeof db.transaction !== 'function') {
      console.warn('Database not available for retrieving cached posts');
      reject(new Error('Database not available'));
      return;
    }

    db.transaction(tx => {
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
};

// Save draft post
export const saveDraftPost = (post) => {
  return new Promise((resolve, reject) => {
    if (!db || typeof db.transaction !== 'function') {
      console.warn('Database not available for saving draft post');
      reject(new Error('Database not available'));
      return;
    }

    const now = Date.now();
    const id = post.id || `draft_${now}`;
    db.transaction(tx => {
      tx.executeSql(
        'INSERT OR REPLACE INTO draft_posts (id, data, timestamp) VALUES (?, ?, ?)',
        [id, JSON.stringify(post), now],
        (_, result) => resolve({ ...post, id }),
        (_, error) => reject(error)
      );
    });
  });
};

// Get all draft posts
export const getDraftPosts = () => {
  return new Promise((resolve, reject) => {
    if (!db || typeof db.transaction !== 'function') {
      console.warn('Database not available for retrieving draft posts');
      reject(new Error('Database not available'));
      return;
    }

    db.transaction(tx => {
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
};

// Delete draft post
export const deleteDraftPost = (id) => {
  return new Promise((resolve, reject) => {
    if (!db || typeof db.transaction !== 'function') {
      console.warn('Database not available for deleting draft post');
      reject(new Error('Database not available'));
      return;
    }
    
    db.transaction(tx => {
      tx.executeSql(
        'DELETE FROM draft_posts WHERE id = ?',
        [id],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

export default db;