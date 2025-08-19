import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['user', 'admin']).default('user'),
});

export type User = z.infer<typeof UserSchema>;

export const TokenPayloadSchema = z.object({
  userId: z.string(),
  email: z.string(),
  role: z.enum(['user', 'admin']),
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

export class AuthService {
  static generateToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      return TokenPayloadSchema.parse(decoded);
    } catch (error) {
      return null;
    }
  }

  static extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

export const createAuthenticatedUser = (payload: TokenPayload): User => ({
  id: payload.userId,
  email: payload.email,
  name: '', // Would be fetched from database in real app
  role: payload.role,
});