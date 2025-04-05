import { supabase } from './supabaseClient';

// Required tables based on our SQLite schema
const REQUIRED_TABLES = ['users', 'preferences', 'posts_cache', 'draft_posts', 'otp_verification'];

/**
 * Verify that all required tables exist in the Supabase database
 * @returns {Promise<object>} Result of the schema check
 */
export const verifySchema = async () => {
  try {
    console.log('Verifying Supabase schema...');
    
    const missingTables = [];
    
    // Check each required table
    for (const tableName of REQUIRED_TABLES) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .limit(1);
          
        if (error) {
          console.error(`Table '${tableName}' check failed:`, error.message);
          missingTables.push(tableName);
        } else {
          console.log(`Table '${tableName}' exists with ${count || 0} records`);
        }
      } catch (tableError) {
        console.error(`Error checking table '${tableName}':`, tableError);
        missingTables.push(tableName);
      }
    }
    
    if (missingTables.length > 0) {
      return {
        complete: false,
        missingTables,
        message: `Missing tables: ${missingTables.join(', ')}. Please run initSupabaseSchema.sql script.`
      };
    }
    
    console.log('All required tables exist in Supabase');
    return { complete: true, message: 'Schema validation successful' };
  } catch (error) {
    console.error('Error verifying Supabase schema:', error);
    return {
      complete: false,
      error: error.message,
      message: 'Failed to verify schema: ' + error.message
    };
  }
};

/**
 * Check if schema version matches expected version
 * @returns {Promise<boolean>} True if schema version is current
 */
export const isSchemaVersionCurrent = async (expectedVersion = '1.0') => {
  try {
    const { data, error } = await supabase
      .from('preferences')
      .select('value')
      .eq('key', 'schema_version')
      .single();
      
    if (error || !data) {
      return false;
    }
    
    return data.value === expectedVersion;
  } catch (error) {
    console.error('Error checking schema version:', error);
    return false;
  }
};

export default {
  verifySchema,
  isSchemaVersionCurrent
};
