import { initDatabase } from '../src/utils/database';
import * as database from '../src/utils/database';

/**
 * Creates test data for development purposes
 */
export const createTestData = async () => {
  try {
    console.log('Creating test data for development mode...');
    const db = await initDatabase();
    
    // Create sample users
    const users = [
      {
        id: 'user_test1',
        email: 'test@example.com',
        display_name: 'Test User',
        password: 'password123',
        society: 'Test Society',
        created_at: Date.now(),
        updated_at: Date.now(),
        is_logged_in: 0
      }
    ];
    
    // Insert users
    await Promise.all(users.map(async (user) => {
      try {
        await db.transaction(tx => {
          tx.executeSql(
            `INSERT OR IGNORE INTO users 
             (id, email, display_name, password, society, is_logged_in, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              user.id, 
              user.email, 
              user.display_name, 
              user.password, 
              user.society,
              user.is_logged_in,
              user.created_at, 
              user.updated_at
            ]
          );
        });
      } catch (err) {
        console.warn('Could not insert test user:', err);
      }
    }));
    
    console.log('Test data creation completed');
    return true;
  } catch (error) {
    console.error('Error creating test data:', error);
    return false;
  }
};

// Function to check and reset database based on debug flag
export const checkAndResetDatabase = async () => {
  try {
    console.log('Checking if database reset is needed via debug flag...');
    
    // Ensure database is initialized first
    await database.initDatabase();
    
    // Then attempt reset if needed
    const result = await database.resetDatabaseIfUserLoggedIn();
    
    console.log('Reset database check result:', result);
    return result.resetPerformed;
  } catch (error) {
    console.error('Error checking database reset condition:', error);
    return false;
  }
};

export default {
  createTestData,
  checkAndResetDatabase
};
