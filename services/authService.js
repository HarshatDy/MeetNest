import AsyncStorage from '@react-native-async-storage/async-storage';

export const getUserSession = async () => {
  try {
    const session = await AsyncStorage.getItem('userSession');
    return session ? JSON.parse(session) : null;
  } catch (error) {
    console.error('Error fetching user session:', error);
    return null;
  }
};

export const fetchUserDetails = async (userId) => {
  try {
    // Replace with actual API call to fetch user details
    const response = await fetch(`https://api.example.com/users/${userId}`);
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error('Failed to fetch user details');
    }
  } catch (error) {
    console.error('Error fetching user details:', error);
    return null;
  }
};

export const sendOTP = async (phoneNumber) => {
  try {
    // Replace with actual API call to send OTP
    const response = await fetch('https://api.example.com/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error sending OTP:', error);
    return false;
  }
};
