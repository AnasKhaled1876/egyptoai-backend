import { Request, Response } from "express";
import { supabase } from "../utils/supabase.js";
import { prisma } from "../utils/prisma.js";
import { v4 as uuidv4 } from 'uuid';

export const signUp = async (req: Request, res: Response) => {
  try {
    const { email, password, name, fcmToken, deviceInfo } = req.body;

    // Check if user already exists in Prisma
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // 1. Create user in Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      },
    });

    if (signUpError) {
      return res.status(400).json({ error: signUpError.message });
    }

    // 2. Create user in Prisma with the same ID as Supabase
    const user = await prisma.user.create({
      /**
       * Data to be created in the Prisma user table.
       *
       * @prop {string} id - The ID of the user, which is the same as the ID in
       * Supabase Auth. If the user is created in Supabase Auth successfully,
       * use the ID from Supabase Auth. Otherwise, generate a random UUID.
       * @prop {string} email - The email address of the user.
       * @prop {string} name - The name of the user.
       */
      data: {
        id: authData.user?.id || uuidv4(),
        email,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });

    // 3. Save FCM token if provided
    if (fcmToken) {
      await prisma.fCMToken.create({
        data: {
          token: fcmToken,
          deviceInfo: deviceInfo || 'Unknown Device',
          userId: user.id
        }
      });
    }

    // 4. Return the user data and session
    return res.status(201).json({
      user,
      session: authData.session,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const signIn = async (req: Request, res: Response) => {
  try {
    const { email, password, fcmToken, deviceInfo } = req.body;

    // 1. Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // 2. Get or create user in Prisma
    let prismaUser = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        fcmTokens: {
          where: { token: fcmToken || '' },
          select: { id: true, token: true }
        }
      }
    });

    // 3. If user doesn't exist in Prisma but exists in Supabase (edge case)
    if (!prismaUser) {
      // Get user metadata from Supabase
      const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      prismaUser = await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email!,
          name: supabaseUser?.user_metadata?.name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          fcmTokens: {
            where: { token: fcmToken || '' },
            select: { id: true, token: true }
          }
        }
      });
    }

    // 4. Save FCM token if provided
    if (fcmToken) {
      // First try to find if the token exists for any user
      const existingToken = await prisma.fCMToken.findFirst({
        where: { token: fcmToken }
      });

      if (existingToken) {
        // Update if it belongs to current user, otherwise create a new one
        if (existingToken.userId === data.user.id) {
          await prisma.fCMToken.update({
            where: { id: existingToken.id },
            data: { deviceInfo: deviceInfo || 'Unknown Device' }
          });
        } else {
          await prisma.fCMToken.create({
            data: {
              token: fcmToken,
              deviceInfo: deviceInfo || 'Unknown Device',
              userId: data.user.id
            }
          });
        }
      } else {
        // Create new token if it doesn't exist
        await prisma.fCMToken.create({
          data: {
            token: fcmToken,
            deviceInfo: deviceInfo || 'Unknown Device',
            userId: data.user.id
          }
        });
      }
    }

    // Return the user data and session
    return res.json({
      user: {
        id: prismaUser.id,
        email: prismaUser.email,
        name: prismaUser.name,
      },
      session: data.session,
    });
  } catch (error) {
    console.error('Sign in error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const signOut = async (req: Request, res: Response) => {
  try {
    const { fcmToken } = req.body;
    const userId = (req as any).user?.id;

    // 1. Remove FCM token if provided
    if (fcmToken && userId) {
      await prisma.fCMToken.deleteMany({
        where: {
          userId,
          token: fcmToken
        }
      });
    }

    // 2. Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Successfully signed out' });
  } catch (error) {
    console.error('Sign out error:', error);
    return res.status(500).json({ error: 'Internal server error' });
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

// Remove FCM token
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
    return res.status(500).json({ error: 'Internal server error' });
  }
};