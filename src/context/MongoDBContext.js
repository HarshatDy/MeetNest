import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { connectToDatabase, closeConnection } from '../config/mongodb';
import { Logger } from '../../utils/Logger';
import apiClient from '../services/apiClient';

const MongoDBContext = createContext(null);

const RETRY_DELAY = 5000; // 5 seconds between retries

export function MongoDBProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [retryTimerId, setRetryTimerId] = useState(null);

  // Function to connect to MongoDB API
  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Try to connect
      await connectToDatabase();
      
      // Success - update state
      setIsConnected(true);
      setOfflineMode(false);
      setError(null);
      setRetryAttempt(0);
      Logger.debug('MongoDBContext', 'Connected to MongoDB API');
      
      // Clear any retry timers
      if (retryTimerId) {
        clearTimeout(retryTimerId);
        setRetryTimerId(null);
      }
    } catch (err) {
      Logger.error('MongoDBContext', 'Failed to connect to MongoDB API:', err);
      setError(err.message);
      setIsConnected(false);
      
      // After 3 failed attempts, switch to offline mode
      if (retryAttempt >= 2) {
        Logger.warn('MongoDBContext', 'Switching to offline mode after failed connection attempts');
        setOfflineMode(true);
      } else {
        // Schedule another retry
        const timerId = setTimeout(() => {
          setRetryAttempt(prev => prev + 1);
          connect();
        }, RETRY_DELAY);
        setRetryTimerId(timerId);
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryAttempt, retryTimerId]);
  
  // Try to reconnect manually (can be called from UI)
  const reconnect = useCallback(() => {
    // Reset state and trigger new connection
    setRetryAttempt(0);
    setOfflineMode(false);
    connect();
  }, [connect]);
  
  // Check API status
  const checkApiStatus = useCallback(async () => {
    try {
      const status = await apiClient.testConnection();
      return status;
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }, []);

  useEffect(() => {
    // Connect to MongoDB API when the provider mounts
    connect();

    // Close API connection when component unmounts
    return () => {
      if (retryTimerId) {
        clearTimeout(retryTimerId);
      }
      
      closeConnection()
        .then(() => Logger.debug('MongoDBContext', 'MongoDB API connection closed'))
        .catch(err => Logger.error('MongoDBContext', 'Error closing MongoDB API connection:', err));
    };
  }, [connect, retryTimerId]);

  return (
    <MongoDBContext.Provider
      value={{
        isConnected,
        isLoading,
        error,
        offlineMode,
        reconnect,
        checkApiStatus,
        retryAttempt
      }}
    >
      {children}
    </MongoDBContext.Provider>
  );
}

export const useMongoDB = () => useContext(MongoDBContext);