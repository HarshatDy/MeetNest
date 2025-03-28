import React, { createContext, useState, useContext, useEffect } from 'react';
import { Logger } from '../utils/Logger';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState({
    id: '101',
    name: 'John Doe',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    role: 'President',
    society: 'Green Meadows',
    joinDate: '2020-05-12',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    address: 'Tower A, Apt 501',
    isLoggedIn: true
  });
  
  useEffect(() => {
    Logger.debug('UserContext', 'UserProvider initialized', { userId: user.id });
    
    return () => {
      Logger.debug('UserContext', 'UserProvider unmounting');
    };
  }, []);

  const login = (credentials) => {
    // In a real app, you would verify credentials with a backend service
    Logger.userAction('UserContext', 'Login attempt', credentials);
    setUser({
      ...user,
      isLoggedIn: true
    });
    Logger.debug('UserContext', 'User logged in', { userId: user.id });
    return true;
  };

  const logout = () => {
    Logger.userAction('UserContext', 'Logout');
    setUser({
      ...user,
      isLoggedIn: false
    });
    Logger.debug('UserContext', 'User logged out', { userId: user.id });
  };

  const updateProfile = (updates) => {
    Logger.userAction('UserContext', 'Profile update', updates);
    setUser({
      ...user,
      ...updates
    });
    Logger.debug('UserContext', 'Profile updated', { userId: user.id });
  };

  return (
    <UserContext.Provider value={{ user, login, logout, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
};
