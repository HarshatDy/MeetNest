import * as SQLite from 'expo-sqlite';

// Try different ways to open the database to handle Expo SDK 52 compatibility
let db;
try {
  // First try the named export
  if (typeof SQLite.openDatabase === 'function') {
    db = SQLite.openDatabase('neighborly.db');
    console.log('SQLite database opened with named export');
  } else {
    // Fall back to default export
    db = SQLite('neighborly.db');
    console.log('SQLite database opened with default export');
  }
} catch (error) {
  console.error('Error opening SQLite database:', error);
  // Create a mock DB object to prevent app crashes
  db = {
    transaction: () => ({
      executeSql: () => {},
    }),
  };
}

// Initialize the database
export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    try {
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
        console.log('Database initialized successfully');
        resolve();
      });
    } catch (error) {
      console.error('Database initialization error:', error);
      reject(error);
    }
  });
};

// Set a preference
export const setPreference = (key, value) => {
  return new Promise((resolve, reject) => {
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
    db.transaction(tx => {
      tx.executeSql(
        'SELECT value FROM preferences WHERE key = ?',
        [key],
        (_, { rows }) => {
          if (rows.length > 0) {
            try {
              resolve(JSON.parse(rows.item(0).value));
            } catch (e) {
              resolve(rows.item(0).value);
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
    }, reject, resolve);
  });
};

// Get cached posts
export const getCachedPosts = () => {
  return new Promise((resolve, reject) => {
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