import { 
  Reminder, 
  ReminderPreferences, 
  ReminderLog, 
  EnergyPattern,
  CreateReminderData,
  UpdateReminderData,
  ReminderType,
  ReminderPriority,
  ReminderStatus,
  ReminderResponse,
  ReminderAnalytics
} from '../models/Reminder.js';
import { pool } from '../config/database.js';
import { logger } from '../utils/logger.js';

export class ReminderService {
  
  /**
   * Creates an intelligent reminder with ADHD-specific timing optimization
   */
  async createAdaptiveReminder(data: CreateReminderData): Promise<Reminder> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get user preferences and energy patterns
      const preferences = await this.getUserPreferences(data.user_id);
      const energyPatterns = await this.getUserEnergyPatterns(data.user_id);
      
      // Calculate optimal timing based on ADHD patterns
      const optimizedTime = await this.calculateOptimalReminderTime(
        data.scheduled_time,
        data.reminder_type,
        preferences,
        energyPatterns,
        data.user_id
      );
      
      const reminder: Reminder = {
        id: crypto.randomUUID(),
        user_id: data.user_id,
        task_id: data.task_id,
        title: data.title,
        description: data.description,
        reminder_type: data.reminder_type,
        priority: data.priority,
        scheduled_time: optimizedTime,
        status: 'scheduled',
        escalation_level: data.escalation_level || 0,
        max_escalations: data.max_escalations || preferences?.escalation_preferences.max_escalations || 3,
        context_data: {
          ...data.context_data,
          user_energy_level: await this.predictUserEnergyLevel(data.user_id, optimizedTime)
        },
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Insert reminder into database
      await client.query(`
        INSERT INTO reminders (
          id, user_id, task_id, title, description, reminder_type, priority,
          scheduled_time, status, escalation_level, max_escalations, context_data,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        reminder.id, reminder.user_id, reminder.task_id, reminder.title, 
        reminder.description, reminder.reminder_type, reminder.priority,
        reminder.scheduled_time, reminder.status, reminder.escalation_level,
        reminder.max_escalations, JSON.stringify(reminder.context_data),
        reminder.created_at, reminder.updated_at
      ]);
      
      await client.query('COMMIT');
      
      logger.info(`Created adaptive reminder ${reminder.id} for user ${data.user_id} at ${optimizedTime}`);
      
      return reminder;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating adaptive reminder:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Calculates optimal reminder time based on user energy patterns and ADHD considerations
   */
  private async calculateOptimalReminderTime(
    requestedTime: Date,
    reminderType: ReminderType,
    preferences: ReminderPreferences | null,
    energyPatterns: EnergyPattern[],
    userId: string
  ): Promise<Date> {
    
    if (!preferences?.energy_based_adjustment) {
      return requestedTime;
    }
    
    const dayOfWeek = requestedTime.getDay();
    const timeOfDay = `${requestedTime.getHours().toString().padStart(2, '0')}:${requestedTime.getMinutes().toString().padStart(2, '0')}`;
    
    // Check if requested time falls in quiet hours
    if (preferences.quiet_hours && this.isInQuietHours(timeOfDay, preferences.quiet_hours)) {
      const nextAvailableTime = this.findNextAvailableTime(requestedTime, preferences);
      logger.info(`Adjusted reminder time from ${requestedTime} to ${nextAvailableTime} (quiet hours)`);
      return nextAvailableTime;
    }
    
    // Find optimal energy level for this reminder type
    const optimalEnergyLevel = this.getOptimalEnergyLevelForReminderType(reminderType);
    
    // Find time slots with similar energy levels
    const suitableTimeSlots = energyPatterns.filter(pattern => 
      pattern.day_of_week === dayOfWeek &&
      Math.abs(pattern.average_energy_level - optimalEnergyLevel) <= 2
    );
    
    if (suitableTimeSlots.length === 0) {
      return requestedTime; // No energy data available, use requested time
    }
    
    // Find the closest suitable time slot
    const requestedMinutes = requestedTime.getHours() * 60 + requestedTime.getMinutes();
    let bestTimeSlot = suitableTimeSlots[0];
    let minTimeDifference = Infinity;
    
    for (const slot of suitableTimeSlots) {
      const [hours, minutes] = slot.time_slot.split(':').map(Number);
      const slotMinutes = hours * 60 + minutes;
      const timeDifference = Math.abs(requestedMinutes - slotMinutes);
      
      if (timeDifference < minTimeDifference) {
        minTimeDifference = timeDifference;
        bestTimeSlot = slot;
      }
    }
    
    // Don't adjust if the difference is more than 2 hours (unless high priority)
    const maxAdjustmentMinutes = reminderType === 'deadline_warning' ? 240 : 120;
    if (minTimeDifference > maxAdjustmentMinutes) {
      return requestedTime;
    }
    
    // Create optimized time
    const [optimalHours, optimalMinutes] = bestTimeSlot.time_slot.split(':').map(Number);
    const optimizedTime = new Date(requestedTime);
    optimizedTime.setHours(optimalHours, optimalMinutes, 0, 0);
    
    return optimizedTime;
  }
  
  /**
   * Implements escalating reminder strategy for ADHD users
   */
  async escalateReminder(reminderId: string): Promise<Reminder | null> {
    const client = await pool.connect();
    
    try {
      // Get current reminder
      const result = await client.query(
        'SELECT * FROM reminders WHERE id = $1',
        [reminderId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const reminder = result.rows[0] as Reminder;
      
      if (reminder.escalation_level >= reminder.max_escalations) {
        // Max escalations reached, mark as expired
        await this.updateReminderStatus(reminderId, 'expired');
        logger.info(`Reminder ${reminderId} expired after max escalations`);
        return reminder;
      }
      
      // Get user preferences for escalation strategy
      const preferences = await this.getUserPreferences(reminder.user_id);
      const escalationInterval = preferences?.escalation_preferences.escalation_interval_minutes || 15;
      
      // Calculate next escalation time
      const nextEscalationTime = new Date();
      nextEscalationTime.setMinutes(nextEscalationTime.getMinutes() + escalationInterval);
      
      // Update reminder with escalation
      const updatedReminder = await client.query(`
        UPDATE reminders 
        SET escalation_level = escalation_level + 1,
            scheduled_time = $1,
            status = 'scheduled',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [nextEscalationTime, reminderId]);
      
      logger.info(`Escalated reminder ${reminderId} to level ${reminder.escalation_level + 1}`);
      
      return updatedReminder.rows[0];
      
    } catch (error) {
      logger.error('Error escalating reminder:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Records user response and learns from effectiveness
   */
  async recordReminderResponse(
    reminderId: string, 
    response: ReminderResponse,
    responseTimeSeconds: number,
    effectivenessRating?: number,
    userEnergyBefore?: number,
    userEnergyAfter?: number
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get reminder details
      const reminder = await this.getReminderById(reminderId);
      if (!reminder) {
        throw new Error('Reminder not found');
      }
      
      // Create reminder log entry
      const logEntry: ReminderLog = {
        id: crypto.randomUUID(),
        reminder_id: reminderId,
        user_id: reminder.user_id,
        sent_at: reminder.actual_sent_time || new Date(),
        user_response: response,
        response_time_seconds: responseTimeSeconds,
        effectiveness_rating: effectivenessRating,
        user_energy_before: userEnergyBefore,
        user_energy_after: userEnergyAfter,
        context_factors: {
          time_of_day: new Date().toTimeString().slice(0, 5),
          day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          focus_session_active: !!reminder.context_data?.current_focus_session_id,
          task_complexity: reminder.context_data?.estimated_task_duration ? 
            (reminder.context_data.estimated_task_duration > 60 ? 3 : 
             reminder.context_data.estimated_task_duration > 30 ? 2 : 1) : undefined,
          recent_break_taken: await this.checkRecentBreakTaken(reminder.user_id)
        },
        created_at: new Date()
      };
      
      await client.query(`
        INSERT INTO reminder_logs (
          id, reminder_id, user_id, sent_at, user_response, response_time_seconds,
          effectiveness_rating, user_energy_before, user_energy_after, context_factors,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        logEntry.id, logEntry.reminder_id, logEntry.user_id, logEntry.sent_at,
        logEntry.user_response, logEntry.response_time_seconds, logEntry.effectiveness_rating,
        logEntry.user_energy_before, logEntry.user_energy_after, 
        JSON.stringify(logEntry.context_factors), logEntry.created_at
      ]);
      
      // Update reminder status based on response
      let newStatus: ReminderStatus;
      switch (response) {
        case 'acknowledged':
        case 'completed_task':
          newStatus = 'acknowledged';
          break;
        case 'snoozed_5min':
        case 'snoozed_15min':
        case 'snoozed_30min':
          newStatus = 'snoozed';
          break;
        case 'dismissed':
        case 'not_now':
          newStatus = 'dismissed';
          break;
        default:
          newStatus = 'acknowledged';
      }
      
      await this.updateReminderStatus(reminderId, newStatus);
      
      // Update energy patterns if energy data provided
      if (userEnergyBefore !== undefined) {
        await this.updateEnergyPattern(reminder.user_id, userEnergyBefore);
      }
      
      // Learn from effectiveness for future reminders
      if (effectivenessRating !== undefined && effectivenessRating > 0) {
        await this.updateAdaptiveLearning(reminder.user_id, logEntry);
      }
      
      await client.query('COMMIT');
      
      logger.info(`Recorded response for reminder ${reminderId}: ${response}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error recording reminder response:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Predicts optimal reminder times based on historical effectiveness
   */
  async getOptimalReminderTimes(userId: string, reminderType: ReminderType): Promise<string[]> {
    const client = await pool.connect();
    
    try {
      // Get historical effectiveness data
      const result = await client.query(`
        SELECT 
          EXTRACT(HOUR FROM rl.sent_at) as hour,
          AVG(rl.effectiveness_rating) as avg_effectiveness,
          COUNT(*) as sample_count
        FROM reminder_logs rl
        JOIN reminders r ON rl.reminder_id = r.id
        WHERE rl.user_id = $1 
          AND r.reminder_type = $2
          AND rl.effectiveness_rating IS NOT NULL
          AND rl.sent_at > CURRENT_DATE - INTERVAL '30 days'
        GROUP BY EXTRACT(HOUR FROM rl.sent_at)
        HAVING COUNT(*) >= 3
        ORDER BY avg_effectiveness DESC, sample_count DESC
        LIMIT 5
      `, [userId, reminderType]);
      
      const optimalTimes = result.rows.map(row => 
        `${row.hour.toString().padStart(2, '0')}:00`
      );
      
      return optimalTimes.length > 0 ? optimalTimes : ['09:00', '14:00', '16:00']; // Default times
      
    } catch (error) {
      logger.error('Error getting optimal reminder times:', error);
      return ['09:00', '14:00', '16:00']; // Fallback to default times
    } finally {
      client.release();
    }
  }
  
  /**
   * Gets pending reminders that should be sent now
   */
  async getPendingReminders(): Promise<Reminder[]> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM reminders 
        WHERE status = 'scheduled' 
          AND scheduled_time <= CURRENT_TIMESTAMP
        ORDER BY priority DESC, scheduled_time ASC
      `);
      
      return result.rows;
      
    } catch (error) {
      logger.error('Error getting pending reminders:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Updates reminder status
   */
  async updateReminderStatus(reminderId: string, status: ReminderStatus): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query(`
        UPDATE reminders 
        SET status = $1, 
            actual_sent_time = CASE WHEN $1 = 'sent' THEN CURRENT_TIMESTAMP ELSE actual_sent_time END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [status, reminderId]);
      
    } catch (error) {
      logger.error('Error updating reminder status:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Helper methods
  private async getUserPreferences(userId: string): Promise<ReminderPreferences | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM reminder_preferences WHERE user_id = $1',
        [userId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
  
  private async getUserEnergyPatterns(userId: string): Promise<EnergyPattern[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM energy_patterns WHERE user_id = $1 ORDER BY average_energy_level DESC',
        [userId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
  
  private async getReminderById(reminderId: string): Promise<Reminder | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM reminders WHERE id = $1',
        [reminderId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
  
  private async predictUserEnergyLevel(userId: string, time: Date): Promise<number> {
    const client = await pool.connect();
    try {
      const dayOfWeek = time.getDay();
      const hour = time.getHours();
      
      const result = await client.query(`
        SELECT AVG(average_energy_level) as predicted_energy
        FROM energy_patterns 
        WHERE user_id = $1 
          AND day_of_week = $2 
          AND EXTRACT(HOUR FROM time_slot::time) = $3
      `, [userId, dayOfWeek, hour]);
      
      return result.rows[0]?.predicted_energy || 5; // Default to medium energy
    } finally {
      client.release();
    }
  }
  
  private getOptimalEnergyLevelForReminderType(reminderType: ReminderType): number {
    const energyRequirements: Record<ReminderType, number> = {
      'task_start': 7,        // Need high energy to start tasks
      'break_reminder': 3,    // Low energy is fine for breaks
      'deadline_warning': 8,  // Need high energy for urgent tasks
      'energy_check': 5,      // Neutral
      'hyperfocus_break': 2,  // User is already focused, any energy is fine
      'medication_reminder': 5, // Neutral
      'transition_warning': 6   // Medium-high energy for transitions
    };
    
    return energyRequirements[reminderType] || 5;
  }
  
  private isInQuietHours(timeOfDay: string, quietHours: { start: string; end: string }): boolean {
    const time = this.timeToMinutes(timeOfDay);
    const start = this.timeToMinutes(quietHours.start);
    const end = this.timeToMinutes(quietHours.end);
    
    if (start <= end) {
      return time >= start && time <= end;
    } else {
      // Quiet hours span midnight
      return time >= start || time <= end;
    }
  }
  
  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  private findNextAvailableTime(requestedTime: Date, preferences: ReminderPreferences): Date {
    const quietEnd = this.timeToMinutes(preferences.quiet_hours.end);
    const nextTime = new Date(requestedTime);
    nextTime.setHours(Math.floor(quietEnd / 60), quietEnd % 60, 0, 0);
    
    // If quiet hours end is earlier in the day, move to next day
    if (nextTime <= requestedTime) {
      nextTime.setDate(nextTime.getDate() + 1);
    }
    
    return nextTime;
  }
  
  private async checkRecentBreakTaken(userId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT COUNT(*) as break_count
        FROM focus_sessions 
        WHERE user_id = $1 
          AND end_time IS NOT NULL
          AND end_time > CURRENT_TIMESTAMP - INTERVAL '30 minutes'
      `, [userId]);
      
      return parseInt(result.rows[0].break_count) > 0;
    } finally {
      client.release();
    }
  }
  
  private async updateEnergyPattern(userId: string, energyLevel: number): Promise<void> {
    const client = await pool.connect();
    try {
      const now = new Date();
      const timeSlot = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const dayOfWeek = now.getDay();
      
      await client.query(`
        INSERT INTO energy_patterns (id, user_id, time_slot, day_of_week, average_energy_level, sample_count, last_updated, created_at)
        VALUES ($1, $2, $3, $4, $5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, time_slot, day_of_week)
        DO UPDATE SET 
          average_energy_level = (energy_patterns.average_energy_level * energy_patterns.sample_count + $5) / (energy_patterns.sample_count + 1),
          sample_count = energy_patterns.sample_count + 1,
          last_updated = CURRENT_TIMESTAMP
      `, [crypto.randomUUID(), userId, timeSlot, dayOfWeek, energyLevel]);
      
    } finally {
      client.release();
    }
  }
  
  private async updateAdaptiveLearning(userId: string, logEntry: ReminderLog): Promise<void> {
    // Implement machine learning logic to improve future reminder timing
    // This could involve updating weights based on effectiveness ratings
    logger.info(`Learning from reminder effectiveness: ${logEntry.effectiveness_rating} for user ${userId}`);
  }
}