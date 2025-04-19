/**
 * Utility to check API connectivity and configuration
 */
import { Platform } from 'react-native';
import env from '../src/config/env';
import { Logger } from './Logger';

// Get API URL from environment configuration
const API_BASE_URL = env.apiUrl;

/**
 * Checks the API connection configuration
 */
export const checkApiConfiguration = async () => {
  Logger.debug('ApiConnectionCheck', 'Checking API configuration');
  
  // Check if API URL is configured correctly
  if (!API_BASE_URL) {
    Logger.error('ApiConnectionCheck', 'API URL is not configured', { 
      apiUrl: API_BASE_URL, 
      env: JSON.stringify(env) 
    });
    return {
      success: false,
      error: 'API URL is not configured'
    };
  }
  
  Logger.debug('ApiConnectionCheck', 'API URL configuration', { apiUrl: API_BASE_URL });
  
  try {
    // Try to make a simple ping request to test the connection
    Logger.debug('ApiConnectionCheck', 'Testing connection to API server...');
    
    // Set a short timeout for the ping request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      Logger.error('ApiConnectionCheck', 'API health check failed', { 
        status: response.status, 
        statusText: response.statusText 
      });
      return {
        success: false,
        error: `API health check failed: ${response.status} ${response.statusText}`
      };
    }
    
    const data = await response.json();
    Logger.debug('ApiConnectionCheck', 'API health check successful', { data });
    
    return {
      success: true,
      data
    };
  } catch (error) {
    Logger.error('ApiConnectionCheck', 'API connection test failed', { 
      error: error.message,
      platform: Platform.OS,
      apiUrl: API_BASE_URL
    });
    
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Run this on app startup to verify API connectivity
 */
export const verifyApiOnStartup = async () => {
  try {
    const result = await checkApiConfiguration();
    if (!result.success) {
      // Use debug instead of warn
      Logger.debug('ApiConnectionCheck', 'API verification failed on startup', { 
        error: result.error 
      });
      return false;
    }
    
    // Use debug instead of info
    Logger.debug('ApiConnectionCheck', 'API connection verified successfully');
    return true;
  } catch (error) {
    Logger.error('ApiConnectionCheck', 'Error during API startup verification', { error });
    return false;
  }
};

export default {
  checkApiConfiguration,
  verifyApiOnStartup
};
