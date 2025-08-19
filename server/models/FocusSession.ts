export interface FocusSession {
  id: string;
  user_id: string;
  task_id?: string;
  duration: number; // planned duration in minutes
  actual_duration?: number; // actual duration in minutes
  start_time: Date;
  end_time?: Date;
  completed: boolean;
  distractions: Distraction[];
  effectiveness_rating?: number; // 1-5 scale
  interruption_reason?: 'completed' | 'user_stopped' | 'hyperfocus_detected' | 'distraction';
  ambient_sound?: string;
  break_suggestion?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Distraction {
  id: string;
  timestamp: Date;
  type: 'thought' | 'noise' | 'notification' | 'impulse' | 'other';
  description?: string;
  severity: 1 | 2 | 3; // 1=minor, 2=moderate, 3=major
}

export interface CreateFocusSessionData {
  user_id: string;
  task_id?: string;
  duration: number;
  ambient_sound?: string;
}

export interface UpdateFocusSessionData {
  end_time?: Date;
  completed?: boolean;
  actual_duration?: number;
  distractions?: Distraction[];
  effectiveness_rating?: number;
  interruption_reason?: 'completed' | 'user_stopped' | 'hyperfocus_detected' | 'distraction';
  break_suggestion?: string;
}

export interface FocusSessionStats {
  total_sessions: number;
  completed_sessions: number;
  average_effectiveness: number;
  total_focus_time: number; // in minutes
  most_productive_time: string;
  common_distractions: Array<{
    type: string;
    count: number;
  }>;
  hyperfocus_incidents: number;
}