/**
 * Compatibility module to redirect database calls to Supabase
 * All functions now import from supabaseDatabase to ensure compatibility
 */

import * as supabaseDatabase from './supabaseDatabase';

// Re-export all functions from supabaseDatabase
export const {
  initDatabase,
  setPreference,
  getPreference,
  storeOTP,
  verifyUserOTP,
  resendUserOTP,
  resendOTP,
  cleanupVerifiedOTP,
  insertUser,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  updateUserPassword,
  cachePosts,
  getCachedPosts,
  saveDraftPost,
  getDraftPosts,
  deleteDraftPost,
  createUserAccount,
  verifyOTP,
  authenticateUser,
  loginUserAfterOTP,
  logoutAllUsers,
  logoutCurrentUser,
  getCurrentUser,
  isUserLoggedIn,
  updateUserProfile,
  syncUserWithMongoDB,
  getCompleteUserData,
  getDataFromDatabase,
  executeQuery,
  updateUserLoginStatus,
  cleanupExpiredOTPs
} = supabaseDatabase;

// Log migration warning when this module is imported
console.warn(
  'Warning: Using deprecated database.js module. ' +
  'Please update your imports to use supabaseDatabase.js directly.'
);

export default supabaseDatabase;