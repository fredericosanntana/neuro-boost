import { Router } from 'express';
import { UserRepository } from '../repositories/UserRepository';
import { validateRequest, LoginSchema, RegisterSchema } from '../../src/lib/validation';
import { BadRequestError, UnauthorizedError } from '../../src/lib/errors';
import { 
  authenticateToken, 
  AuthenticatedRequest, 
  generateAccessToken, 
  generateRefreshToken,
  verifyRefreshToken 
} from '../middleware/auth';
import { logger } from '../../src/lib/logger';

const router = Router();

// Register endpoint
router.post('/register', async (req, res, next) => {
  try {
    const userData = validateRequest(RegisterSchema, req.body);
    
    const user = await UserRepository.create(userData);
    
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    logger.info('User registered successfully', { 
      userId: user.id, 
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: {
        user: UserRepository.toPublic(user),
        tokens: {
          access: accessToken,
          refresh: refreshToken
        }
      },
      message: 'User registered successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Login endpoint
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = validateRequest(LoginSchema, req.body);
    
    const user = await UserRepository.verifyPassword(email, password);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const publicUser = UserRepository.toPublic(user);

    logger.info('User logged in successfully', { 
      userId: user.id, 
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: {
        user: publicUser,
        tokens: {
          access: accessToken,
          refresh: refreshToken
        }
      },
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
});

// Get current user endpoint
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const user = await UserRepository.findById(req.user.id);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const publicUser = UserRepository.toPublic(user);

    res.json({
      success: true,
      data: { user: publicUser },
    });
  } catch (error) {
    next(error);
  }
});

// Logout endpoint (client-side token removal)
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    logger.info('User logged out', { userId: req.user?.id });
    
    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = validateRequest({ 
      type: 'object', 
      properties: { 
        refreshToken: { type: 'string', minLength: 1 } 
      }, 
      required: ['refreshToken'] 
    }, req.body);

    const decoded = verifyRefreshToken(refreshToken);
    
    const user = await UserRepository.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    logger.info('Token refreshed successfully', { 
      userId: user.id, 
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: { 
        tokens: {
          access: newAccessToken,
          refresh: newRefreshToken
        }
      },
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;