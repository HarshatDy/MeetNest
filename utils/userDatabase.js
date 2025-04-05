import { 
  initDatabase, 
  insertDataIntoTable, 
  getDataById, 
  updateDataInTable, 
  deleteDataFromTable,
  getDataFromTable
} from './database';

// User-specific database operations
export const createUser = async (userData) => {
  try {
    // Add created_at and updated_at timestamps
    const now = Date.now();
    const userWithTimestamps = {
      ...userData,
      id: userData.id || 'user_' + Math.random().toString(36).substring(2, 9),
      created_at: now,
      updated_at: now
    };
    
    // Insert into users table
    const result = await insertDataIntoTable('users', userWithTimestamps);
    
    return {
      success: true,
      userId: userWithTimestamps.id
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return {
      success: false,
      message: 'Failed to create user'
    };
  }
};

// Get user by ID
export const getUserById = async (userId) => {
  try {
    const user = await getDataById('users', userId);
    
    if (user) {
      // Don't return the password to client
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
};

// Get user by email
export const getUserByEmail = async (email) => {
  try {
    const users = await getDataFromTable('users', { field: 'email', value: email }, 1);
    
    if (users && users.length > 0) {
      return users[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
};

// Update user profile
export const updateUserProfile = async (userId, userData) => {
  try {
    // Add updated_at timestamp
    const updatedData = {
      ...userData,
      updated_at: Date.now()
    };
    
    // Remove any fields that shouldn't be updated
    delete updatedData.id;
    delete updatedData.email; // Don't allow email change in profile update
    delete updatedData.created_at;
    
    // Update user data
    const result = await updateDataInTable('users', userId, updatedData);
    
    return {
      success: result.rowsAffected > 0,
      message: result.rowsAffected > 0 ? 'Profile updated successfully' : 'User not found'
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return {
      success: false,
      message: 'Failed to update profile'
    };
  }
};

// Update user password
export const updateUserPassword = async (userId, newPassword) => {
  try {
    const result = await updateDataInTable('users', userId, {
      password: newPassword,
      updated_at: Date.now()
    });
    
    return {
      success: result.rowsAffected > 0,
      message: result.rowsAffected > 0 ? 'Password updated successfully' : 'User not found'
    };
  } catch (error) {
    console.error('Error updating password:', error);
    return {
      success: false,
      message: 'Failed to update password'
    };
  }
};

// Delete user account
export const deleteUser = async (userId) => {
  try {
    const result = await deleteDataFromTable('users', userId);
    
    return {
      success: result.rowsAffected > 0,
      message: result.rowsAffected > 0 ? 'Account deleted successfully' : 'User not found'
    };
  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      success: false,
      message: 'Failed to delete account'
    };
  }
};

// Get all users (admin function)
export const getAllUsers = async (limit = 100, offset = 0) => {
  try {
    const users = await getDataFromTable(
      'users', 
      null, 
      limit, 
      { field: 'created_at', direction: 'DESC' }
    );
    
    // Remove passwords from the results
    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
};

// Search users by name
export const searchUsersByName = async (searchTerm, limit = 20) => {
  try {
    const database = await initDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          `SELECT id, email, display_name, society, created_at, updated_at
           FROM users 
           WHERE display_name LIKE ? 
           LIMIT ?`,
          [`%${searchTerm}%`, limit],
          (_, { rows }) => {
            const results = [];
            for (let i = 0; i < rows.length; i++) {
              results.push(rows.item(i));
            }
            resolve(results);
          },
          (_, error) => {
            console.error('Error searching users:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in searchUsersByName:', error);
    return [];
  }
};

export default {
  createUser,
  getUserById,
  getUserByEmail,
  updateUserProfile,
  updateUserPassword,
  deleteUser,
  getAllUsers,
  searchUsersByName
};
