import { Logger } from './Logger';

// Mock function to simulate sending an email
// In a real app, this would use a service like SendGrid, Mailgun, etc.
export const sendOTPEmail = async (email, otp) => {
  try {
    Logger.debug('EmailService', 'Sending OTP email', { email });
    
    // In development, log the OTP to console
    if (__DEV__) {
      console.log(`[DEV MODE] Email to: ${email}, OTP: ${otp}`);
    }
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Pretend we successfully sent the email
    Logger.debug('EmailService', 'OTP email sent successfully');
    return { success: true };
  } catch (error) {
    Logger.error('EmailService', 'Failed to send OTP email', error);
    return { success: false, error };
  }
};
