import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { supabase } from '../utils/supabase.js';
import prisma from '../utils/prisma.js';

// Extend the Express Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string | null;
        role: UserRole;
        emailVerified: boolean;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using Supabase JWT
 * Verifies the token and attaches the user to the request object
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'No token provided',
        message: 'Please provide a valid authentication token in the Authorization header'
      });
    }

    // Verify the token with Supabase
    const { 
      data: { user: supabaseUser }, 
      error 
    } = await supabase.auth.getUser(token);
    
    if (error || !supabaseUser) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired token',
        message: 'The provided token is invalid or has expired. Please log in again.'
      });
    }

    // Fetch user data from our database
    const user = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'The user associated with this token was not found in our system.'
      });
    }
    
    const userWithVerified = {
      ...user,
      emailVerified: user.emailVerified || false
    };

    if (!userWithVerified) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'The user associated with this token was not found in our system.'
      });
    }

    // Attach user to request object
    req.user = userWithVerified;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'An error occurred while authenticating the request.'
    });
  }
};

/**
 * Middleware to check if the authenticated user has admin role
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required to access this resource.'
      });
    }

    if (req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access this resource.'
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authorization check failed',
      message: 'An error occurred while checking user permissions.'
    });
  }
};

/**
 * Middleware to check if the user's email is verified
 */
export const requireEmailVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required to access this resource.'
      });
    }

    if (!req.user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Email not verified',
        message: 'Please verify your email address before accessing this resource.'
      });
    }

    next();
  } catch (error) {
    console.error('Email verification check error:', error);
  }
};
