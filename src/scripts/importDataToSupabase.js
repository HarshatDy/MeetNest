/**
 * Import data into Supabase from JSON files
 * Use this alternative if you can't use the SQLite migration
 */

import * as FileSystem from 'expo-file-system';
import { initDatabase, insertUser, setPreference } from '../utils/supabaseDatabase';

// This is a utility function to import JSON data to Supabase
export const importData = async (usersJsonPath, preferencesJsonPath) => {
  console.log('Starting import to Supabase...');
  
  try {
    // Initialize Supabase
    await initDatabase();
    console.log('Supabase connection established');
    
    let users = [];
    let preferences = [];
    
    // Try to read the users JSON file
    if (usersJsonPath) {
      try {
        const usersContent = await FileSystem.readAsStringAsync(usersJsonPath);
        users = JSON.parse(usersContent);
        console.log(`Loaded ${users.length} users from JSON file`);
      } catch (error) {
        console.error('Error reading users JSON file:', error);
      }
    }
    
    // Try to read the preferences JSON file
    if (preferencesJsonPath) {
      try {
        const prefsContent = await FileSystem.readAsStringAsync(preferencesJsonPath);
        preferences = JSON.parse(prefsContent);
        console.log(`Loaded ${preferences.length} preferences from JSON file`);
      } catch (error) {
        console.error('Error reading preferences JSON file:', error);
      }
    }
    
    // Import users to Supabase
    for (const user of users) {
      try {
        await insertUser({
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          password: user.password,
          society: user.society,
          is_logged_in: user.is_logged_in === 1 || user.is_logged_in === true
        });
        console.log(`Imported user: ${user.email}`);
      } catch (error) {
        console.error(`Error importing user ${user.email}:`, error);
      }
    }
    
    // Import preferences to Supabase
    for (const pref of preferences) {
      try {
        let value;
        try {
          value = typeof pref.value === 'string' ? JSON.parse(pref.value) : pref.value;
        } catch {
          value = pref.value;
        }
        
        await setPreference(pref.key, value);
        console.log(`Imported preference: ${pref.key}`);
      } catch (error) {
        console.error(`Error importing preference ${pref.key}:`, error);
      }
    }
    
    console.log('Import completed successfully');
    return { success: true, message: 'Import completed' };
  } catch (error) {
    console.error('Import failed:', error);
    return { success: false, message: `Import failed: ${error.message}` };
  }
};

// Example of how to use:
// importData('./exports/users.json', './exports/preferences.json');

export default {
  importData
};
