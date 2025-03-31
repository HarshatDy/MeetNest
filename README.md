# Neighborly App

## Backend API Setup Instructions

This app uses a Firebase Functions backend to communicate with MongoDB, instead of connecting directly from the React Native app. This approach solves the Node.js dependency issue in React Native.

### Setting Up the Backend

1. Install dependencies in the functions directory:
   ```
   cd functions
   npm install
   ```

2. Set up environment variables for MongoDB:
   - For local development, a `.env.local` file has been created
   - For production, set these environment variables in Firebase:
     ```
     firebase functions:config:set mongodb.uri="your-mongodb-uri" mongodb.dbname="your-db-name"
     ```

3. Start the Firebase emulators to test locally:
   ```
   npm run serve
   ```
   This will start the Functions emulator, typically at http://localhost:5001

4. Deploy to Firebase when ready:
   ```
   npm run deploy
   ```

5. After deployment, update the production API URL in `src/config/env.js` with your Firebase project ID:
   ```javascript
   production: {
     apiUrl: 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api',
     // other config...
   }
   ```

### Running the React Native App

1. Install dependencies:
   ```
   npm install
   ```

2. Start the Expo development server:
   ```
   npm start
   ```

3. Open the app on your device or emulator

## Architecture Overview

### API Backend (Firebase Functions)
- Express.js server with RESTful API endpoints 
- MongoDB connection using the official Node.js driver
- Handles all database operations (create, read, update, delete)

### React Native App
- Communicates with the backend API via fetch requests
- No direct MongoDB connections in the app code
- Uses the apiClient service to abstract API communication

## Available Endpoints

- **Users**: `/api/users`
- **Posts**: `/api/posts`
- **Tournaments**: `/api/tournaments`
- **Events**: `/api/events`
- **Leaderboard**: `/api/leaderboard`

## Troubleshooting

If you encounter connection issues:
1. Check that your MongoDB connection string is correct
2. Ensure the Firebase Functions are deployed and running
3. Verify network connectivity from your device to the API

For detailed error logs:
- Check Firebase Functions logs: `firebase functions:log`
- Review your app console logs