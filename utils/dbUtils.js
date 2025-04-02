import { initDatabase } from './database';

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
        updated_at: Date.now()
      }
    ];
    
    // Insert users
    await Promise.all(users.map(async (user) => {
      try {
        await db.transaction(tx => {
          tx.executeSql(
            `INSERT OR IGNORE INTO users 
             (id, email, display_name, password, society, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              user.id, 
              user.email, 
              user.display_name, 
              user.password, 
              user.society, 
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

export default {
  createTestData
};
