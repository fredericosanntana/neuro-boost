import cron from 'node-cron';
import { ReminderService } from '../services/ReminderService.js';
import { 
  Reminder, 
  ReminderType, 
  ReminderPriority, 
  CreateReminderData 
} from '../models/Reminder.js';
import { pool } from '../config/database.js';
import { logger } from '../utils/logger.js';

export class ReminderScheduler {
  private reminderService: ReminderService;
  private isRunning: boolean = false;
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.reminderService = new ReminderService();
  }

  /**
   * Starts the reminder scheduling system
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Reminder scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting ADHD-aware reminder scheduler');

    // Main reminder processing job - runs every minute
    const mainJob = cron.schedule('* * * * *', async () => {
      await this.processScheduledReminders();
    }, { scheduled: false });

    // Energy pattern analysis job - runs every 15 minutes
    const energyJob = cron.schedule('*/15 * * * *', async () => {
      await this.analyzeEnergyPatterns();
    }, { scheduled: false });

    // Daily optimization job - runs at midnight
    const optimizationJob = cron.schedule('0 0 * * *', async () => {
      await this.optimizeDailyReminders();
    }, { scheduled: false });

    // Task deadline monitoring - runs every 5 minutes
    const deadlineJob = cron.schedule('*/5 * * * *', async () => {
      await this.checkUpcomingDeadlines();
    }, { scheduled: false });

    // Hyperfocus detection - runs every 30 minutes
    const hyperfocusJob = cron.schedule('*/30 * * * *', async () => {
      await this.detectHyperfocusSessions();
    }, { scheduled: false });

    this.scheduledJobs.set('main', mainJob);
    this.scheduledJobs.set('energy', energyJob);
    this.scheduledJobs.set('optimization', optimizationJob);
    this.scheduledJobs.set('deadline', deadlineJob);
    this.scheduledJobs.set('hyperfocus', hyperfocusJob);

    // Start all jobs
    this.scheduledJobs.forEach(job => job.start());

    logger.info('Reminder scheduler started successfully');
  }

  /**
   * Stops the reminder scheduling system
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.scheduledJobs.forEach(job => job.stop());
    this.scheduledJobs.clear();
    this.isRunning = false;

    logger.info('Reminder scheduler stopped');
  }

  /**
   * Processes all scheduled reminders that are due
   */
  private async processScheduledReminders(): Promise<void> {
    try {
      const pendingReminders = await this.reminderService.getPendingReminders();
      
      if (pendingReminders.length === 0) {
        return;
      }

      logger.info(`Processing ${pendingReminders.length} pending reminders`);

      for (const reminder of pendingReminders) {
        await this.sendReminder(reminder);
      }

    } catch (error) {
      logger.error('Error processing scheduled reminders:', error);
    }
  }

  /**
   * Sends a reminder and handles escalation logic
   */
  private async sendReminder(reminder: Reminder): Promise<void> {
    try {
      // Check if user is currently in a focus session
      const isInFocusSession = await this.checkUserFocusSession(reminder.user_id);
      
      // Adjust reminder strategy based on ADHD-specific considerations
      const shouldDelay = await this.shouldDelayReminder(reminder, isInFocusSession);
      
      if (shouldDelay) {
        await this.delayReminder(reminder.id, 10); // Delay by 10 minutes
        return;
      }

      // Mark reminder as sent
      await this.reminderService.updateReminderStatus(reminder.id, 'sent');

      // Send notification through appropriate channel
      await this.sendNotification(reminder);

      // Schedule escalation if needed
      await this.scheduleEscalation(reminder);

      logger.info(`Sent reminder ${reminder.id} to user ${reminder.user_id}`);

    } catch (error) {
      logger.error(`Error sending reminder ${reminder.id}:`, error);
    }
  }

  /**
   * Determines if a reminder should be delayed based on ADHD considerations
   */
  private async shouldDelayReminder(reminder: Reminder, isInFocusSession: boolean): Promise<boolean> {
    // Don't interrupt focus sessions unless urgent
    if (isInFocusSession && reminder.priority !== 'urgent') {
      return true;
    }

    // Check if user has received too many reminders recently
    const recentReminderCount = await this.getRecentReminderCount(reminder.user_id, 60); // Last hour
    const userPrefs = await this.getUserPreferences(reminder.user_id);
    
    if (recentReminderCount >= (userPrefs?.max_daily_reminders || 10)) {
      return true;
    }

    // Check if it's currently in user's quiet hours
    if (userPrefs?.quiet_hours) {
      const now = new Date();
      const timeOfDay = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (this.isInQuietHours(timeOfDay, userPrefs.quiet_hours)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Schedules automatic reminders based on task deadlines and user patterns
   */
  async scheduleAutomaticReminders(userId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      // Get user's upcoming tasks
      const tasksResult = await client.query(`
        SELECT * FROM tasks 
        WHERE user_id = $1 
          AND completed = false 
          AND due_date IS NOT NULL 
          AND due_date > CURRENT_TIMESTAMP
        ORDER BY due_date ASC
      `, [userId]);

      const tasks = tasksResult.rows;
      const userPrefs = await this.getUserPreferences(userId);

      for (const task of tasks) {
        await this.scheduleTaskReminders(task, userPrefs);
      }

      logger.info(`Scheduled automatic reminders for ${tasks.length} tasks for user ${userId}`);

    } catch (error) {
      logger.error('Error scheduling automatic reminders:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Schedules multiple reminders for a single task based on ADHD best practices
   */
  private async scheduleTaskReminders(task: any, userPrefs: any): Promise<void> {
    const dueDate = new Date(task.due_date);
    const now = new Date();
    const timeUntilDue = dueDate.getTime() - now.getTime();
    const hoursUntilDue = timeUntilDue / (1000 * 60 * 60);

    const reminders: CreateReminderData[] = [];

    // Task start reminder (immediate, if not already started)
    if (!task.started_at && userPrefs?.reminder_types_enabled?.task_start) {
      reminders.push({
        user_id: task.user_id,
        task_id: task.id,
        title: `Time to start: ${task.title}`,
        description: `Get started on "${task.title}". Break it down into smaller steps if needed.`,
        reminder_type: 'task_start',
        priority: 'medium',
        scheduled_time: new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes from now
      });
    }

    // Deadline warnings based on time remaining
    if (userPrefs?.reminder_types_enabled?.deadline_warning) {
      if (hoursUntilDue > 24) {
        // 24 hours before deadline
        reminders.push({
          user_id: task.user_id,
          task_id: task.id,
          title: `Deadline tomorrow: ${task.title}`,
          description: `"${task.title}" is due tomorrow. Make sure you have enough time to complete it.`,
          reminder_type: 'deadline_warning',
          priority: 'high',
          scheduled_time: new Date(dueDate.getTime() - 24 * 60 * 60 * 1000)
        });
      }

      if (hoursUntilDue > 2) {
        // 2 hours before deadline
        reminders.push({
          user_id: task.user_id,
          task_id: task.id,
          title: `Final reminder: ${task.title}`,
          description: `Only 2 hours left for "${task.title}". Focus time!`,
          reminder_type: 'deadline_warning',
          priority: 'urgent',
          scheduled_time: new Date(dueDate.getTime() - 2 * 60 * 60 * 1000)
        });
      }
    }

    // Create all reminders
    for (const reminderData of reminders) {
      await this.reminderService.createAdaptiveReminder(reminderData);
    }
  }

  /**
   * Detects hyperfocus sessions and schedules break reminders
   */
  private async detectHyperfocusSessions(): Promise<void> {
    const client = await pool.connect();
    
    try {
      // Find active focus sessions longer than 90 minutes
      const hyperfocusResult = await client.query(`
        SELECT fs.*, u.id as user_id
        FROM focus_sessions fs
        JOIN users u ON fs.user_id = u.id
        LEFT JOIN reminder_preferences rp ON u.id = rp.user_id
        WHERE fs.end_time IS NULL
          AND fs.start_time < CURRENT_TIMESTAMP - INTERVAL '90 minutes'
          AND (rp.reminder_types_enabled->>'hyperfocus_break')::boolean = true
      `);

      for (const session of hyperfocusResult.rows) {
        // Check if we've already sent a hyperfocus reminder for this session
        const existingReminder = await client.query(`
          SELECT id FROM reminders 
          WHERE user_id = $1 
            AND reminder_type = 'hyperfocus_break'
            AND context_data->>'current_focus_session_id' = $2
            AND created_at > $3
        `, [session.user_id, session.id, session.start_time]);

        if (existingReminder.rows.length === 0) {
          // Create hyperfocus break reminder
          await this.reminderService.createAdaptiveReminder({
            user_id: session.user_id,
            title: 'Take a break! You\'ve been hyperfocusing',
            description: 'You\'ve been in deep focus for over 90 minutes. Your brain needs a rest to maintain peak performance.',
            reminder_type: 'hyperfocus_break',
            priority: 'high',
            scheduled_time: new Date(), // Send immediately
            context_data: {
              current_focus_session_id: session.id
            }
          });

          logger.info(`Created hyperfocus break reminder for user ${session.user_id}`);
        }
      }

    } catch (error) {
      logger.error('Error detecting hyperfocus sessions:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Analyzes user energy patterns and suggests optimal reminder times
   */
  private async analyzeEnergyPatterns(): Promise<void> {
    const client = await pool.connect();
    
    try {
      // Get users with energy-based adjustment enabled
      const usersResult = await client.query(`
        SELECT DISTINCT user_id 
        FROM reminder_preferences 
        WHERE energy_based_adjustment = true
      `);

      for (const user of usersResult.rows) {
        await this.updateUserEnergyInsights(user.user_id);
      }

    } catch (error) {
      logger.error('Error analyzing energy patterns:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Optimizes daily reminders based on user patterns and effectiveness
   */
  private async optimizeDailyReminders(): Promise<void> {
    const client = await pool.connect();
    
    try {
      // Get all users with adaptive learning enabled
      const usersResult = await client.query(`
        SELECT user_id 
        FROM reminder_preferences 
        WHERE (adaptive_learning->>'enabled')::boolean = true
      `);

      for (const user of usersResult.rows) {
        await this.optimizeUserReminders(user.user_id);
      }

      logger.info('Completed daily reminder optimization');

    } catch (error) {
      logger.error('Error optimizing daily reminders:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Checks for upcoming task deadlines and creates proactive reminders
   */
  private async checkUpcomingDeadlines(): Promise<void> {
    const client = await pool.connect();
    
    try {
      // Find tasks with deadlines in the next 48 hours that don't have reminders yet
      const deadlineResult = await client.query(`
        SELECT t.*, rp.reminder_types_enabled
        FROM tasks t
        LEFT JOIN reminder_preferences rp ON t.user_id = rp.user_id
        WHERE t.completed = false
          AND t.due_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '48 hours'
          AND NOT EXISTS (
            SELECT 1 FROM reminders r 
            WHERE r.task_id = t.id 
              AND r.reminder_type = 'deadline_warning'
              AND r.status IN ('scheduled', 'sent')
          )
          AND (rp.reminder_types_enabled->>'deadline_warning')::boolean = true
      `);

      for (const task of deadlineResult.rows) {
        const timeUntilDue = new Date(task.due_date).getTime() - new Date().getTime();
        const hoursUntilDue = timeUntilDue / (1000 * 60 * 60);

        let priority: ReminderPriority = 'medium';
        if (hoursUntilDue < 6) priority = 'urgent';
        else if (hoursUntilDue < 24) priority = 'high';

        await this.reminderService.createAdaptiveReminder({
          user_id: task.user_id,
          task_id: task.id,
          title: `Deadline approaching: ${task.title}`,
          description: `"${task.title}" is due in ${Math.round(hoursUntilDue)} hours. ${hoursUntilDue < 6 ? 'This is urgent!' : 'Plan your time accordingly.'}`,
          reminder_type: 'deadline_warning',
          priority: priority,
          scheduled_time: new Date() // Send immediately
        });
      }

    } catch (error) {
      logger.error('Error checking upcoming deadlines:', error);
    } finally {
      client.release();
    }
  }

  // Helper methods
  private async sendNotification(reminder: Reminder): Promise<void> {
    // Implementation would integrate with push notification service, email, etc.
    // For now, we'll just log the notification
    logger.info(`📱 NOTIFICATION: [${reminder.reminder_type.toUpperCase()}] ${reminder.title}`);
    
    // Here you would integrate with:
    // - Push notification services (FCM, APNS)
    // - Email services
    // - In-app notifications
    // - SMS services for urgent reminders
  }

  private async scheduleEscalation(reminder: Reminder): Promise<void> {
    if (reminder.escalation_level < reminder.max_escalations) {
      // Schedule escalation check in 15 minutes
      setTimeout(async () => {
        await this.checkReminderResponse(reminder.id);
      }, 15 * 60 * 1000);
    }
  }

  private async checkReminderResponse(reminderId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM reminders WHERE id = $1 AND status = $2',
        [reminderId, 'sent']
      );

      if (result.rows.length > 0) {
        // User hasn't responded, escalate
        await this.reminderService.escalateReminder(reminderId);
      }

    } catch (error) {
      logger.error('Error checking reminder response:', error);
    } finally {
      client.release();
    }
  }

  private async checkUserFocusSession(userId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id FROM focus_sessions WHERE user_id = $1 AND end_time IS NULL',
        [userId]
      );
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  private async getRecentReminderCount(userId: string, minutesBack: number): Promise<number> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT COUNT(*) as count 
        FROM reminders 
        WHERE user_id = $1 
          AND actual_sent_time > CURRENT_TIMESTAMP - INTERVAL '${minutesBack} minutes'
      `, [userId]);
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  private async getUserPreferences(userId: string): Promise<any> {
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

  private async delayReminder(reminderId: string, delayMinutes: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE reminders 
        SET scheduled_time = scheduled_time + INTERVAL '${delayMinutes} minutes',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [reminderId]);
    } finally {
      client.release();
    }
  }

  private isInQuietHours(timeOfDay: string, quietHours: { start: string; end: string }): boolean {
    const time = this.timeToMinutes(timeOfDay);
    const start = this.timeToMinutes(quietHours.start);
    const end = this.timeToMinutes(quietHours.end);
    
    if (start <= end) {
      return time >= start && time <= end;
    } else {
      return time >= start || time <= end;
    }
  }

  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private async updateUserEnergyInsights(userId: string): Promise<void> {
    // Analyze recent energy patterns and update insights
    logger.info(`Updating energy insights for user ${userId}`);
  }

  private async optimizeUserReminders(userId: string): Promise<void> {
    // Use machine learning to optimize reminder timing
    logger.info(`Optimizing reminders for user ${userId}`);
  }
}