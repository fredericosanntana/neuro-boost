import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../src/lib/errors';
import { UserRepository } from '../repositories/UserRepository';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token required');
    }

    const token = authHeader.substring(7);
    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    // Verify token type
    if (decoded.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }
    
    // Verify user still exists and is active
    const user = await UserRepository.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('Invalid token');
    }
    
    // Check if token was issued before any password change (if applicable)
    // This would require storing lastPasswordChange in user model

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new UnauthorizedError('Insufficient permissions'));
      return;
    }

    next();
  };
};

export const generateAccessToken = (user: { id: string; email: string; role: string }) => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'access'
  };
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'neuro-boost-api',
    audience: 'neuro-boost-client'
  });
};

export const generateRefreshToken = (user: { id: string; email: string; role: string }) => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh'
  };
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'neuro-boost-api',
    audience: 'neuro-boost-client'
  });
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
  
  if (decoded.type !== 'refresh') {
    throw new UnauthorizedError('Invalid refresh token');
  }
  
  return decoded;
};