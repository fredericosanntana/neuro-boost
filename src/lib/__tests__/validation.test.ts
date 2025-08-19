import { describe, it, expect } from 'vitest';
import { 
  TaskSchema, 
  CreateTaskSchema, 
  LoginSchema, 
  validateRequest, 
  ValidationError 
} from '../validation';

describe('Validation schemas', () => {
  describe('TaskSchema', () => {
    it('should validate a complete task', () => {
      const validTask = {
        id: '1',
        title: 'Test Task',
        description: 'Test description',
        priority: 'high',
        completed: false,
        dueDate: new Date().toISOString(),
        tags: ['work', 'urgent'],
      };

      expect(() => TaskSchema.parse(validTask)).not.toThrow();
    });

    it('should apply defaults for optional fields', () => {
      const minimalTask = {
        title: 'Test Task',
      };

      const result = TaskSchema.parse(minimalTask);
      expect(result.priority).toBe('medium');
      expect(result.completed).toBe(false);
      expect(result.tags).toEqual([]);
    });

    it('should reject task with empty title', () => {
      const invalidTask = {
        title: '',
      };

      expect(() => TaskSchema.parse(invalidTask)).toThrow();
    });

    it('should reject task with title too long', () => {
      const invalidTask = {
        title: 'a'.repeat(101), // 101 characters
      };

      expect(() => TaskSchema.parse(invalidTask)).toThrow();
    });
  });

  describe('CreateTaskSchema', () => {
    it('should validate task creation without id', () => {
      const newTask = {
        title: 'New Task',
        priority: 'low',
      };

      expect(() => CreateTaskSchema.parse(newTask)).not.toThrow();
    });
  });

  describe('LoginSchema', () => {
    it('should validate correct login credentials', () => {
      const validLogin = {
        email: 'test@example.com',
        password: 'password123',
      };

      expect(() => LoginSchema.parse(validLogin)).not.toThrow();
    });

    it('should reject invalid email format', () => {
      const invalidLogin = {
        email: 'invalid-email',
        password: 'password123',
      };

      expect(() => LoginSchema.parse(invalidLogin)).toThrow();
    });

    it('should reject short password', () => {
      const invalidLogin = {
        email: 'test@example.com',
        password: '123', // Too short
      };

      expect(() => LoginSchema.parse(invalidLogin)).toThrow();
    });
  });
});

describe('validateRequest utility', () => {
  it('should return parsed data for valid input', () => {
    const validData = { email: 'test@example.com', password: 'password123' };
    const result = validateRequest(LoginSchema, validData);
    
    expect(result).toEqual(validData);
  });

  it('should throw ValidationError for invalid input', () => {
    const invalidData = { email: 'invalid', password: '123' };
    
    expect(() => validateRequest(LoginSchema, invalidData)).toThrow(ValidationError);
  });

  it('should include error details in ValidationError', () => {
    const invalidData = { email: 'invalid', password: '123' };
    
    try {
      validateRequest(LoginSchema, invalidData);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).errors).toBeDefined();
      expect((error as ValidationError).errors.length).toBeGreaterThan(0);
    }
  });
});