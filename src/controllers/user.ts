import { Request, Response } from "express";
import { supabase } from "../utils/supabase.js";
import { prisma } from "../utils/prisma.js";
import { generateToken } from "../utils/jwt.js";
import { generateOTP, sendOTPEmail } from "../utils/email.js";
import { addMinutes } from 'date-fns';
import { redis, OTPData } from "../utils/redis.js";

export const handleGoogleSignIn = async (req: Request, res: Response) => {
  try {
    const { 
      email, 
      name, 
      photoUrl, 
      fcmToken, 
      deviceInfo = 'mobile',
      googleId, // Google's unique user ID
      token // Google ID token for verification if needed
    } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email is required' 
      });
    }

    // Check if user exists with this email
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        fcmTokens: {
          where: { token: fcmToken || '' },
          select: { id: true }
        }
      }
    });

    // If user doesn't exist, create them with auto-generated ID
    if (!user) {
      user = await prisma.user.create({
        data: {
          // Let Prisma generate the ID
          email,
          name: name || email.split('@')[0],
          photoUrl: photoUrl || null,
          provider: 'google',
          role: 'USER',
          // Password is not required for OAuth users
        },
        include: {
          fcmTokens: {
            where: { token: fcmToken || '' },
            select: { id: true }
          }
        }
      });
    } else {
      // Update existing user with Google data if needed
      if (!user.provider) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleId || user.googleId,
            photoUrl: photoUrl || user.photoUrl,
            provider: 'google',
            // Don't override name if it already exists
            name: user.name || name || email.split('@')[0],
          },
          include: {
            fcmTokens: {
              where: { token: fcmToken || '' },
              select: { id: true }
            }
          }
        });
      }
    }

    // Save FCM token if provided and not already saved
    if (fcmToken && user && (!user.fcmTokens || user.fcmTokens.length === 0)) {
      try {
        // First try to find if the token exists for any user
        const existingToken = await prisma.fCMToken.findFirst({
          where: { token: fcmToken }
        });

        if (existingToken) {
          // Update if it belongs to current user, otherwise create a new one
          if (existingToken.userId === user.id) {
            await prisma.fCMToken.update({
              where: { id: existingToken.id },
              data: { deviceInfo: deviceInfo || 'mobile' }
            });
          } else {
            await prisma.fCMToken.create({
              data: {
                token: fcmToken,
                userId: user.id,
                deviceInfo: deviceInfo || 'mobile',
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
          }
        } else {
          await prisma.fCMToken.create({
            data: {
              token: fcmToken,
              userId: user.id,
              deviceInfo: deviceInfo || 'mobile',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
      } catch (error) {
        console.error('Error saving FCM token:', error);
        // Continue even if FCM token save fails
      }
    }

    // Ensure user has fcmTokens property
    const userWithFcmTokens = {
      ...user,
      fcmTokens: user?.fcmTokens || []
    };

    // Generate JWT token for the user
    const authToken = generateToken({
      userId: userWithFcmTokens.id,
      email: userWithFcmTokens.email,
      role: userWithFcmTokens.role
    });

    // Return user data without sensitive information
    const userData = {
      id: userWithFcmTokens.id,
      email: userWithFcmTokens.email,
      name: userWithFcmTokens.name,
      photoUrl: userWithFcmTokens.photoUrl,
      role: userWithFcmTokens.role,
      provider: userWithFcmTokens.provider || 'email'
    };

    return res.json({
      success: true,
      token: authToken,
      user: userData
    });

  } catch (error) {
    console.error('Google sign-in error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ 
      success: false,
      error: 'Failed to process Google sign-in',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};

export const signUp = async (req: Request, res: Response) => {
  try {
    const { email, password, name, fcmToken, deviceInfo = 'web', verificationToken } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Check if verification token is valid
    const storedOTP = await redis.getOTP(email);
    if (!storedOTP || 
        !storedOTP.verified || 
        storedOTP.verificationToken !== verificationToken ||
        storedOTP.purpose !== 'signup') {
      return res.status(400).json({
        success: false,
        error: 'Email verification required. Please verify your email first.',
      });
    }

    // Check if verification is still valid (e.g., within 30 minutes of verification)
    const verificationExpiry = 30 * 60 * 1000; // 30 minutes in milliseconds
    const verifiedAt = storedOTP.verifiedAt ? new Date(storedOTP.verifiedAt) : null;
    if (!verifiedAt || Date.now() - verifiedAt.getTime() > verificationExpiry) {
      return res.status(400).json({
        success: false,
        error: 'Email verification has expired. Please verify your email again.',
      });
    }

    // Check if user already exists (double-check)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already in use',
      });
    }

    // Create user in Supabase Auth
    const { data: authUser, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.SUPABASE_EMAIL_REDIRECT_URL || 'http://localhost:3000/auth/callback',
        data: {
          name: name || email.split('@')[0],
        },
      },
    });

    if (signUpError) {
      console.error('Supabase signup error:', signUpError);
      return res.status(400).json({
        success: false,
        error: signUpError.message || 'Failed to create user',
      });
    }

    if (!authUser.user) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create user',
      });
    }

    // Create user in our database
    const user = await prisma.user.create({
      data: {
        id: authUser.user.id,
        email,
        name: name || email.split('@')[0],
        provider: 'email',
        role: 'USER',
        emailVerified: true, // Mark as verified since we've already verified via OTP
      },
    });
    
    // Clean up the OTP after successful signup
    await redis.deleteOTP(email);

    // Save FCM token if provided
    if (fcmToken) {
      try {
        await prisma.fCMToken.upsert({
          where: { token: fcmToken },
          update: { userId: user.id, deviceInfo },
          create: {
            token: fcmToken,
            userId: user.id,
            deviceInfo,
          },
        });
      } catch (error) {
        console.error('Error saving FCM token:', error);
        // Continue with registration even if FCM token save fails
      }
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        token,
      },
      message: 'User registered successfully. Please check your email to verify your account.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const signIn = async (req: Request, res: Response) => {
  try {
    const { email, password, fcmToken, deviceInfo = 'web' } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Sign in error:', authError);
      
      // Handle specific error cases
      if (authError.message.toLowerCase().includes('invalid login credentials')) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }
      
      if (authError.message.toLowerCase().includes('email not confirmed')) {
        return res.status(403).json({
          success: false,
          error: 'Email not verified',
          message: 'Please verify your email before signing in.',
          requiresConfirmation: true
        });
      }

      return res.status(401).json({
        success: false,
        error: authError.message || 'Failed to sign in',
      });
    }

    // Get user from our database
    const user = await prisma.user.findUnique({
      where: { id: authData.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      // This shouldn't happen if signup flow is working correctly
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found in the database. Please sign up first.',
      });
    }


    // Check if email is verified in Supabase
    if (!authData.user.email_confirmed_at) {
      return res.status(403).json({
        success: false,
        error: 'Email not verified',
        message: 'Please verify your email before signing in.',
        requiresConfirmation: true
      });
    }

    // Save FCM token if provided
    if (fcmToken) {
      try {
        await prisma.fCMToken.upsert({
          where: { token: fcmToken },
          update: { 
            userId: user.id, 
            deviceInfo,
            updatedAt: new Date()
          },
          create: {
            token: fcmToken,
            userId: user.id,
            deviceInfo,
          },
        });
      } catch (error) {
        console.error('Error updating FCM token:', error);
        // Continue with login even if FCM token update fails
      }
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Return user data and token
    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Sign in error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const signOut = async (req: Request, res: Response) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user?.id;

    // Validate user is authenticated
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        message: 'You must be logged in to sign out.',
      });
    }

    // Sign out from Supabase Auth
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error('Supabase sign out error:', signOutError);
      // Continue with local sign out even if Supabase sign out fails
    }

    // Remove FCM token if provided
    if (fcmToken) {
      try {
        await prisma.fCMToken.deleteMany({
          where: {
            userId,
            token: fcmToken,
          },
        });
      } catch (error) {
        console.error('Error removing FCM token during sign out:', error);
        // Continue with sign out even if FCM token removal fails
      }
    }

    // Clear any session cookies if using cookies for auth
    res.clearCookie('sb-access-token');
    res.clearCookie('sb-refresh-token');

    return res.json({
      success: true,
      message: 'Signed out successfully',
    });
  } catch (error) {
    console.error('Sign out error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while signing out',
    });
  }
};

export const getSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user with additional data from Prisma
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            chats: true,
            fcmTokens: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Get session error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { name } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // 1. Update in Supabase
    const { error: updateError } = await supabase.auth.updateUser({
      data: { name }
    });

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // 2. Update in Prisma
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's FCM tokens
export const getFCMTokens = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tokens = await prisma.fCMToken.findMany({
      where: { userId },
      select: {
        id: true,
        token: true,
        deviceInfo: true,
        createdAt: true
      }
    });

    return res.status(200).json({ tokens });
  } catch (error) {
    console.error('Get FCM tokens error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check if an account with the given email exists
 * @route GET /api/user/check-email
 * @param {string} email - The email to check
 * @returns {Promise<{ exists: boolean }>} Whether the email exists in the system
 */
export const checkEmailExists = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    // Validate input
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email is required and must be a string',
      });
    }

    // Check if email exists in our database
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
        provider: true,
      },
    });

    if (!user) {
      return res.json({
        success: true,
        exists: false,
        message: 'No account found with this email address.',
      });
    }

    // Check if email is verified in Supabase
    let isEmailVerified = user.emailVerified;
    
    // If not verified in our DB, double check with Supabase
    if (!isEmailVerified) {
      try {
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id);
        if (!authError && authUser.user?.email_confirmed_at) {
          // Update our database if Supabase shows the email is confirmed
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
          });
          isEmailVerified = true;
        }
      } catch (error) {
        console.error('Error checking email verification status with Supabase:', error);
        // Continue with existing value if there's an error
      }
    }

    return res.json({
      success: true,
      exists: true,
      data: {
        email: user.email,
        name: user.name,
        provider: user.provider,
        emailVerified: isEmailVerified,
      },
    });
  } catch (error) {
    console.error('Check email exists error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while checking the email',
    });
  }
};

export const resendConfirmationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    // Check if user exists in our database
    const user = await prisma.user.findUnique({
      where: { email },
      select: { 
        id: true, 
        emailVerified: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No account found with this email address.',
      });
    }

    // Check if email is already confirmed
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email already verified',
        message: 'This email has already been verified.',
      });
    }

    // Resend confirmation email using Supabase Auth
    const { error: supabaseError } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: process.env.SUPABASE_EMAIL_REDIRECT_URL || 'http://localhost:3000/auth/callback',
      },
    });

    if (supabaseError) {
      console.error('Supabase resend confirmation error:', supabaseError);
      
      // Handle specific error cases
      if (supabaseError.message.includes('already confirmed')) {
        // Update our database to reflect the confirmed status
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true },
        });
        
        return res.status(400).json({
          success: false,
          error: 'Email already verified',
          message: 'This email has already been verified. You can now sign in.',
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Failed to resend confirmation email',
        message: supabaseError.message || 'An error occurred while sending the confirmation email',
      });
    }

    return res.json({
      success: true,
      message: 'Confirmation email has been resent. Please check your inbox.',
    });
  } catch (error) {
    console.error('Resend confirmation email error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while processing your request',
    });
  }
};

export const removeFCMToken = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { tokenId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify the token belongs to the user
    const token = await prisma.fCMToken.findUnique({
      where: { id: tokenId }
    });

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    if (token.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.fCMToken.delete({
      where: { id: tokenId }
    });

    return res.status(200).json({ message: 'Token removed successfully' });
  } catch (error) {
    console.error('Remove FCM token error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while removing the FCM token',
    });
  }
};

// OTP Verification using Redis
// OTPData interface is now imported from redis.ts

// Send OTP to email
export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { email, isSignUp = false } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    // If this is for signup, check if email already exists
    if (isSignUp) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already in use',
        });
      }
    }


    // Generate OTP
    const otp = generateOTP();
    const expiresAt = addMinutes(new Date(), 10); // OTP expires in 10 minutes

    // Store OTP in Redis
    const otpData: Omit<OTPData, 'email'> = {
      otp,
      expiresAt: expiresAt.getTime(), // Convert to timestamp for storage
      verified: false,
      purpose: isSignUp ? 'signup' : 'verification',
      createdAt: Date.now(),
    };
    
    const stored = await redis.setOTP(email, otpData);
    if (!stored) {
      return res.status(500).json({
        success: false,
        error: 'Failed to store OTP',
      });
    }

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP email',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// Verify OTP
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp, isSignUp = false } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required',
      });
    }

    const storedOTP = await redis.getOTP(email);

    // Check if OTP exists and is not expired
    if (!storedOTP || new Date().getTime() > storedOTP.expiresAt) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP',
      });
    }

    // Verify OTP
    if (storedOTP.otp !== otp) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP',
      });
    }

    // If this is for signup, check if the purpose matches
    if (isSignUp && storedOTP.purpose !== 'signup') {
      return res.status(400).json({
        success: false,
        error: 'This OTP is not valid for signup',
      });
    }

    // Update OTP with verification details
    const updatedOTP: OTPData = {
      ...storedOTP,
      verified: true,
      verifiedAt: Date.now(),
      verificationToken: Buffer.from(`${email}:${Date.now()}`).toString('base64')
    };
    
    // Store the updated OTP data (all timestamps are already in milliseconds)
    await redis.setOTP(email, {
      ...updatedOTP,
      expiresAt: updatedOTP.expiresAt,
      verifiedAt: updatedOTP.verifiedAt,
      createdAt: updatedOTP.createdAt
    });
    
    const verificationToken = updatedOTP.verificationToken;

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        verificationToken,
        email,
      },
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// Default export for all controller functions
export default {
  handleGoogleSignIn,
  signUp,
  signIn,
  signOut,
  getSession,
  updateProfile,
  getFCMTokens,
  checkEmailExists,
  resendConfirmationEmail,
  removeFCMToken,
  sendOTP,
  verifyOTP,
};