import { Request, Response } from 'express';
import { ReminderService } from '../services/ReminderService.js';
import { ReminderScheduler } from '../jobs/ReminderScheduler.js';
import { 
  CreateReminderData, 
  CreateReminderPreferencesData,
  ReminderResponse,
  ReminderType,
  ReminderPriority
} from '../models/Reminder.js';
import { pool } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

// Validation schemas
const createReminderSchema = z.object({
  task_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  reminder_type: z.enum(['task_start', 'break_reminder', 'deadline_warning', 'energy_check', 'hyperfocus_break', 'medication_reminder', 'transition_warning']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  scheduled_time: z.string().datetime(),
  max_escalations: z.number().min(0).max(10).optional(),
  context_data: z.object({
    user_energy_level: z.number().min(1).max(10).optional(),
    estimated_task_duration: z.number().min(1).optional(),
    current_focus_session_id: z.string().uuid().optional()
  }).optional()
});

const updatePreferencesSchema = z.object({
  reminder_frequency: z.enum(['minimal', 'low', 'moderate', 'high', 'adaptive']).optional(),
  energy_based_adjustment: z.boolean().optional(),
  gentle_escalation: z.boolean().optional(),
  max_daily_reminders: z.number().min(1).max(50).optional(),
  quiet_hours: z.object({
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  }).optional(),
  reminder_types_enabled: z.object({
    task_start: z.boolean(),
    break_reminder: z.boolean(),
    deadline_warning: z.boolean(),
    energy_check: z.boolean(),
    hyperfocus_break: z.boolean()
  }).optional(),
  escalation_preferences: z.object({
    initial_delay_minutes: z.number().min(1).max(120),
    escalation_interval_minutes: z.number().min(5).max(60),
    max_escalations: z.number().min(1).max(10),
    weekend_adjustments: z.boolean()
  }).optional(),
  adaptive_learning: z.object({
    enabled: z.boolean(),
    effectiveness_weight: z.number().min(0).max(1),
    energy_correlation_weight: z.number().min(0).max(1),
    time_preference_weight: z.number().min(0).max(1)
  }).optional()
});

const recordResponseSchema = z.object({
  response: z.enum(['acknowledged', 'snoozed_5min', 'snoozed_15min', 'snoozed_30min', 'dismissed', 'completed_task', 'not_now', 'too_frequent']),
  response_time_seconds: z.number().min(0),
  effectiveness_rating: z.number().min(1).max(5).optional(),
  user_energy_before: z.number().min(1).max(10).optional(),
  user_energy_after: z.number().min(1).max(10).optional()
});

export class ReminderController {
  private reminderService: ReminderService;
  private reminderScheduler: ReminderScheduler;

  constructor() {
    this.reminderService = new ReminderService();
    this.reminderScheduler = new ReminderScheduler();
  }

  /**
   * Creates a new adaptive reminder
   * POST /api/reminders
   */
  async createReminder(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createReminderSchema.parse(req.body);
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const reminderData: CreateReminderData = {
        user_id: userId,
        task_id: validatedData.task_id,
        title: validatedData.title,
        description: validatedData.description,
        reminder_type: validatedData.reminder_type,
        priority: validatedData.priority,
        scheduled_time: new Date(validatedData.scheduled_time),
        max_escalations: validatedData.max_escalations,
        context_data: validatedData.context_data
      };

      const reminder = await this.reminderService.createAdaptiveReminder(reminderData);

      res.status(201).json({
        success: true,
        data: { reminder },
        message: 'Adaptive reminder created successfully'
      });

      logger.info(`Created reminder ${reminder.id} for user ${userId}`);

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }

      logger.error('Error creating reminder:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create reminder'
      });
    }
  }

  /**
   * Gets user's reminders with filtering options
   * GET /api/reminders
   */
  async getReminders(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        status,
        reminder_type,
        priority,
        limit = 50,
        offset = 0,
        start_date,
        end_date
      } = req.query;

      const client = await pool.connect();

      try {
        let query = `
          SELECT r.*, t.title as task_title
          FROM reminders r
          LEFT JOIN tasks t ON r.task_id = t.id
          WHERE r.user_id = $1
        `;
        const params: any[] = [userId];
        let paramCount = 1;

        if (status) {
          paramCount++;
          query += ` AND r.status = $${paramCount}`;
          params.push(status);
        }

        if (reminder_type) {
          paramCount++;
          query += ` AND r.reminder_type = $${paramCount}`;
          params.push(reminder_type);
        }

        if (priority) {
          paramCount++;
          query += ` AND r.priority = $${paramCount}`;
          params.push(priority);
        }

        if (start_date) {
          paramCount++;
          query += ` AND r.scheduled_time >= $${paramCount}`;
          params.push(start_date);
        }

        if (end_date) {
          paramCount++;
          query += ` AND r.scheduled_time <= $${paramCount}`;
          params.push(end_date);
        }

        query += ` ORDER BY r.scheduled_time DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const result = await client.query(query, params);

        // Get total count for pagination
        const countResult = await client.query(
          'SELECT COUNT(*) FROM reminders WHERE user_id = $1',
          [userId]
        );

        res.json({
          success: true,
          data: {
            reminders: result.rows,
            pagination: {
              total: parseInt(countResult.rows[0].count),
              limit: parseInt(limit as string),
              offset: parseInt(offset as string)
            }
          }
        });

      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Error getting reminders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get reminders'
      });
    }
  }

  /**
   * Records user response to a reminder
   * POST /api/reminders/:id/response
   */
  async recordResponse(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const validatedData = recordResponseSchema.parse(req.body);

      await this.reminderService.recordReminderResponse(
        id,
        validatedData.response,
        validatedData.response_time_seconds,
        validatedData.effectiveness_rating,
        validatedData.user_energy_before,
        validatedData.user_energy_after
      );

      res.json({
        success: true,
        message: 'Response recorded successfully'
      });

      logger.info(`Recorded response for reminder ${id}: ${validatedData.response}`);

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }

      logger.error('Error recording reminder response:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record response'
      });
    }
  }

  /**
   * Gets user's reminder preferences
   * GET /api/reminders/preferences
   */
  async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const client = await pool.connect();

      try {
        const result = await client.query(
          'SELECT * FROM reminder_preferences WHERE user_id = $1',
          [userId]
        );

        if (result.rows.length === 0) {
          // Create default preferences
          const defaultPreferences = await this.createDefaultPreferences(userId);
          res.json({
            success: true,
            data: { preferences: defaultPreferences }
          });
          return;
        }

        res.json({
          success: true,
          data: { preferences: result.rows[0] }
        });

      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Error getting preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get preferences'
      });
    }
  }

  /**
   * Updates user's reminder preferences
   * PUT /api/reminders/preferences
   */
  async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const validatedData = updatePreferencesSchema.parse(req.body);
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Check if preferences exist
        const existingResult = await client.query(
          'SELECT id FROM reminder_preferences WHERE user_id = $1',
          [userId]
        );

        if (existingResult.rows.length === 0) {
          // Create new preferences
          await this.createDefaultPreferences(userId);
        }

        // Update preferences
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramCount = 0;

        for (const [key, value] of Object.entries(validatedData)) {
          if (value !== undefined) {
            paramCount++;
            updateFields.push(`${key} = $${paramCount}`);
            updateValues.push(typeof value === 'object' ? JSON.stringify(value) : value);
          }
        }

        if (updateFields.length > 0) {
          const updateQuery = `
            UPDATE reminder_preferences 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $${paramCount + 1}
            RETURNING *
          `;
          updateValues.push(userId);

          const result = await client.query(updateQuery, updateValues);

          await client.query('COMMIT');

          res.json({
            success: true,
            data: { preferences: result.rows[0] },
            message: 'Preferences updated successfully'
          });

          logger.info(`Updated reminder preferences for user ${userId}`);
        } else {
          await client.query('ROLLBACK');
          res.status(400).json({
            success: false,
            error: 'No valid fields to update'
          });
        }

      } catch (dbError) {
        await client.query('ROLLBACK');
        throw dbError;
      } finally {
        client.release();
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }

      logger.error('Error updating preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update preferences'
      });
    }
  }

  /**
   * Gets optimal reminder times for user
   * GET /api/reminders/optimal-times/:reminder_type
   */
  async getOptimalTimes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { reminder_type } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const optimalTimes = await this.reminderService.getOptimalReminderTimes(
        userId,
        reminder_type as ReminderType
      );

      res.json({
        success: true,
        data: { optimal_times: optimalTimes }
      });

    } catch (error) {
      logger.error('Error getting optimal times:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get optimal times'
      });
    }
  }

  /**
   * Gets reminder analytics and insights
   * GET /api/reminders/analytics
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { days = 30 } = req.query;
      const client = await pool.connect();

      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days as string));

        // Get reminder statistics
        const statsResult = await client.query(`
          SELECT 
            COUNT(*) as total_reminders,
            COUNT(CASE WHEN rl.user_response IN ('acknowledged', 'completed_task') THEN 1 END) as responded_reminders,
            AVG(rl.effectiveness_rating) as avg_effectiveness,
            AVG(rl.response_time_seconds) as avg_response_time
          FROM reminders r
          LEFT JOIN reminder_logs rl ON r.id = rl.reminder_id
          WHERE r.user_id = $1 
            AND r.created_at BETWEEN $2 AND $3
        `, [userId, startDate, endDate]);

        // Get effectiveness by reminder type
        const typeEffectivenessResult = await client.query(`
          SELECT 
            r.reminder_type,
            AVG(rl.effectiveness_rating) as avg_effectiveness,
            COUNT(*) as count
          FROM reminders r
          JOIN reminder_logs rl ON r.id = rl.reminder_id
          WHERE r.user_id = $1 
            AND r.created_at BETWEEN $2 AND $3
            AND rl.effectiveness_rating IS NOT NULL
          GROUP BY r.reminder_type
        `, [userId, startDate, endDate]);

        // Get optimal hours
        const timeAnalysisResult = await client.query(`
          SELECT 
            EXTRACT(HOUR FROM rl.sent_at) as hour,
            AVG(rl.effectiveness_rating) as avg_effectiveness,
            COUNT(*) as count
          FROM reminder_logs rl
          JOIN reminders r ON rl.reminder_id = r.id
          WHERE rl.user_id = $1 
            AND rl.sent_at BETWEEN $2 AND $3
            AND rl.effectiveness_rating IS NOT NULL
          GROUP BY EXTRACT(HOUR FROM rl.sent_at)
          ORDER BY avg_effectiveness DESC
        `, [userId, startDate, endDate]);

        const stats = statsResult.rows[0];
        const responseRate = stats.total_reminders > 0 ? 
          (parseFloat(stats.responded_reminders) / parseFloat(stats.total_reminders)) * 100 : 0;

        const analytics = {
          date_range: { start: startDate, end: endDate },
          total_reminders: parseInt(stats.total_reminders),
          response_rate: Math.round(responseRate * 100) / 100,
          average_effectiveness: stats.avg_effectiveness ? parseFloat(stats.avg_effectiveness) : null,
          average_response_time_seconds: stats.avg_response_time ? parseFloat(stats.avg_response_time) : null,
          type_effectiveness: typeEffectivenessResult.rows.reduce((acc, row) => {
            acc[row.reminder_type] = parseFloat(row.avg_effectiveness);
            return acc;
          }, {}),
          optimal_hours: timeAnalysisResult.rows.slice(0, 5).map(row => ({
            hour: parseInt(row.hour),
            effectiveness: parseFloat(row.avg_effectiveness),
            sample_count: parseInt(row.count)
          }))
        };

        res.json({
          success: true,
          data: { analytics }
        });

      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Error getting analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analytics'
      });
    }
  }

  /**
   * Snoozes a reminder
   * POST /api/reminders/:id/snooze
   */
  async snoozeReminder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { minutes = 15 } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const client = await pool.connect();

      try {
        const result = await client.query(`
          UPDATE reminders 
          SET scheduled_time = CURRENT_TIMESTAMP + INTERVAL '${parseInt(minutes)} minutes',
              status = 'snoozed',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND user_id = $2
          RETURNING *
        `, [id, userId]);

        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: 'Reminder not found'
          });
          return;
        }

        res.json({
          success: true,
          data: { reminder: result.rows[0] },
          message: `Reminder snoozed for ${minutes} minutes`
        });

        logger.info(`Snoozed reminder ${id} for ${minutes} minutes`);

      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Error snoozing reminder:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to snooze reminder'
      });
    }
  }

  /**
   * Dismisses a reminder
   * POST /api/reminders/:id/dismiss
   */
  async dismissReminder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.reminderService.updateReminderStatus(id, 'dismissed');

      res.json({
        success: true,
        message: 'Reminder dismissed'
      });

      logger.info(`Dismissed reminder ${id}`);

    } catch (error) {
      logger.error('Error dismissing reminder:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to dismiss reminder'
      });
    }
  }

  /**
   * Schedules automatic reminders for user's tasks
   * POST /api/reminders/schedule-automatic
   */
  async scheduleAutomaticReminders(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.reminderScheduler.scheduleAutomaticReminders(userId);

      res.json({
        success: true,
        message: 'Automatic reminders scheduled successfully'
      });

      logger.info(`Scheduled automatic reminders for user ${userId}`);

    } catch (error) {
      logger.error('Error scheduling automatic reminders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to schedule automatic reminders'
      });
    }
  }

  /**
   * Creates default preferences for a new user
   */
  private async createDefaultPreferences(userId: string): Promise<any> {
    const client = await pool.connect();

    try {
      const defaultPreferences = {
        id: crypto.randomUUID(),
        user_id: userId,
        reminder_frequency: 'moderate',
        preferred_times: [
          {
            start_time: '09:00',
            end_time: '11:00',
            days_of_week: [1, 2, 3, 4, 5],
            energy_level_preference: 'high',
            reminder_types: ['task_start', 'deadline_warning']
          },
          {
            start_time: '14:00',
            end_time: '16:00',
            days_of_week: [1, 2, 3, 4, 5],
            energy_level_preference: 'medium',
            reminder_types: ['break_reminder', 'energy_check']
          }
        ],
        energy_based_adjustment: true,
        gentle_escalation: true,
        max_daily_reminders: 8,
        quiet_hours: {
          start: '22:00',
          end: '08:00'
        },
        reminder_types_enabled: {
          task_start: true,
          break_reminder: true,
          deadline_warning: true,
          energy_check: true,
          hyperfocus_break: true
        },
        escalation_preferences: {
          initial_delay_minutes: 5,
          escalation_interval_minutes: 15,
          max_escalations: 3,
          weekend_adjustments: true
        },
        adaptive_learning: {
          enabled: true,
          effectiveness_weight: 0.7,
          energy_correlation_weight: 0.5,
          time_preference_weight: 0.6
        },
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = await client.query(`
        INSERT INTO reminder_preferences (
          id, user_id, reminder_frequency, preferred_times, energy_based_adjustment,
          gentle_escalation, max_daily_reminders, quiet_hours, reminder_types_enabled,
          escalation_preferences, adaptive_learning, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        defaultPreferences.id,
        defaultPreferences.user_id,
        defaultPreferences.reminder_frequency,
        JSON.stringify(defaultPreferences.preferred_times),
        defaultPreferences.energy_based_adjustment,
        defaultPreferences.gentle_escalation,
        defaultPreferences.max_daily_reminders,
        JSON.stringify(defaultPreferences.quiet_hours),
        JSON.stringify(defaultPreferences.reminder_types_enabled),
        JSON.stringify(defaultPreferences.escalation_preferences),
        JSON.stringify(defaultPreferences.adaptive_learning),
        defaultPreferences.created_at,
        defaultPreferences.updated_at
      ]);

      return result.rows[0];

    } finally {
      client.release();
    }
  }
}