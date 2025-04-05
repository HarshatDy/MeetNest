import React, { createContext, useState, useContext, useEffect } from 'react';
import { testConnection } from '../services/apiClient';
import { Logger } from '../../utils/Logger';

const MongoDBContext = createContext();

export const useMongoDb = () => useContext(MongoDBContext);

export const MongoDBProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setIsLoading(true);
        const result = await testConnection();
        setIsConnected(true);
        setLastSyncTime(new Date());
        Logger.debug('MongoDBContext', 'MongoDB connection successful', result);

        // Fetch and print all users from MongoDB
        const { getAllUsers } = require('../services/mongoService');
        const users = await getAllUsers();
        if (users.length === 0) {
          console.warn('[MongoDBContext] No users fetched. Possibly offline or server issue.');
        } else {
          console.log('[MongoDBContext] All users from MongoDB:', users);
        }
      } catch (error) {
        setIsConnected(false);
        Logger.error('MongoDBContext', 'MongoDB connection failed', error.message);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();

    // Set up periodic connection check
    const interval = setInterval(checkConnection, 5 * 60 * 1000); // every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Function to manually retry connection
  const retryConnection = async () => {
    try {
      setIsLoading(true);
      const result = await testConnection();
      setIsConnected(true);
      setLastSyncTime(new Date());
      Logger.debug('MongoDBContext', 'MongoDB connection successful on retry', result);
      return true;
    } catch (error) {
      setIsConnected(false);
      Logger.error('MongoDBContext', 'MongoDB connection retry failed', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to force sync pending changes
  const syncPendingChanges = async () => {
    try {
      if (!isConnected) {
        const connected = await retryConnection();
        if (!connected) {
          return {
            success: false,
            message: 'Cannot sync: MongoDB connection not available'
          };
        }
      }

      const { getPreference, setPreference } = require('../utils/database');
      const pendingUpdates = await getPreference('pending_mongo_updates');
      
      if (!pendingUpdates) {
        return {
          success: true,
          message: 'No pending changes to sync'
        };
      }
      
      const updates = JSON.parse(pendingUpdates);
      const { updateUser } = require('../services/mongoService');
      
      // Process each pending update
      const updatePromises = Object.entries(updates).map(async ([userId, userData]) => {
        try {
          await updateUser(userId, userData);
          return userId;
        } catch (error) {
          Logger.error('MongoDBContext', `Failed to sync updates for user ${userId}`, error);
          throw error;
        }
      });
      
      const syncedUserIds = await Promise.all(updatePromises);
      
      // Remove synced users from pending updates
      const newPendingUpdates = { ...updates };
      syncedUserIds.forEach(userId => {
        delete newPendingUpdates[userId];
      });
      
      await setPreference('pending_mongo_updates', Object.keys(newPendingUpdates).length > 0 
        ? JSON.stringify(newPendingUpdates) 
        : null);
      
      setLastSyncTime(new Date());
      
      return {
        success: true,
        message: `Synced ${syncedUserIds.length} pending updates`
      };
    } catch (error) {
      Logger.error('MongoDBContext', 'Failed to sync pending changes', error);
      return {
        success: false,
        message: 'Failed to sync pending changes: ' + error.message
      };
    }
  };

  return (
    <MongoDBContext.Provider value={{ 
      isConnected, 
      isLoading, 
      lastSyncTime,
      retryConnection,
      syncPendingChanges
    }}>
      {children}
    </MongoDBContext.Provider>
  );
};

export default MongoDBProvider;