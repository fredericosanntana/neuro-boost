import { Router } from 'express';
import { UserRepository } from '../repositories/UserRepository';
import { validateRequest, UpdateTaskSchema } from '../../src/lib/validation';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { logger } from '../../src/lib/logger';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// Get current user profile
router.get('/profile', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const user = await UserRepository.findById(req.user.id);
    if (!user) {
      throw new Error('User not found');
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

// Update current user profile
router.put('/profile', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    // Only allow updating name and email, not role
    const { name, email } = req.body;
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const updatedUser = await UserRepository.update(req.user.id, updateData);

    logger.info('User profile updated', { userId: req.user.id });

    res.json({
      success: true,
      data: { user: updatedUser },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Admin routes - get all users
router.get('/', requireRole(['admin']), async (req: AuthenticatedRequest, res, next) => {
  try {
    // This would require implementing a findAll method in UserRepository
    // For now, return empty array
    res.json({
      success: true,
      data: { users: [] },
      message: 'Feature not implemented yet',
    });
  } catch (error) {
    next(error);
  }
});

export default router;