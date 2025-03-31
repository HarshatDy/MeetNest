import apiClient from '../services/apiClient';
import env from './env';

// Database name
const dbName = env.dbName || 'neighborly';

// Connection state
let isConnected = false;

// Connect to MongoDB via the API
export async function connectToDatabase() {
  if (isConnected) {
    return { db: dbName };
  }

  try {
    // Test connection by making a simple API call
    await apiClient.getUser('test-connection');
    isConnected = true;
    console.log('Connected to MongoDB API');
    return { db: dbName };
  } catch (error) {
    console.error('Failed to connect to MongoDB API', error);
    throw error;
  }
}

// Close connection (for API approach, this is a no-op)
export async function closeConnection() {
  if (isConnected) {
    isConnected = false;
    console.log('Disconnected from MongoDB API');
  }
}

// These functions are maintained for API compatibility with existing code
// but they now use the API client instead of direct MongoDB access

// Get collection via API
export function getCollection(collectionName) {
  return {
    find: async (query) => {
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