import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  completed: z.boolean().default(false),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
});

export const CreateTaskSchema = TaskSchema.omit({ id: true });
export const UpdateTaskSchema = TaskSchema.partial();

export const FocusSessionSchema = z.object({
  id: z.string().optional(),
  duration: z.number().min(1, 'Duration must be at least 1 minute').max(180, 'Duration must be less than 3 hours'),
  taskId: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  completed: z.boolean().default(false),
});

export const CreateFocusSessionSchema = FocusSessionSchema.omit({ id: true, endTime: true });

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const validateRequest = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Validation failed', error.errors);
    }
    throw error;
  }
};

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: z.ZodIssue[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}