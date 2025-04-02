import * as database from './database';

// Function to create test data
export const createTestData = async () => {
  // Insert a test user
  try {
    // Demo user for testing
    const demoUser = {
      id: 'demo_user_1',
      email: 'demo@example.com',
      display_name: 'Demo User',
      password: 'password', // In a real app, this would be hashed
      society: 'Demo Society'
    };

    // Check if user already exists
    const existingUser = await database.getUserByEmail(demoUser.email);
    if (!existingUser) {
      await database.insertUser(demoUser);
      console.log('Demo user created successfully');
    } else {
      console.log('Demo user already exists');
    }

    // Create some test posts
    const posts = [
      {
        id: 'post_1',
        title: 'Welcome to Neighborly',
        content: 'This is a test post about our community app.',
        authorId: demoUser.id,
        timestamp: Date.now()
      },
      {
        id: 'post_2',
        title: 'Community Meeting',
        content: 'We are having a community meeting this weekend at 10am.',
        authorId: demoUser.id,
        timestamp: Date.now() - 1000 * 60 * 60 * 24 // 1 day ago
      }
    ];

    await database.cachePosts(posts);
    console.log('Test posts created successfully');

    return true;
  } catch (error) {
    console.error('Error creating test data:', error);
    return false;
  }
};

// Function to reset database (for testing/development)
export const resetDatabase = async () => {
  try {
    const db = await database.initDatabase();
    
    // Drop all tables
    const tables = [
      'users',
      'preferences',
      'posts_cache',
      'draft_posts',
      'otp_verification'
    ];

    for (const table of tables) {
      await db.rawExecAsync(`DROP TABLE IF EXISTS ${table}`);
    }

    // Reinitialize tables
    await database.initDatabase();
    console.log('Database reset successfully');
    return true;
  } catch (error) {
    console.error('Error resetting database:', error);
    return false;
  }
};

// Function to perform database backup
export const backupDatabase = async () => {
  try {
    const db = await database.initDatabase();
    
    // Get all tables
    const tables = [
      'users',
      'preferences',
      'posts_cache',
      'draft_posts',
      'otp_verification'
    ];

    const backup = {};
    
    // For each table, get all data
    for (const table of tables) {
      const data = await database.getDataFromDatabase(table);
      backup[table] = data;
    }

    // Store backup data in preferences
    await database.setPreference('database_backup', {
      timestamp: Date.now(),
      data: backup
    });

    console.log('Database backup created successfully');
    return backup;
  } catch (error) {
    console.error('Error backing up database:', error);
    return null;
  }
};

// Export database operations
export default {
  createTestData,
  resetDatabase,
  backupDatabase
};
