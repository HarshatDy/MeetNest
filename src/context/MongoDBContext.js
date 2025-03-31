import React, { createContext, useContext, useState, useEffect } from 'react';
import { connectToDatabase, closeConnection } from '../config/mongodb';
import { Logger } from '../../utils/Logger';

const MongoDBContext = createContext(null);

export function MongoDBProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Connect to MongoDB API when the provider mounts
    const connect = async () => {
      try {
        setIsLoading(true);
        await connectToDatabase();
        setIsConnected(true);
        setError(null);
        Logger.debug('MongoDBContext', 'Connected to MongoDB API');
      } catch (err) {
        Logger.error('MongoDBContext', 'Failed to connect to MongoDB API:', err);
        setError(err.message);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    connect();

    // Close API connection when component unmounts
    return () => {
      closeConnection()
        .then(() => Logger.debug('MongoDBContext', 'MongoDB API connection closed'))
        .catch(err => Logger.error('MongoDBContext', 'Error closing MongoDB API connection:', err));
    };
  }, []);

  return (
    <MongoDBContext.Provider
      value={{
        isConnected,
        isLoading,
        error,
      }}
    >
      {children}
    </MongoDBContext.Provider>
  );
}

export const useMongoDB = () => useContext(MongoDBContext);