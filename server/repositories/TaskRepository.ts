import { query } from '../config/database';
import { Task, CreateTaskData, UpdateTaskData } from '../models/Task';
import { NotFoundError } from '../../src/lib/errors';

export class TaskRepository {
  static async create(taskData: CreateTaskData): Promise<Task> {
    const { user_id, title, description, priority = 'medium', due_date, tags = [] } = taskData;

    const result = await query(
      `INSERT INTO tasks (user_id, title, description, priority, due_date, tags) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [user_id, title, description, priority, due_date, tags]
    );

    return result.rows[0];
  }

  static async findById(id: string): Promise<Task | null> {
    const result = await query(
      'SELECT * FROM tasks WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  static async findByUserId(userId: string, filters?: {
    completed?: boolean;
    priority?: string;
    tags?: string[];
  }): Promise<Task[]> {
    let sql = 'SELECT * FROM tasks WHERE user_id = $1';
    const params: any[] = [userId];
    let paramCount = 2;

    if (filters?.completed !== undefined) {
      sql += ` AND completed = $${paramCount}`;
      params.push(filters.completed);
      paramCount++;
    }

    if (filters?.priority) {
      sql += ` AND priority = $${paramCount}`;
      params.push(filters.priority);
      paramCount++;
    }

    if (filters?.tags && filters.tags.length > 0) {
      sql += ` AND tags && $${paramCount}`;
      params.push(filters.tags);
      paramCount++;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return result.rows;
  }

  static async update(id: string, taskData: UpdateTaskData): Promise<Task> {
    const task = await this.findById(id);
    if (!task) {
      throw new NotFoundError('Task');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(taskData).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return task;
    }

    values.push(id);
    const result = await query(
      `UPDATE tasks SET ${fields.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  static async delete(id: string): Promise<void> {
    const result = await query(
      'DELETE FROM tasks WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Task');
    }
  }

  static async markCompleted(id: string): Promise<Task> {
    return this.update(id, { completed: true });
  }

  static async getStatsByUserId(userId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    byPriority: Record<string, number>;
  }> {
    const result = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE completed = true) as completed,
        COUNT(*) FILTER (WHERE completed = false) as pending,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
        COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority,
        COUNT(*) FILTER (WHERE priority = 'low') as low_priority
       FROM tasks WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0];
    return {
      total: parseInt(row.total),
      completed: parseInt(row.completed),
      pending: parseInt(row.pending),
      byPriority: {
        high: parseInt(row.high_priority),
        medium: parseInt(row.medium_priority),
        low: parseInt(row.low_priority),
      },
    };
  }
}