// API client for communicating with the backend
import env from '../config/env';
import { Platform } from 'react-native';

// Use the API URL from environment configuration
const API_BASE_URL = env.apiUrl;
const REQUEST_TIMEOUT = 15000; // 15 seconds timeout

/**
 * Check if the device is online
 * @returns {Promise<boolean>} - Whether the device is online
 */
async function isOnline() {
  try {
    if (Platform.OS === 'web') {
      return navigator.onLine;
    } else {
      // Simple connectivity check for mobile
      return true;
      // For proper network state detection, you should install and use:
      // import NetInfo from '@react-native-community/netinfo';
      // const state = await NetInfo.fetch();
      // return state.isConnected;
    }
  } catch (e) {
    console.warn('Error checking network status:', e);
    return true; // Assume online on error
  }
}

/**
 * Make an API request with timeout and better error handling
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {object} data - Request body for POST/PUT requests
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<any>} - Response data
 */
async function apiRequest(endpoint, method = 'GET', data = null, timeout = REQUEST_TIMEOUT) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Check for internet connectivity first
  const online = await isOnline();
  if (!online) {
    throw new Error('Network connection unavailable. Please check your internet connection.');
  }
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      // Add auth header if you implement authentication
      // 'Authorization': `Bearer ${await getAuthToken()}`,
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    // Create a promise that rejects after the timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout);
    });
    
    // Race between the fetch and the timeout
    const response = await Promise.race([
      fetch(url, options),
      timeoutPromise
    ]);
    
    // Parse response data
    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
      try {
        // Try to parse as JSON anyway in case content-type is wrong
        responseData = JSON.parse(responseData);
      } catch (e) {
        // Keep as text if it's not valid JSON
      }
    }
    
    if (!response.ok) {
      const errorMessage = 
        (responseData && responseData.error) || 
        `API Error: ${response.status}${responseData ? ' - ' + JSON.stringify(responseData) : ''}`;
      throw new Error(errorMessage);
    }
    
    return responseData;
  } catch (error) {
    console.error(`API ${method} ${endpoint} failed:`, error);
    
    // Enhance error message based on the error type
    if (error.message === 'Network request failed') {
      error.message = 'Network request failed. Server might be unavailable or check your internet connection.';
    }
    
    throw error;
  }
}

// User endpoints
export async function getUser(userId) {
  return apiRequest(`/api/users/${userId}`);
}

export async function createUser(userData) {
  return apiRequest('/api/users', 'POST', userData);
}

export async function updateUser(userId, userData) {
  return apiRequest(`/api/users/${userId}`, 'PUT', userData);
}

export async function deleteUser(userId) {
  return apiRequest(`/api/users/${userId}`, 'DELETE');
}

export async function loginUser(credentials) {
  return apiRequest('/api/users/login', 'POST', credentials);
}

export async function verifyUserEmail(userId, verificationCode) {
  return apiRequest('/api/users/verify-email', 'POST', { userId, verificationCode });
}

// Posts endpoints
export async function getPosts(societyId = 'default', limit = 20) {
  return apiRequest(`/api/posts?societyId=${societyId}&limit=${limit}`);
}

export async function createPost(postData) {
  return apiRequest('/api/posts', 'POST', postData);
}

// Tournaments endpoints
export async function getTournaments() {
  return apiRequest('/api/tournaments');
}

export async function getTournamentResult(tournamentId) {
  return apiRequest(`/api/tournaments/${tournamentId}/results`);
}

export async function createTournamentResult(tournamentId, resultData) {
  return apiRequest(`/api/tournaments/${tournamentId}/results`, 'POST', resultData);
}

// Leaderboard endpoints
export async function getLeaderboard(societyId, timeframe = 'month') {
  return apiRequest(`/api/leaderboard?societyId=${societyId}&timeframe=${timeframe}`);
}

// Events endpoints
export async function getEvents(status, societyId) {
  return apiRequest(`/api/events?status=${status}&societyId=${societyId}`);
}

// Test API connection - used to verify connectivity
export async function testConnection() {
  try {
    const result = await apiRequest('/api/health', 'GET', null, 5000); // Faster timeout for health check
    return {
      success: true,
      serverTime: result?.serverTime || new Date().toISOString(),
      apiUrl: API_BASE_URL
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      apiUrl: API_BASE_URL
    };
  }
}

export default {
  getUser,
  createUser,
  updateUser,
  deleteUser,
  loginUser,
  verifyUserEmail,
  getPosts,
  createPost,
  getTournaments,
  getTournamentResult,
  createTournamentResult,
  getLeaderboard,
  getEvents,
  testConnection
};