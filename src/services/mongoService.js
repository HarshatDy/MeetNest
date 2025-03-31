// Updated service that uses our API client instead of direct MongoDB connections
import apiClient from './apiClient';

// User operations
export async function getUser(userId) {
  try {
    return await apiClient.getUser(userId);
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

export async function createUser(userData) {
  try {
    return await apiClient.createUser(userData);
  } catch (error) {
    console.error('Error creating user:', error);
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
