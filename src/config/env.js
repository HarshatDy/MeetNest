// Environment configuration that works in React Native
// Replace with your actual environment variables

const ENV = {
  development: {
    apiUrl: 'http://localhost:5001/your-project/us-central1/api', // Firebase Functions local emulator URL
    mongoDbUri: 'mongodb+srv://dhanayatharshat:1QKAGyDWzkUi9UV0@meetnestv0.j9j7rft.mongodb.net/',
    dbName: 'meetnest_v0',
    // Add other development environment variables here
  },
  production: {
    apiUrl: 'https://us-central1-your-project.cloudfunctions.net/api', // Replace with your deployed Firebase Functions URL
    mongoDbUri: 'mongodb+srv://your-production-connection-string',
    dbName: 'neighborly',
    // Add other production environment variables here
  }
};

// Set the current environment
const currentEnv = __DEV__ ? 'development' : 'production';

// Export the variables for the current environment
export default ENV[currentEnv];