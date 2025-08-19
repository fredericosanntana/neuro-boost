import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { User, CreateUserData, UpdateUserData, UserPublic } from '../models/User';
import { ConflictError, NotFoundError } from '../../src/lib/errors';

export class UserRepository {
  static async create(userData: CreateUserData): Promise<UserPublic> {
    const { email, password, name, role = 'user' } = userData;
    
    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await query(
      `INSERT INTO users (email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, name, role, created_at, updated_at`,
      [email, password_hash, name, role]
    );

    return result.rows[0];
  }

  static async findById(id: string): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    return result.rows[0] || null;
  }

  static async update(id: string, userData: UpdateUserData): Promise<UserPublic> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError('User');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(userData).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return this.toPublic(user);
    }

    values.push(id);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING id, email, name, role, created_at, updated_at`,
      values
    );

    return result.rows[0];
  }

  static async delete(id: string): Promise<void> {
    const result = await query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('User');
    }
  }

  static async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    return isValid ? user : null;
  }

  static toPublic(user: User): UserPublic {
    const { password_hash, ...publicUser } = user;
    return publicUser;
  }
}