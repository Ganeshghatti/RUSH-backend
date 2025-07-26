import crypto from "crypto";

/**
 * Generate a 6-digit alphanumeric OTP
 * @returns {string} - 6-character OTP containing uppercase letters and numbers
 */
export const generateOTP = (): string => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let otp = "";

  for (let i = 0; i < 6; i++) {
    const randomIndex = crypto.randomInt(0, characters.length);
    otp += characters[randomIndex];
  }

  return otp;
};

/**
 * Validate if OTP format is correct
 * @param {string} otp - OTP to validate
 * @returns {boolean} - True if valid format
 */
export const isValidOTPFormat = (otp: string): boolean => {
  const otpRegex = /^[A-Z0-9]{6}$/;
  return otpRegex.test(otp);
};

/**
 * Check if OTP has expired
 * @param {Date} expiresAt - OTP expiration date
 * @returns {boolean} - True if expired
 */
export const isOTPExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt;
};

/**
 * Get OTP expiration time (24 hours from generation)
 * @returns {Date} - Expiration date
 */
export const getOTPExpirationTime = (): Date => {
  const expirationTime = new Date();
  expirationTime.setHours(expirationTime.getHours() + 24);
  return expirationTime;
};

/**
 * Check if maximum OTP attempts have been reached
 * @param {number} attempts - Current attempts
 * @param {number} maxAttempts - Maximum allowed attempts
 * @returns {boolean} - True if max attempts reached
 */
export const isMaxAttemptsReached = (
  attempts: number,
  maxAttempts: number = 3
): boolean => {
  return attempts >= maxAttempts;
};
