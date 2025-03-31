import { auth } from '../config/firebase';
import { createUser, getUser } from './mongoService';

// Sign up with email and password
export async function signUp(email, password, displayName) {
  try {
    // Create Firebase user
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const { uid } = userCredential.user;
    
    // Update Firebase display name
    await userCredential.user.updateProfile({ displayName });
    
    // Create user in MongoDB
    await createUser({
      _id: uid,
      email,
      displayName,
      societies: [],
      points: 0,
      achievements: []
    });
    
    return userCredential.user;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
}

// Get the current user with MongoDB data
export async function getCurrentUserWithMongoDB() {
  const firebaseUser = auth.currentUser;
  
  if (!firebaseUser) {
    return null;
  }
  
  try {
    // Get additional user data from MongoDB
    const mongoUser = await getUser(firebaseUser.uid);
    
    return {
      ...firebaseUser,
      mongoData: mongoUser || {},
    };
  } catch (error) {
    console.error('Error getting current user data:', error);
    return firebaseUser;
  }
}