"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMaxAttemptsReached = exports.getOTPExpirationTime = exports.isOTPExpired = exports.isValidOTPFormat = exports.generateOTP = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generate a 6-digit alphanumeric OTP
 * @returns {string} - 6-character OTP containing uppercase letters and numbers
 */
const generateOTP = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let otp = "";
    for (let i = 0; i < 6; i++) {
        const randomIndex = crypto_1.default.randomInt(0, characters.length);
        otp += characters[randomIndex];
    }
    return otp;
};
exports.generateOTP = generateOTP;
/**
 * Validate if OTP format is correct
 * @param {string} otp - OTP to validate
 * @returns {boolean} - True if valid format
 */
const isValidOTPFormat = (otp) => {
    const otpRegex = /^[A-Z0-9]{6}$/;
    return otpRegex.test(otp);
};
exports.isValidOTPFormat = isValidOTPFormat;
/**
 * Check if OTP has expired
 * @param {Date} expiresAt - OTP expiration date
 * @returns {boolean} - True if expired
 */
const isOTPExpired = (expiresAt) => {
    return new Date() > expiresAt;
};
exports.isOTPExpired = isOTPExpired;
/**
 * Get OTP expiration time (24 hours from generation)
 * @returns {Date} - Expiration date
 */
const getOTPExpirationTime = () => {
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 24);
    return expirationTime;
};
exports.getOTPExpirationTime = getOTPExpirationTime;
/**
 * Check if maximum OTP attempts have been reached
 * @param {number} attempts - Current attempts
 * @param {number} maxAttempts - Maximum allowed attempts
 * @returns {boolean} - True if max attempts reached
 */
const isMaxAttemptsReached = (attempts, maxAttempts = 3) => {
    return attempts >= maxAttempts;
};
exports.isMaxAttemptsReached = isMaxAttemptsReached;
