// Updated service that uses our API client instead of direct MongoDB connections
import apiClient from './apiClient';

// User operations
export async function getUser(userId) {
  try {
    const response = await apiClient.getUser(userId);
    return response.user;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

export async function createUser(userData) {
  try {
    const response = await apiClient.createUser(userData);
    return response;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUser(userId, userData) {
  try {
    const response = await apiClient.updateUser(userId, userData);
    return response;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export async function deleteUser(userId) {
  try {
    const response = await apiClient.deleteUser(userId);
    return response;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

// User authentication
export async function loginUser(credentials) {
  try {
    const response = await apiClient.loginUser(credentials);
    return response;
  } catch (error) {
    console.error('Error logging in user:', error);
    throw error;
  }
}

export async function verifyUserEmail(userId, verificationCode) {
  try {
    const response = await apiClient.verifyUserEmail(userId, verificationCode);
    return response;
  } catch (error) {
    console.error('Error verifying user email:', error);
    throw error;
  }
}

// Tournament operations
export async function getTournamentResult(tournamentId) {
  try {
    return await apiClient.getTournamentResult(tournamentId);
  } catch (error) {
    console.error('Error getting tournament result:', error);
    throw error;
  }
}

export async function createTournamentResult(tournamentId, resultData) {
  try {
    return await apiClient.createTournamentResult(tournamentId, resultData);
  } catch (error) {
    console.error('Error creating tournament result:', error);
    throw error;
  }
}

// Leaderboard calculation now via API
export async function calculateLeaderboard(societyId, timeframe) {
  try {
    return await apiClient.getLeaderboard(societyId, timeframe);
  } catch (error) {
    console.error('Error calculating leaderboard:', error);
    throw error;
  }
}

export async function createPost(postData) {
  try {
    return await apiClient.createPost(postData);
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}
  
export async function getPosts(societyId, limit = 20, lastPostTimestamp = null) {
  try {
    // Pass lastPostTimestamp as query param if needed
    const params = lastPostTimestamp ? 
      `societyId=${societyId}&limit=${limit}&before=${lastPostTimestamp}` : 
      `societyId=${societyId}&limit=${limit}`;
      
    return await apiClient.getPosts(societyId, limit);
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
}
  
// Events methods
export async function getEvents(status, societyId) {
  try {
    return await apiClient.getEvents(status, societyId);
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
}

// Utility method to get user with cached fallback
export async function getUserWithCacheFallback(userId) {
  try {
    // Try to get from MongoDB first
    return await getUser(userId);
  } catch (error) {
    console.warn(`Falling back to cache for user ${userId}:`, error.message);
    
    // If MongoDB is unavailable, try to get from local cache
    try {
      const { getUserById } = require('../utils/database');
      const localUser = await getUserById(userId);
      
      if (localUser) {
        // Convert SQLite format to MongoDB format
        return {
          _id: localUser.id,
          email: localUser.email,
          displayName: localUser.display_name,
          societies: localUser.society ? [localUser.society] : [],
          points: 0,
          achievements: []
        };
      }
      return null;
    } catch (cacheError) {
      console.error('Cache fallback failed:', cacheError);
      return null;
    }
  }
}

export default {
  getUser,
  createUser,
  updateUser,
  deleteUser,
  loginUser,
  verifyUserEmail,
  getUserWithCacheFallback,
  getTournamentResult,
  createTournamentResult,
  calculateLeaderboard,
  createPost,
  getPosts,
  getEvents
};
