import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

/**
 * Hashes a password with a random salt
 * @param password The plain text password to hash
 * @returns Object containing the hashed password and salt
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hash = await bcrypt.hash(password, salt);
  return { hash, salt };
}

/**
 * Verifies a password against a hash and salt
 * @param password The plain text password to verify
 * @param hash The hashed password to verify against
 * @param salt The salt used for hashing
 * @returns Boolean indicating if the password is valid
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword === hash;
}

/**
 * Generates a random OTP (One-Time Password)
 * @param length Length of the OTP (default: 6)
 * @returns The generated OTP string
 */
export function generateOTP(length = 6): string {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }
  
  return otp;
}

/**
 * Calculates the expiration time for OTPs
 * @param minutes Number of minutes until expiration (default: 10)
 * @returns Expiration date
 */
export function getOTPExpiry(minutes = 10): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
}

/**
 * Generates a secure random token
 * @param length Length of the token in bytes (default: 32)
 * @returns Hex-encoded token string
 */
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
