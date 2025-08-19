import { z } from 'zod';

const JWT_SECRET = 'browser-demo-secret-key-change-in-production';

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
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

// Simple browser-compatible JWT-like token (for demo purposes)
// In production, use proper JWT library or server-side authentication
export class BrowserAuthService {
  static generateToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };
    
    // Simple base64 encoding for demo (not secure for production)
    return btoa(JSON.stringify(payload));
  }

  static verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = JSON.parse(atob(token));
      const payload = TokenPayloadSchema.parse(decoded);
      
      // Check if token is expired
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }
      
      return payload;
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