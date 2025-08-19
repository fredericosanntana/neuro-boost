import { FocusSession, Distraction, CreateFocusSessionData, UpdateFocusSessionData, FocusSessionStats } from '../models/FocusSession';
import { query } from '../config/database';
import { NotFoundError } from '../../src/lib/errors';
import { logger } from '../../src/lib/logger';

export class FocusService {
  static async createSession(sessionData: CreateFocusSessionData): Promise<FocusSession> {
    const { user_id, task_id, duration, ambient_sound } = sessionData;

    const result = await query(
      `INSERT INTO focus_sessions (user_id, task_id, duration, start_time, ambient_sound, distractions) 
       VALUES ($1, $2, $3, NOW(), $4, '[]'::jsonb) 
       RETURNING *`,
      [user_id, task_id, duration, ambient_sound]
    );

    const session = result.rows[0];
    session.distractions = JSON.parse(session.distractions || '[]');

    logger.info('Focus session created', { sessionId: session.id, userId: user_id, duration });
    return session;
  }

  static async updateSession(id: string, updateData: UpdateFocusSessionData): Promise<FocusSession> {
    const session = await this.getSessionById(id);
    if (!session) {
      throw new NotFoundError('Focus session');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'distractions') {
          fields.push(`${key} = $${paramCount}::jsonb`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return session;
    }

    values.push(id);
    const result = await query(
      `UPDATE focus_sessions SET ${fields.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramCount} 
       RETURNING *`,
      values
    );

    const updatedSession = result.rows[0];
    updatedSession.distractions = JSON.parse(updatedSession.distractions || '[]');

    logger.info('Focus session updated', { sessionId: id, updates: Object.keys(updateData) });
    return updatedSession;
  }

  static async getSessionById(id: string): Promise<FocusSession | null> {
    const result = await query(
      'SELECT * FROM focus_sessions WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const session = result.rows[0];
    session.distractions = JSON.parse(session.distractions || '[]');
    return session;
  }

  static async getSessionsByUserId(userId: string, limit: number = 10): Promise<FocusSession[]> {
    const result = await query(
      `SELECT * FROM focus_sessions 
       WHERE user_id = $1 
       ORDER BY start_time DESC 
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map(session => ({
      ...session,
      distractions: JSON.parse(session.distractions || '[]')
    }));
  }

  static async addDistraction(sessionId: string, distraction: Omit<Distraction, 'id'>): Promise<FocusSession> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new NotFoundError('Focus session');
    }

    const newDistraction: Distraction = {
      id: `dist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...distraction
    };

    const updatedDistractions = [...session.distractions, newDistraction];

    const updatedSession = await this.updateSession(sessionId, {
      distractions: updatedDistractions
    });

    logger.info('Distraction logged', { 
      sessionId, 
      distractionType: distraction.type,
      severity: distraction.severity 
    });

    return updatedSession;
  }

  static async completeSession(
    sessionId: string, 
    effectiveness_rating: number,
    interruption_reason: 'completed' | 'user_stopped' | 'hyperfocus_detected' | 'distraction' = 'completed'
  ): Promise<FocusSession> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new NotFoundError('Focus session');
    }

    const endTime = new Date();
    const actualDuration = Math.round((endTime.getTime() - session.start_time.getTime()) / (1000 * 60));
    
    const breakSuggestion = this.generateBreakSuggestion(actualDuration, effectiveness_rating);

    const updatedSession = await this.updateSession(sessionId, {
      end_time: endTime,
      completed: interruption_reason === 'completed',
      actual_duration: actualDuration,
      effectiveness_rating,
      interruption_reason,
      break_suggestion
    });

    logger.info('Focus session completed', { 
      sessionId, 
      actualDuration, 
      effectiveness: effectiveness_rating,
      reason: interruption_reason 
    });

    return updatedSession;
  }

  static async detectHyperfocus(sessionId: string): Promise<boolean> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      return false;
    }

    const currentTime = new Date();
    const sessionDuration = (currentTime.getTime() - session.start_time.getTime()) / (1000 * 60);

    // Hyperfocus detection: session running for more than 90 minutes
    if (sessionDuration > 90) {
      logger.warn('Hyperfocus detected', { sessionId, duration: sessionDuration });
      return true;
    }

    return false;
  }

  static async getSessionStats(userId: string): Promise<FocusSessionStats> {
    const result = await query(
      `SELECT 
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE completed = true) as completed_sessions,
        AVG(effectiveness_rating) as average_effectiveness,
        SUM(actual_duration) as total_focus_time,
        COUNT(*) FILTER (WHERE interruption_reason = 'hyperfocus_detected') as hyperfocus_incidents
       FROM focus_sessions 
       WHERE user_id = $1`,
      [userId]
    );

    const baseStats = result.rows[0];

    // Get most productive time
    const timeResult = await query(
      `SELECT EXTRACT(HOUR FROM start_time) as hour, AVG(effectiveness_rating) as avg_effectiveness
       FROM focus_sessions 
       WHERE user_id = $1 AND effectiveness_rating IS NOT NULL
       GROUP BY EXTRACT(HOUR FROM start_time)
       ORDER BY avg_effectiveness DESC
       LIMIT 1`,
      [userId]
    );

    const mostProductiveHour = timeResult.rows[0]?.hour || 9;

    // Get common distractions
    const distractionsResult = await query(
      `SELECT 
        distraction_data->>'type' as type,
        COUNT(*) as count
       FROM focus_sessions,
       jsonb_array_elements(distractions) as distraction_data
       WHERE user_id = $1
       GROUP BY distraction_data->>'type'
       ORDER BY count DESC
       LIMIT 5`,
      [userId]
    );

    return {
      total_sessions: parseInt(baseStats.total_sessions || '0'),
      completed_sessions: parseInt(baseStats.completed_sessions || '0'),
      average_effectiveness: parseFloat(baseStats.average_effectiveness || '0'),
      total_focus_time: parseInt(baseStats.total_focus_time || '0'),
      most_productive_time: `${mostProductiveHour}:00`,
      common_distractions: distractionsResult.rows,
      hyperfocus_incidents: parseInt(baseStats.hyperfocus_incidents || '0')
    };
  }

  private static generateBreakSuggestion(duration: number, effectiveness: number): string {
    const suggestions = {
      short: [
        'Take 3 deep breaths and stretch your arms',
        'Look away from screen for 20 seconds',
        'Do 10 jumping jacks',
        'Drink a glass of water'
      ],
      medium: [
        'Take a 5-minute walk',
        'Do some light stretching',
        'Step outside for fresh air',
        'Practice mindfulness for 3 minutes'
      ],
      long: [
        'Take a 15-20 minute walk',
        'Have a healthy snack',
        'Do some physical exercise',
        'Take a power nap (10-15 minutes)'
      ]
    };

    let category: 'short' | 'medium' | 'long';
    
    if (duration < 25) {
      category = 'short';
    } else if (duration < 60) {
      category = 'medium';
    } else {
      category = 'long';
    }

    // Adjust based on effectiveness
    if (effectiveness <= 2 && category === 'short') {
      category = 'medium';
    }

    const options = suggestions[category];
    return options[Math.floor(Math.random() * options.length)];
  }
}