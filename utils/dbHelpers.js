/**
 * Helper functions for database operations
 * These functions are specifically designed to work with the expo-sqlite@15.1.3 limitations
 */

import { initDatabase } from './database';

/**
 * Escape a string for use in SQL queries to prevent SQL injection
 * @param {string} str String to escape
 * @returns {string} Escaped string
 */
export const sqlEscape = (str) => {
  if (str === null || str === undefined) return "''";
  return `'${String(str).replace(/'/g, "''")}'`;
};

/**
 * Build a safe SQL insertion query with proper escaping
 * @param {string} table Table name
 * @param {Object} data Object with column:value pairs
 * @returns {string} SQL query string
 */
export const buildInsertQuery = (table, data) => {
  const columns = Object.keys(data).join(', ');
  const values = Object.values(data).map(val => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val ? 1 : 0;
    return sqlEscape(val);
  }).join(', ');
  
  return `INSERT INTO ${table} (${columns}) VALUES (${values})`;
};

/**
 * Execute a direct SQL query without parameters
 * This is a workaround for issues with parameterized queries in some expo-sqlite versions
 */
export const executeDirectQuery = async (query) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          query,
          [],
          (_, result) => resolve(result),
          (_, error) => reject(error)
        );
      });
    });
  } catch (error) {
    console.error(`Error executing direct query: ${query}`, error);
    throw error;
  }
};

/**
 * Set a preference safely using direct SQL
 * @param {string} key Preference key
 * @param {any} value Preference value (will be JSON stringified)
 * @returns {Promise<Object>} Result object
 */
export const setPreferenceSafely = async (key, value) => {
  try {
    if (!key) {
      return { success: false, error: 'Invalid key' };
    }
    
    const database = await initDatabase();
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    // Escape single quotes in both key and value
    const safeKey = key.replace(/'/g, "''");
    const safeValue = jsonValue.replace(/'/g, "''");
    
    const query = `INSERT OR REPLACE INTO preferences (key, value) VALUES ('${safeKey}', '${safeValue}')`;
    
    return await executeDirectQuery(query);
  } catch (error) {
    console.error(`Failed to set preference ${key}:`, error);
    throw error;
  }
};

/**
 * Get a preference safely using direct SQL
 * @param {string} key Preference key
 * @returns {Promise<any>} Preference value or null
 */
export const getPreferenceSafely = async (key) => {
  try {
    if (!key) {
      return null;
    }
    
    const database = await initDatabase();
    const safeKey = key.replace(/'/g, "''");
    
    const query = `SELECT value FROM preferences WHERE key = '${safeKey}'`;
    const result = await new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          query,
          [],
          (_, { rows }) => {
            if (rows.length > 0) {
              try {
                const rawValue = rows.item(0).value;
                let parsedValue;
                
                try {
                  parsedValue = JSON.parse(rawValue);
                } catch (parseError) {
                  parsedValue = rawValue;
                }
                
                resolve(parsedValue);
              } catch (e) {
                console.error(`Error parsing preference for key ${key}:`, e);
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
    
    return result;
  } catch (error) {
    console.error(`Failed to get preference ${key}:`, error);
    return null;
  }
};

export default {
  sqlEscape,
  buildInsertQuery,
  executeDirectQuery
};
