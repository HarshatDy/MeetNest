import apiClient from '../services/apiClient.js';
import env from './env';

// Database name
const dbName = env.dbName || 'neighborly';

// Connection state
let isConnected = false;
let connectionRetries = 0;
const MAX_RETRIES = 3;

// Connect to MongoDB via the API
export async function connectToDatabase() {
  if (isConnected) {
    return { db: dbName };
  }

  try {
    // Test connection by making a simple API call
    await apiClient.getUser('test-connection');
    isConnected = true;
    connectionRetries = 0; // Reset retry count on successful connection
    console.log('Connected to MongoDB API');
    return { db: dbName };
  } catch (error) {
    connectionRetries++;
    console.error(`Failed to connect to MongoDB API (Attempt ${connectionRetries}/${MAX_RETRIES})`, error);
    
    if (connectionRetries < MAX_RETRIES) {
      console.log('Retrying connection in 2 seconds...');
      // Wait 2 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
      return connectToDatabase(); // Retry connection
    }
    
    console.error('Maximum connection retries reached. Falling back to offline mode.');
    throw new Error('Failed to connect to API after multiple attempts');
  }
}

// Close connection (for API approach, this is a no-op)
export async function closeConnection() {
  if (isConnected) {
    isConnected = false;
    connectionRetries = 0;
    console.log('Disconnected from MongoDB API');
  }
}

// These functions are maintained for API compatibility with existing code
// but they now use the API client instead of direct MongoDB access

// Get collection via API
export function getCollection(collectionName) {
  return {
    find: async (query) => {
      // Check connection status first
      if (!isConnected) {
        console.warn('Attempting to use MongoDB API while disconnected');
        
        // Try to reconnect if not connected
        try {
          await connectToDatabase();
        } catch (error) {
          throw new Error('Cannot access collection: API is offline');
        }
      }
      
      // Map collection names to API endpoints
      switch(collectionName) {
        case 'users':
          return apiClient.getUser(query.id || 'default');
        case 'posts':
          return apiClient.getPosts(query.societyId || 'default');
        case 'tournaments':
          return apiClient.getTournaments();
        default:
          throw new Error(`Collection ${collectionName} not supported via API`);
      }
    },
    insertOne: async (document) => {
      // Check connection status first
      if (!isConnected) {
        console.warn('Attempting to use MongoDB API while disconnected');
        
        // Try to reconnect if not connected
        try {
          await connectToDatabase();
        } catch (error) {
          throw new Error('Cannot insert document: API is offline');
        }
      }
      
      // Map collection names to API endpoints
      switch(collectionName) {
        case 'users':
          return apiClient.createUser(document);
        case 'posts':
          return apiClient.createPost(document);
        default:
          throw new Error(`Collection ${collectionName} not supported via API`);
      }
    }
  };
}

// This is just a placeholder - no actual client anymore
export const client = {
  db: () => ({
    collection: getCollection
  })
};