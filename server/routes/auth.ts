import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { validateRequest, LoginSchema, RegisterSchema } from '../../src/lib/validation';
import { BadRequestError, UnauthorizedError } from '../../src/lib/errors';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../../src/lib/logger';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Register endpoint
router.post('/register', async (req, res, next) => {
  try {
    const userData = validateRequest(RegisterSchema, req.body);
    
    const user = await UserRepository.create(userData);
    
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info('User registered successfully', { userId: user.id, email: user.email });

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
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

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const publicUser = UserRepository.toPublic(user);

    logger.info('User logged in successfully', { userId: user.id, email: user.email });

    res.json({
      success: true,
      data: {
        user: publicUser,
        token,
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
router.post('/refresh', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const user = await UserRepository.findById(req.user.id);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: { token },
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;