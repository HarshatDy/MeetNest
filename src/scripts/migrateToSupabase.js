/**
 * Data migration script from SQLite to Supabase
 * Run this if you need to migrate existing user data
 */

import * as FileSystem from 'expo-file-system';
import { initDatabase, insertUser, setPreference } from '../utils/supabaseDatabase';

// This is a one-time utility function to migrate data from SQLite to Supabase
export const migrateData = async () => {
  console.log('Starting migration from SQLite to Supabase...');
  
  try {
    // Initialize Supabase
    await initDatabase();
    console.log('Supabase connection established');
    
    // Try to open SQLite database to extract data
    const dbDir = `${FileSystem.documentDirectory}SQLite`;
    const dirInfo = await FileSystem.getInfoAsync(dbDir);
    
    if (!dirInfo.exists) {
      console.log('No SQLite database directory found. Nothing to migrate.');
      return { success: true, message: 'No data to migrate' };
    }
    
    console.log('SQLite database found, but direct migration is no longer supported.');
    console.log('Please use the importDataToSupabase tool with JSON files instead.');
    
    return { 
      success: false, 
      message: 'Direct SQLite migration removed. Use importDataToSupabase instead.' 
    };
    
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, message: `Migration failed: ${error.message}` };
  }
};

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateData()
    .then(result => console.log(result.message))
    .catch(error => console.error('Migration error:', error));
}

export default {
  migrateData
};
