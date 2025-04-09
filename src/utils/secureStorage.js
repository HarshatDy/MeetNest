import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants for storage keys
export const STORAGE_KEYS = {
  USER_DATA: 'user_data',
  AUTH_TOKEN: 'auth_token',
  USER_ID: 'user_id',
  USER_EMAIL: 'user_email',
  USER_PREFERENCES: 'user_preferences',
};

/**
 * Check if SecureStore is available on the current platform
 * Falls back to AsyncStorage on web or when SecureStore is not available
 */
const isSecureStoreAvailable = () => {
  return Platform.OS !== 'web';
};

/**
 * Save data securely
 * @param {string} key - The storage key
 * @param {any} value - The value to store (will be JSON stringified)
 * @returns {Promise<boolean>} - Success status
 */
export const saveSecurely = async (key, value) => {
  try {
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (isSecureStoreAvailable()) {
      await SecureStore.setItemAsync(key, jsonValue);
    } else {
      // Fallback to AsyncStorage on web
      await AsyncStorage.setItem(key, jsonValue);
    }
    
    console.log(`[secureStorage][saveSecurely] Data saved securely for key: ${key}`);
    return true;
  } catch (error) {
    console.error(`[secureStorage][saveSecurely] Error saving data for key: ${key}`, error);
    return false;
  }
};

/**
 * Get data from secure storage
 * @param {string} key - The storage key
 * @returns {Promise<any>} - The stored value or null if not found
 */
export const getSecurely = async (key) => {
  try {
    let jsonValue;
    
    if (isSecureStoreAvailable()) {
      jsonValue = await SecureStore.getItemAsync(key);
    } else {
      // Fallback to AsyncStorage on web
      jsonValue = await AsyncStorage.getItem(key);
    }
    
    if (!jsonValue) return null;
    
    try {
      return JSON.parse(jsonValue);
    } catch (parseError) {
      // If parsing fails, return the raw value
      return jsonValue;
    }
  } catch (error) {
    console.error(`[secureStorage][getSecurely] Error retrieving data for key: ${key}`, error);
    return null;
  }
};

/**
 * Remove data from secure storage
 * @param {string} key - The storage key
 * @returns {Promise<boolean>} - Success status
 */
export const removeSecurely = async (key) => {
  try {
    if (isSecureStoreAvailable()) {
      await SecureStore.deleteItemAsync(key);
    } else {
      // Fallback to AsyncStorage on web
      await AsyncStorage.removeItem(key);
    }
    
    console.log(`[secureStorage][removeSecurely] Data removed securely for key: ${key}`);
    return true;
  } catch (error) {
    console.error(`[secureStorage][removeSecurely] Error removing data for key: ${key}`, error);
    return false;
  }
};

/**
 * Save user data securely
 * @param {Object} userData - User data object
 * @returns {Promise<boolean>} - Success status
 */
export const saveUserData = async (userData) => {
  try {
    if (!userData) {
      console.error('[secureStorage][saveUserData] Cannot save empty user data');
      return false;
    }
    
    // Store complete user data object
    await saveSecurely(STORAGE_KEYS.USER_DATA, userData);
    
    // Also store individual critical fields for quick access
    if (userData.id) {
      await saveSecurely(STORAGE_KEYS.USER_ID, userData.id);
    }
    
    if (userData.email) {
      await saveSecurely(STORAGE_KEYS.USER_EMAIL, userData.email);
    }
    
    return true;
  } catch (error) {
    console.error('[secureStorage][saveUserData] Error saving user data', error);
    return false;
  }
};

/**
 * Get user data from secure storage
 * @returns {Promise<Object|null>} - User data or null if not found
 */
export const getUserData = async () => {
  try {
    return await getSecurely(STORAGE_KEYS.USER_DATA);
  } catch (error) {
    console.error('[secureStorage][getUserData] Error getting user data', error);
    return null;
  }
};

/**
 * Clear all user data from secure storage
 * @returns {Promise<boolean>} - Success status
 */
export const clearUserData = async () => {
  try {
    await removeSecurely(STORAGE_KEYS.USER_DATA);
    await removeSecurely(STORAGE_KEYS.USER_ID);
    await removeSecurely(STORAGE_KEYS.USER_EMAIL);
    await removeSecurely(STORAGE_KEYS.AUTH_TOKEN);
    
    console.log('[secureStorage][clearUserData] User data cleared successfully');
    return true;
  } catch (error) {
    console.error('[secureStorage][clearUserData] Error clearing user data', error);
    return false;
  }
};

/**
 * Save authentication token
 * @param {string} token - Authentication token
 * @returns {Promise<boolean>} - Success status
 */
export const saveAuthToken = async (token) => {
  return await saveSecurely(STORAGE_KEYS.AUTH_TOKEN, token);
};

/**
 * Get authentication token
 * @returns {Promise<string|null>} - Auth token or null if not found
 */
export const getAuthToken = async () => {
  return await getSecurely(STORAGE_KEYS.AUTH_TOKEN);
};

/**
 * Save user preferences
 * @param {Object} preferences - User preferences object
 * @returns {Promise<boolean>} - Success status
 */
export const saveUserPreferences = async (preferences) => {
  return await saveSecurely(STORAGE_KEYS.USER_PREFERENCES, preferences);
};

/**
 * Get user preferences
 * @returns {Promise<Object|null>} - User preferences or null if not found
 */
export const getUserPreferences = async () => {
  return await getSecurely(STORAGE_KEYS.USER_PREFERENCES);
};

export default {
  saveSecurely,
  getSecurely,
  removeSecurely,
  saveUserData,
  getUserData,
  clearUserData,
  saveAuthToken,
  getAuthToken,
  saveUserPreferences,
  getUserPreferences,
  STORAGE_KEYS
};
