// API client for communicating with the backend
import env from '../config/env';

// Use the API URL from environment configuration
const API_BASE_URL = env.apiUrl;

/**
 * Make an API request
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {object} data - Request body for POST/PUT requests
 * @returns {Promise<any>} - Response data
 */
async function apiRequest(endpoint, method = 'GET', data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  
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
    const response = await fetch(url, options);
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.error || `API Error: ${response.status}`);
    }
    
    return responseData;
  } catch (error) {
    console.error(`API ${method} ${endpoint} failed:`, error);
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

export default {
  getUser,
  createUser,
  getPosts,
  createPost,
  getTournaments,
  getTournamentResult,
  createTournamentResult,
  getLeaderboard,
  getEvents
};