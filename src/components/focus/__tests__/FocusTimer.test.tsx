import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { FocusTimer } from '../FocusTimer';
import { apiClient } from '@/lib/api-client';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    request: vi.fn(),
    createFocusSession: vi.fn(),
    completeFocusSession: vi.fn(),
    checkHyperfocus: vi.fn(),
    addDistraction: vi.fn(),
  }
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('FocusTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders timer with default 25 minute duration', () => {
    render(<FocusTimer />);
    
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('Start Focus Session')).toBeInTheDocument();
    expect(screen.getByText('Adaptive Focus Timer')).toBeInTheDocument();
  });

  it('allows changing session duration in settings', () => {
    render(<FocusTimer />);
    
    // Open settings
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    
    // Change duration to 45 minutes
    const durationSelect = screen.getByRole('combobox');
    fireEvent.click(durationSelect);
    fireEvent.click(screen.getByText('45 minutes (Deep Work)'));
    
    expect(screen.getByText('45:00')).toBeInTheDocument();
  });

  it('starts a focus session successfully', async () => {
    const mockSession = {
      id: 'session-123',
      user_id: 'user-1',
      duration: 25,
      start_time: new Date().toISOString(),
    };

    (apiClient.request as any).mockResolvedValueOnce({ session: mockSession });

    render(<FocusTimer />);
    
    fireEvent.click(screen.getByText('Start Focus Session'));
    
    await waitFor(() => {
      expect(apiClient.request).toHaveBeenCalledWith('/focus/sessions', {
        method: 'POST',
        body: JSON.stringify({
          task_id: undefined,
          duration: 25,
          ambient_sound: ''
        })
      });
    });

    expect(screen.getByText('Pause')).toBeInTheDocument();
    expect(screen.getByText('Stop')).toBeInTheDocument();
  });

  it('completes session after timer runs out', async () => {
    const mockSession = {
      id: 'session-123',
      user_id: 'user-1',
      duration: 25,
      start_time: new Date().toISOString(),
    };

    (apiClient.request as any).mockResolvedValueOnce({ session: mockSession });
    (apiClient.request as any).mockResolvedValueOnce({ session: { ...mockSession, completed: true } });

    render(<FocusTimer />);
    
    // Start session
    fireEvent.click(screen.getByText('Start Focus Session'));
    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });

    // Fast forward time to complete the session (25 minutes = 1500 seconds)
    vi.advanceTimersByTime(1500 * 1000);

    await waitFor(() => {
      expect(screen.getByText('How effective was this session?')).toBeInTheDocument();
    });

    // Rate effectiveness and complete
    fireEvent.click(screen.getByText('4'));
    fireEvent.click(screen.getByText('Complete Session'));

    await waitFor(() => {
      expect(apiClient.request).toHaveBeenCalledWith('/focus/sessions/session-123/complete', {
        method: 'POST',
        body: JSON.stringify({
          effectiveness_rating: 4,
          interruption_reason: 'completed'
        })
      });
    });
  });

  it('detects hyperfocus after 90 minutes', async () => {
    const mockSession = {
      id: 'session-123',
      user_id: 'user-1',
      duration: 25,
      start_time: new Date(Date.now() - 91 * 60 * 1000).toISOString(), // Started 91 minutes ago
    };

    (apiClient.request as any).mockResolvedValueOnce({ session: mockSession });
    (apiClient.request as any).mockResolvedValue({ 
      hyperfocus_detected: true,
      session_id: 'session-123',
      current_duration: 91
    });

    render(<FocusTimer />);
    
    // Start session
    fireEvent.click(screen.getByText('Start Focus Session'));
    
    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });

    // Advance time to trigger hyperfocus check (1 minute intervals)
    vi.advanceTimersByTime(60 * 1000);

    await waitFor(() => {
      expect(apiClient.request).toHaveBeenCalledWith('/focus/sessions/session-123/hyperfocus-check');
    });
  });

  it('logs distractions during session', async () => {
    const mockSession = {
      id: 'session-123',
      user_id: 'user-1',
      duration: 25,
      start_time: new Date().toISOString(),
    };

    (apiClient.request as any).mockResolvedValueOnce({ session: mockSession });
    (apiClient.request as any).mockResolvedValueOnce({ session: { ...mockSession, distractions: [] } });

    render(<FocusTimer />);
    
    // Start session
    fireEvent.click(screen.getByText('Start Focus Session'));
    
    await waitFor(() => {
      expect(screen.getByText('Quick Distraction Log')).toBeInTheDocument();
    });

    // Log a thought distraction
    fireEvent.click(screen.getByText('Thought'));

    await waitFor(() => {
      expect(apiClient.request).toHaveBeenCalledWith('/focus/sessions/session-123/distractions', {
        method: 'POST',
        body: JSON.stringify({
          type: 'thought',
          severity: 2,
          description: ''
        })
      });
    });
  });

  it('handles pause and resume functionality', async () => {
    const mockSession = {
      id: 'session-123',
      user_id: 'user-1',
      duration: 25,
      start_time: new Date().toISOString(),
    };

    (apiClient.request as any).mockResolvedValueOnce({ session: mockSession });

    render(<FocusTimer />);
    
    // Start session
    fireEvent.click(screen.getByText('Start Focus Session'));
    
    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });

    // Pause session
    fireEvent.click(screen.getByText('Pause'));
    expect(screen.getByText('Resume')).toBeInTheDocument();
    expect(screen.getByText('Session paused. Take a moment to breathe. 🌸')).toBeInTheDocument();

    // Resume session
    fireEvent.click(screen.getByText('Resume'));
    expect(screen.getByText('Pause')).toBeInTheDocument();
    expect(screen.getByText('Welcome back! Let\'s refocus! 💪')).toBeInTheDocument();
  });

  it('displays motivational messages during active session', async () => {
    const mockSession = {
      id: 'session-123',
      user_id: 'user-1',
      duration: 25,
      start_time: new Date().toISOString(),
    };

    (apiClient.request as any).mockResolvedValueOnce({ session: mockSession });

    render(<FocusTimer />);
    
    // Start session
    fireEvent.click(screen.getByText('Start Focus Session'));
    
    await waitFor(() => {
      expect(screen.getByText(/You're doing great! Stay focused!/)).toBeInTheDocument();
    });

    // Advance time to trigger message update (30 seconds)
    vi.advanceTimersByTime(30 * 1000);

    // Should show a motivational message
    await waitFor(() => {
      const messageElement = screen.getByText(/Every minute counts|You're doing great|Focus is your superpower/);
      expect(messageElement).toBeInTheDocument();
    });
  });
});