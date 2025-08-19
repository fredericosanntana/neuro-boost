import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FocusService } from '../FocusService';
import { query } from '../../config/database';

// Mock the database query function
vi.mock('../../config/database', () => ({
  query: vi.fn(),
}));

// Mock the logger
vi.mock('../../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('FocusService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('creates a new focus session successfully', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-1',
        task_id: 'task-1',
        duration: 25,
        start_time: new Date(),
        distractions: '[]',
        ambient_sound: 'brown-noise'
      };

      (query as any).mockResolvedValueOnce({ rows: [mockSession] });

      const sessionData = {
        user_id: 'user-1',
        task_id: 'task-1',
        duration: 25,
        ambient_sound: 'brown-noise'
      };

      const result = await FocusService.createSession(sessionData);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO focus_sessions'),
        ['user-1', 'task-1', 25, 'brown-noise']
      );

      expect(result).toEqual({
        ...mockSession,
        distractions: []
      });
    });

    it('creates session without optional fields', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-1',
        duration: 45,
        start_time: new Date(),
        distractions: '[]',
        ambient_sound: null
      };

      (query as any).mockResolvedValueOnce({ rows: [mockSession] });

      const sessionData = {
        user_id: 'user-1',
        duration: 45
      };

      const result = await FocusService.createSession(sessionData);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO focus_sessions'),
        ['user-1', undefined, 45, undefined]
      );

      expect(result.duration).toBe(45);
      expect(result.distractions).toEqual([]);
    });
  });

  describe('addDistraction', () => {
    it('adds a distraction to an existing session', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-1',
        distractions: '[]'
      };

      const updatedSession = {
        ...mockSession,
        distractions: JSON.stringify([{
          id: expect.any(String),
          type: 'thought',
          severity: 2,
          timestamp: expect.any(Date)
        }])
      };

      // Mock getting the session
      (query as any).mockResolvedValueOnce({ rows: [mockSession] });
      // Mock updating the session
      (query as any).mockResolvedValueOnce({ rows: [updatedSession] });

      const distraction = {
        type: 'thought' as const,
        severity: 2 as const,
        timestamp: new Date()
      };

      const result = await FocusService.addDistraction('session-123', distraction);

      expect(result.distractions).toHaveLength(1);
      expect(result.distractions[0]).toMatchObject({
        type: 'thought',
        severity: 2,
        id: expect.any(String)
      });
    });

    it('throws error when session not found', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });

      const distraction = {
        type: 'noise' as const,
        severity: 3 as const,
        timestamp: new Date()
      };

      await expect(FocusService.addDistraction('nonexistent', distraction))
        .rejects.toThrow('Focus session not found');
    });
  });

  describe('detectHyperfocus', () => {
    it('detects hyperfocus when session exceeds 90 minutes', async () => {
      const startTime = new Date(Date.now() - 95 * 60 * 1000); // 95 minutes ago
      const mockSession = {
        id: 'session-123',
        start_time: startTime,
        distractions: '[]'
      };

      (query as any).mockResolvedValueOnce({ rows: [mockSession] });

      const result = await FocusService.detectHyperfocus('session-123');

      expect(result).toBe(true);
    });

    it('does not detect hyperfocus for sessions under 90 minutes', async () => {
      const startTime = new Date(Date.now() - 60 * 60 * 1000); // 60 minutes ago
      const mockSession = {
        id: 'session-123',
        start_time: startTime,
        distractions: '[]'
      };

      (query as any).mockResolvedValueOnce({ rows: [mockSession] });

      const result = await FocusService.detectHyperfocus('session-123');

      expect(result).toBe(false);
    });

    it('returns false when session not found', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });

      const result = await FocusService.detectHyperfocus('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('completeSession', () => {
    it('completes session with effectiveness rating', async () => {
      const startTime = new Date(Date.now() - 25 * 60 * 1000); // 25 minutes ago
      const mockSession = {
        id: 'session-123',
        user_id: 'user-1',
        start_time: startTime,
        duration: 25,
        distractions: '[]'
      };

      const completedSession = {
        ...mockSession,
        end_time: new Date(),
        completed: true,
        actual_duration: 25,
        effectiveness_rating: 4,
        interruption_reason: 'completed',
        break_suggestion: 'Take a 5-minute walk'
      };

      // Mock getting the session
      (query as any).mockResolvedValueOnce({ rows: [mockSession] });
      // Mock updating the session
      (query as any).mockResolvedValueOnce({ rows: [completedSession] });

      const result = await FocusService.completeSession('session-123', 4, 'completed');

      expect(result.completed).toBe(true);
      expect(result.effectiveness_rating).toBe(4);
      expect(result.actual_duration).toBe(25);
      expect(result.break_suggestion).toBeDefined();
    });

    it('handles hyperfocus interruption', async () => {
      const startTime = new Date(Date.now() - 95 * 60 * 1000); // 95 minutes ago
      const mockSession = {
        id: 'session-123',
        user_id: 'user-1',
        start_time: startTime,
        duration: 25,
        distractions: '[]'
      };

      const interruptedSession = {
        ...mockSession,
        end_time: new Date(),
        completed: false,
        actual_duration: 95,
        effectiveness_rating: 3,
        interruption_reason: 'hyperfocus_detected'
      };

      // Mock getting the session
      (query as any).mockResolvedValueOnce({ rows: [mockSession] });
      // Mock updating the session
      (query as any).mockResolvedValueOnce({ rows: [interruptedSession] });

      const result = await FocusService.completeSession('session-123', 3, 'hyperfocus_detected');

      expect(result.completed).toBe(false);
      expect(result.interruption_reason).toBe('hyperfocus_detected');
      expect(result.actual_duration).toBe(95);
    });
  });

  describe('getSessionStats', () => {
    it('calculates session statistics correctly', async () => {
      const mockStatsData = {
        total_sessions: '10',
        completed_sessions: '8',
        average_effectiveness: '3.5',
        total_focus_time: '250',
        hyperfocus_incidents: '2'
      };

      const mockTimeData = {
        hour: 9,
        avg_effectiveness: 4.2
      };

      const mockDistractionsData = [
        { type: 'thought', count: '15' },
        { type: 'noise', count: '8' },
        { type: 'notification', count: '5' }
      ];

      // Mock the three database queries
      (query as any)
        .mockResolvedValueOnce({ rows: [mockStatsData] })
        .mockResolvedValueOnce({ rows: [mockTimeData] })
        .mockResolvedValueOnce({ rows: mockDistractionsData });

      const result = await FocusService.getSessionStats('user-1');

      expect(result).toEqual({
        total_sessions: 10,
        completed_sessions: 8,
        average_effectiveness: 3.5,
        total_focus_time: 250,
        most_productive_time: '9:00',
        common_distractions: mockDistractionsData,
        hyperfocus_incidents: 2
      });
    });

    it('handles empty statistics gracefully', async () => {
      const emptyStatsData = {
        total_sessions: null,
        completed_sessions: null,
        average_effectiveness: null,
        total_focus_time: null,
        hyperfocus_incidents: null
      };

      // Mock the three database queries
      (query as any)
        .mockResolvedValueOnce({ rows: [emptyStatsData] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await FocusService.getSessionStats('user-1');

      expect(result).toEqual({
        total_sessions: 0,
        completed_sessions: 0,
        average_effectiveness: 0,
        total_focus_time: 0,
        most_productive_time: '9:00', // default value
        common_distractions: [],
        hyperfocus_incidents: 0
      });
    });
  });
});