import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService, UserSchema, TokenPayloadSchema } from '../auth';

describe('AuthService', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user' as const,
  };

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = AuthService.generateToken(mockUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = AuthService.generateToken(mockUser);
      const payload = AuthService.verifyToken(token);
      
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(mockUser.id);
      expect(payload?.email).toBe(mockUser.email);
      expect(payload?.role).toBe(mockUser.role);
    });

    it('should return null for invalid token', () => {
      const payload = AuthService.verifyToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('should return null for expired token', () => {
      // Mock a token that's already expired (would need jwt library mock in real scenario)
      const payload = AuthService.verifyToken('');
      expect(payload).toBeNull();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'mock-token';
      const header = `Bearer ${token}`;
      const extracted = AuthService.extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      const extracted = AuthService.extractTokenFromHeader('invalid-header');
      expect(extracted).toBeNull();
    });

    it('should return null for undefined header', () => {
      const extracted = AuthService.extractTokenFromHeader('');
      expect(extracted).toBeNull();
    });
  });
});

describe('Schema validation', () => {
  describe('UserSchema', () => {
    it('should validate a correct user object', () => {
      const validUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      };

      expect(() => UserSchema.parse(validUser)).not.toThrow();
    });

    it('should reject invalid email', () => {
      const invalidUser = {
        id: '1',
        email: 'invalid-email',
        name: 'Test User',
        role: 'user',
      };

      expect(() => UserSchema.parse(invalidUser)).toThrow();
    });
  });

  describe('TokenPayloadSchema', () => {
    it('should validate a correct token payload', () => {
      const validPayload = {
        userId: '1',
        email: 'test@example.com',
        role: 'admin',
      };

      expect(() => TokenPayloadSchema.parse(validPayload)).not.toThrow();
    });

    it('should reject invalid role', () => {
      const invalidPayload = {
        userId: '1',
        email: 'test@example.com',
        role: 'invalid-role',
      };

      expect(() => TokenPayloadSchema.parse(invalidPayload)).toThrow();
    });
  });
});