// Updated service that uses our API client instead of direct MongoDB connections
import apiClient from './apiClient';

// User operations
export async function getUser(userId) {
  try {
    console.log(`[mongoService][getUser] Attempting to get user with ID: ${userId}`);
    
    // Get all users first to debug what's available
    const allUsers = await getAllUsers();
    console.log(`[mongoService][getUser] All available users in MongoDB:`, 
      allUsers.map(user => ({ _id: user._id, id: user.id, email: user.email })));
    
    // Prioritize _id for querying - check if userId matches any user's _id
    const userByMongoId = allUsers.find(user => user._id && user._id.toString() === userId);
    
    if (userByMongoId) {
      console.log(`[mongoService][getUser] Found user by _id: ${userId}`);
      return userByMongoId;
    }
    
    // Fallback to id field if not found by _id
    const userById = allUsers.find(user => user.id && user.id.toString() === userId);
    if (userById) {
      console.log(`[mongoService][getUser] Found user by id: ${userId}`);
      return userById;
    }
    
    console.log(`[mongoService][getUser] Calling API to get user with ID: ${userId}`);
    // Call API with the userId - the API should prioritize _id field
    const response = await apiClient.getUser(userId);
    return response.user;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

// New function to get all users from MongoDB
export async function getAllUsers() {
  try {
    const users = await apiClient.getAllUsers();
    return users;
  } catch (error) {
    console.error('[mongoService][getAllUsers] Error fetching all users:', error.message);
    return []; // Return an empty array to avoid breaking the app
  }
}

export async function createUser(userData) {
  try {
    // Ensure id field is properly set if not already present
    if (!userData.id && userData._id) {
      userData.id = userData._id.toString();
    }
    
    const response = await apiClient.createUser(userData);
    
    // Ensure the returned user has both _id and id properly set
    if (response.user && response.user._id && !response.user.id) {
      response.user.id = response.user._id.toString();
    }
    
    return response;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUser(userId, userData) {
  try {
    // Ensure we're using the correct ID field - prioritize _id
    const idToUse = userId;
    
    // Ensure id field is consistent with _id if present in update data
    if (userData._id && !userData.id) {
      userData.id = userData._id.toString();
    }
    
    const response = await apiClient.updateUser(idToUse, userData);
    
    // Ensure the returned user has both _id and id properly set
    if (response.user && response.user._id && !response.user.id) {
      response.user.id = response.user._id.toString();
    }
    
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
    console.log('[mongoService][createPost] Attempting to create post with data:', 
      JSON.stringify({
        title: postData.title,
        content: postData.content,
        type: postData.type,
        authorId: postData.authorId,
        // Omit large path data to avoid console flooding
        hasPath: !!postData.activityData?.path
      })
    );

    // Ensure authorId is valid - check both possible formats
    if (!postData.authorId) {
      console.error('[mongoService][createPost] Missing authorId in post data');
      throw new Error('Author ID is required to create a post');
    }

    // Log the full authorId for debugging ID format issues
    console.log('[mongoService][createPost] Author ID format:', {
      authorId: postData.authorId,
      type: typeof postData.authorId,
      isObjectId: typeof postData.authorId === 'string' && 
                  /^[0-9a-fA-F]{24}$/.test(postData.authorId)
    });

    // Call the API endpoint
    const response = await apiClient.createPost(postData);
    console.log('[mongoService][createPost] Successfully created post:', 
      JSON.stringify(response));
    
    return response;
  } catch (error) {
    console.error('[mongoService][createPost] Error creating post:', error);
    // Enhanced error object with more context
    throw {
      message: error.message || 'Failed to create post',
      originalError: error,
      context: {
        endpoint: '/api/posts',
        method: 'POST',
        dataProvided: {
          hasAuthorId: !!postData.authorId,
          hasTitle: !!postData.title,
          hasContent: !!postData.content,
          hasActivityData: !!postData.activityData,
          hasPath: !!postData.activityData?.path
        }
      }
    };
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
  
// Utility function to get events with society filter and status
export async function getEvents(status, societyId = 'default') {
  try {
    console.log('[mongoService][getEvents] Fetching events with params:', { status, societyId });
    // Build the query parameters
    let queryParams = `societyId=${societyId}`;
    if (status && status !== 'all') {
      queryParams += `&status=${status}`;
    }
    
    // Make the API request
    const response = await apiClient.getEvents(queryParams);
    console.log('[mongoService][getEvents] Fetched events:', response?.length || 0);
    return response || [];
  } catch (error) {
    console.error('[mongoService][getEvents] Error fetching events:', error.message);
    return []; // Return empty array instead of throwing to prevent UI crashes
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

export async function fetchUsers() {
  try {
    const users = await getAllUsers();
    console.log('[mongoService][fetchUsers] Fetched users:', users);
    return users;
  } catch (error) {
    console.error('[mongoService][fetchUsers] Error fetching users:', error.message);
    throw error;
  }
}

// Society operations
export async function getSocieties() {
  try {
    console.log('[mongoService][getSocieties] Fetching all societies');
    const societies = await apiClient.getSocieties();
    console.log(`[mongoService][getSocieties] Successfully fetched ${societies.length} societies`);
    return societies;
  } catch (error) {
    console.error('[mongoService][getSocieties] Error fetching societies:', error);
    return []; // Return empty array instead of throwing to prevent UI crashes
  }
}

export async function createSociety(societyData) {
  try {
    console.log('[mongoService][createSociety] Creating new society:', 
      JSON.stringify({
        name: societyData.name,
        description: societyData.description,
        location: societyData.location,
        createdBy: societyData.createdBy
      })
    );
    
    const response = await apiClient.createSociety(societyData);
    console.log('[mongoService][createSociety] Society created successfully:', 
      JSON.stringify({
        _id: response._id,
        name: response.name
      })
    );
    return response;
  } catch (error) {
    console.error('[mongoService][createSociety] Error creating society:', error);
    throw error;
  }
}

export async function joinSociety(userId, societyId) {
  try {
    console.log(`[mongoService][joinSociety] User ${userId} joining society ${societyId}`);
    
    // Call the API to join society
    const response = await apiClient.joinSociety(userId, societyId);
    
    // Update the user locally to reflect the change
    const user = await getUser(userId);
    if (user) {
      // Add society to user's societies array if it doesn't exist already
      if (!user.societies) {
        user.societies = [societyId];
      } else if (!user.societies.includes(societyId)) {
        user.societies.push(societyId);
      }
      
      // Update the user in MongoDB
      await updateUser(userId, user);
    }
    
    console.log(`[mongoService][joinSociety] User ${userId} successfully joined society ${societyId}`);
    return response;
  } catch (error) {
    console.error(`[mongoService][joinSociety] Error joining society:`, error);
    throw error;
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
  getEvents,
  getAllUsers, // Add the new function to exports
  fetchUsers,
  getSocieties,
  createSociety,
  joinSociety,
};
