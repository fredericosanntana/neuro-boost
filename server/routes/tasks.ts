import { Router } from 'express';
import { TaskRepository } from '../repositories/TaskRepository';
import { validateRequest, CreateTaskSchema, UpdateTaskSchema } from '../../src/lib/validation';
import { NotFoundError, ForbiddenError } from '../../src/lib/errors';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../../src/lib/logger';

const router = Router();

// All task routes require authentication
router.use(authenticateToken);

// Get all tasks for the authenticated user
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { completed, priority, tags } = req.query;
    const filters: any = {};

    if (completed !== undefined) {
      filters.completed = completed === 'true';
    }

    if (priority && typeof priority === 'string') {
      filters.priority = priority;
    }

    if (tags && typeof tags === 'string') {
      filters.tags = tags.split(',');
    }

    const tasks = await TaskRepository.findByUserId(req.user.id, filters);

    res.json({
      success: true,
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
});

// Get task statistics
router.get('/stats', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const stats = await TaskRepository.getStatsByUserId(req.user.id);

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
});

// Get a specific task
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const task = await TaskRepository.findById(req.params.id);
    if (!task) {
      throw new NotFoundError('Task');
    }

    // Check if task belongs to the authenticated user
    if (task.user_id !== req.user.id) {
      throw new ForbiddenError('Access denied to this task');
    }

    res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
});

// Create a new task
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const taskData = validateRequest(CreateTaskSchema, req.body);
    
    const task = await TaskRepository.create({
      ...taskData,
      user_id: req.user.id,
    });

    logger.info('Task created', { taskId: task.id, userId: req.user.id });

    res.status(201).json({
      success: true,
      data: { task },
      message: 'Task created successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Update a task
router.put('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const task = await TaskRepository.findById(req.params.id);
    if (!task) {
      throw new NotFoundError('Task');
    }

    // Check if task belongs to the authenticated user
    if (task.user_id !== req.user.id) {
      throw new ForbiddenError('Access denied to this task');
    }

    const updateData = validateRequest(UpdateTaskSchema, req.body);
    const updatedTask = await TaskRepository.update(req.params.id, updateData);

    logger.info('Task updated', { taskId: updatedTask.id, userId: req.user.id });

    res.json({
      success: true,
      data: { task: updatedTask },
      message: 'Task updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Mark a task as completed
router.patch('/:id/complete', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const task = await TaskRepository.findById(req.params.id);
    if (!task) {
      throw new NotFoundError('Task');
    }

    // Check if task belongs to the authenticated user
    if (task.user_id !== req.user.id) {
      throw new ForbiddenError('Access denied to this task');
    }

    const updatedTask = await TaskRepository.markCompleted(req.params.id);

    logger.info('Task completed', { taskId: updatedTask.id, userId: req.user.id });

    res.json({
      success: true,
      data: { task: updatedTask },
      message: 'Task marked as completed',
    });
  } catch (error) {
    next(error);
  }
});

// Delete a task
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const task = await TaskRepository.findById(req.params.id);
    if (!task) {
      throw new NotFoundError('Task');
    }

    // Check if task belongs to the authenticated user
    if (task.user_id !== req.user.id) {
      throw new ForbiddenError('Access denied to this task');
    }

    await TaskRepository.delete(req.params.id);

    logger.info('Task deleted', { taskId: req.params.id, userId: req.user.id });

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;