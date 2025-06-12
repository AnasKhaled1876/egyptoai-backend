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
        error: 'No token provided',
        message: 'Please provide a valid authentication token in the Authorization header'
      });
    }

    // Verify the token with Supabase
    const { 
      data: { user }, 
      error 
    } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        message: 'The provided token is invalid or has expired. Please log in again.'
      });
    }

    // Fetch user data including role from the database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!dbUser) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'The user associated with this token was not found in the database'
      });
    }

    // Attach user to the request object
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
    };

    // Continue to the next middleware/route handler
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      message: 'An error occurred during authentication',
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
    });
  }
};

/**
 * Middleware to check if the authenticated user has admin role
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  try {
    // Check if user has admin role
    if (req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Insufficient permissions. Admin access required.'
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ 
      error: 'Authorization failed',
      message: 'An error occurred while verifying user permissions',
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
    });
  }
};
