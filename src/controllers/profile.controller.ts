import { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";

/**
 * @route GET /api/profile
 * @description Get user profile
 * @access Private
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ 
        status: false, 
        message: 'Not authenticated' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        photoUrl: true,
        createdAt: true,
        updatedAt: true,
        googleId: true,
        _count: {
          select: {
            chats: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ 
        status: false, 
        message: 'User not found' 
      });
    }

    return res.json({ 
      status: true, 
      data: user 
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ 
      status: false, 
      message: 'Failed to fetch profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route PUT /api/profile
 * @description Update user profile
 * @access Private
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { name, bio, location, website, photoUrl } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        status: false, 
        message: 'Not authenticated' 
      });
    }

    // Only allow updating specific fields
    const updateData: any = {};
    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;

    // Update the user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        photoUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.json({ 
      status: true, 
      message: 'Profile updated successfully',
      data: updatedUser 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ 
      status: false, 
      message: 'Failed to update profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
