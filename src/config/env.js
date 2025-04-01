// Environment configuration that works in React Native
// Replace with your actual environment variables

const ENV = {
  development: {
    // Use the deployed API URL instead of local emulator to avoid connection issues
    apiUrl: 'https://us-central1-meetnest-67b2b.cloudfunctions.net/api',
    mongoDbUri: 'mongodb+srv://dhanayatharshat:1QKAGyDWzkUi9UV0@meetnestv0.j9j7rft.mongodb.net/',
    dbName: 'meetnest_v0',
    // Add other development environment variables here
  },
  production: {
    apiUrl: 'https://us-central1-meetnest-67b2b.cloudfunctions.net/api', // Firebase Functions deployed URL
    mongoDbUri: 'mongodb+srv://dhanayatharshat:1QKAGyDWzkUi9UV0@meetnestv0.j9j7rft.mongodb.net/',
    dbName: 'meetnest_v0',
    // Add other production environment variables here
  }
};

// Set the current environment
const currentEnv = __DEV__ ? 'development' : 'production';

// Export the variables for the current environment
export default ENV[currentEnv];