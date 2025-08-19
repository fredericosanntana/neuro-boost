import { Router } from 'express';
import { FocusService } from '../services/FocusService';
import { validateRequest } from '../../src/lib/validation';
import { z } from 'zod';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../src/lib/errors';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../../src/lib/logger';

const router = Router();

// Validation schemas
const CreateFocusSessionSchema = z.object({
  task_id: z.string().uuid().optional(),
  duration: z.number().min(1).max(180), // 1-180 minutes
  ambient_sound: z.string().optional()
});

const UpdateFocusSessionSchema = z.object({
  end_time: z.string().datetime().optional(),
  completed: z.boolean().optional(),
  actual_duration: z.number().min(0).optional(),
  effectiveness_rating: z.number().min(1).max(5).optional(),
  interruption_reason: z.enum(['completed', 'user_stopped', 'hyperfocus_detected', 'distraction']).optional()
});

const DistractionSchema = z.object({
  type: z.enum(['thought', 'noise', 'notification', 'impulse', 'other']),
  description: z.string().max(200).optional(),
  severity: z.enum([1, 2, 3])
});

// All focus routes require authentication
router.use(authenticateToken);

// Start a new focus session
router.post('/sessions', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const sessionData = validateRequest(CreateFocusSessionSchema, req.body);
    
    const session = await FocusService.createSession({
      ...sessionData,
      user_id: req.user.id
    });

    res.status(201).json({
      success: true,
      data: { session },
      message: 'Focus session started successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get user's focus sessions
router.get('/sessions', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const sessions = await FocusService.getSessionsByUserId(req.user.id, limit);

    res.json({
      success: true,
      data: { sessions }
    });
  } catch (error) {
    next(error);
  }
});

// Get specific focus session
router.get('/sessions/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const session = await FocusService.getSessionById(req.params.id);
    if (!session) {
      throw new NotFoundError('Focus session');
    }

    // Check if session belongs to the authenticated user
    if (session.user_id !== req.user.id) {
      throw new ForbiddenError('Access denied to this focus session');
    }

    res.json({
      success: true,
      data: { session }
    });
  } catch (error) {
    next(error);
  }
});

// Update focus session
router.put('/sessions/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const session = await FocusService.getSessionById(req.params.id);
    if (!session) {
      throw new NotFoundError('Focus session');
    }

    // Check if session belongs to the authenticated user
    if (session.user_id !== req.user.id) {
      throw new ForbiddenError('Access denied to this focus session');
    }

    const updateData = validateRequest(UpdateFocusSessionSchema, req.body);
    
    // Convert datetime string to Date if provided
    if (updateData.end_time) {
      updateData.end_time = new Date(updateData.end_time);
    }

    const updatedSession = await FocusService.updateSession(req.params.id, updateData);

    res.json({
      success: true,
      data: { session: updatedSession },
      message: 'Focus session updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Complete focus session
router.post('/sessions/:id/complete', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const session = await FocusService.getSessionById(req.params.id);
    if (!session) {
      throw new NotFoundError('Focus session');
    }

    // Check if session belongs to the authenticated user
    if (session.user_id !== req.user.id) {
      throw new ForbiddenError('Access denied to this focus session');
    }

    const { effectiveness_rating, interruption_reason } = req.body;

    if (!effectiveness_rating || effectiveness_rating < 1 || effectiveness_rating > 5) {
      throw new BadRequestError('Effectiveness rating must be between 1 and 5');
    }

    const completedSession = await FocusService.completeSession(
      req.params.id,
      effectiveness_rating,
      interruption_reason
    );

    res.json({
      success: true,
      data: { session: completedSession },
      message: 'Focus session completed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Add distraction to session
router.post('/sessions/:id/distractions', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const session = await FocusService.getSessionById(req.params.id);
    if (!session) {
      throw new NotFoundError('Focus session');
    }

    // Check if session belongs to the authenticated user
    if (session.user_id !== req.user.id) {
      throw new ForbiddenError('Access denied to this focus session');
    }

    const distractionData = validateRequest(DistractionSchema, req.body);
    
    const updatedSession = await FocusService.addDistraction(req.params.id, {
      ...distractionData,
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: { session: updatedSession },
      message: 'Distraction logged successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Check for hyperfocus
router.get('/sessions/:id/hyperfocus-check', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const session = await FocusService.getSessionById(req.params.id);
    if (!session) {
      throw new NotFoundError('Focus session');
    }

    // Check if session belongs to the authenticated user
    if (session.user_id !== req.user.id) {
      throw new ForbiddenError('Access denied to this focus session');
    }

    const isHyperfocus = await FocusService.detectHyperfocus(req.params.id);

    res.json({
      success: true,
      data: { 
        hyperfocus_detected: isHyperfocus,
        session_id: req.params.id,
        current_duration: Math.round((new Date().getTime() - session.start_time.getTime()) / (1000 * 60))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get focus statistics
router.get('/stats', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const stats = await FocusService.getSessionStats(req.user.id);

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
});

export default router;