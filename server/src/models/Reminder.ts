export interface Reminder {
  id: string;
  user_id: string;
  task_id?: string;
  title: string;
  description?: string;
  reminder_type: ReminderType;
  priority: ReminderPriority;
  scheduled_time: Date;
  actual_sent_time?: Date;
  status: ReminderStatus;
  escalation_level: number;
  max_escalations: number;
  context_data?: {
    user_energy_level?: number;
    previous_reminder_effectiveness?: number;
    current_focus_session_id?: string;
    estimated_task_duration?: number;
  };
  created_at: Date;
  updated_at: Date;
}

export interface ReminderPreferences {
  id: string;
  user_id: string;
  reminder_frequency: ReminderFrequency;
  preferred_times: PreferredTimeSlot[];
  energy_based_adjustment: boolean;
  gentle_escalation: boolean;
  max_daily_reminders: number;
  quiet_hours: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  reminder_types_enabled: {
    task_start: boolean;
    break_reminder: boolean;
    deadline_warning: boolean;
    energy_check: boolean;
    hyperfocus_break: boolean;
  };
  escalation_preferences: {
    initial_delay_minutes: number;
    escalation_interval_minutes: number;
    max_escalations: number;
    weekend_adjustments: boolean;
  };
  adaptive_learning: {
    enabled: boolean;
    effectiveness_weight: number;
    energy_correlation_weight: number;
    time_preference_weight: number;
  };
  created_at: Date;
  updated_at: Date;
}

export interface ReminderLog {
  id: string;
  reminder_id: string;
  user_id: string;
  sent_at: Date;
  user_response?: ReminderResponse;
  response_time_seconds?: number;
  effectiveness_rating?: number; // 1-5 scale
  user_energy_before?: number;   // 1-10 scale
  user_energy_after?: number;    // 1-10 scale
  context_factors: {
    time_of_day: string;
    day_of_week: string;
    focus_session_active: boolean;
    task_complexity?: number;
    recent_break_taken: boolean;
  };
  created_at: Date;
}

export interface EnergyPattern {
  id: string;
  user_id: string;
  time_slot: string; // HH:MM format
  day_of_week: number; // 0-6, 0 = Sunday
  average_energy_level: number; // 1-10 scale
  sample_count: number;
  last_updated: Date;
  created_at: Date;
}

export type ReminderType = 
  | 'task_start'
  | 'break_reminder' 
  | 'deadline_warning'
  | 'energy_check'
  | 'hyperfocus_break'
  | 'medication_reminder'
  | 'transition_warning';

export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ReminderStatus = 
  | 'scheduled'
  | 'sent'
  | 'acknowledged'
  | 'snoozed'
  | 'dismissed'
  | 'expired'
  | 'cancelled';

export type ReminderFrequency = 
  | 'minimal'    // Only urgent reminders
  | 'low'        // 2-3 times per day
  | 'moderate'   // 4-6 times per day
  | 'high'       // 7-10 times per day
  | 'adaptive';  // AI-driven based on patterns

export type ReminderResponse = 
  | 'acknowledged'
  | 'snoozed_5min'
  | 'snoozed_15min' 
  | 'snoozed_30min'
  | 'dismissed'
  | 'completed_task'
  | 'not_now'
  | 'too_frequent';

export interface PreferredTimeSlot {
  start_time: string; // HH:MM format
  end_time: string;   // HH:MM format
  days_of_week: number[]; // 0-6, 0 = Sunday
  energy_level_preference: 'low' | 'medium' | 'high' | 'any';
  reminder_types: ReminderType[];
}

// Database-specific types for repository pattern
export interface CreateReminderData {
  user_id: string;
  task_id?: string;
  title: string;
  description?: string;
  reminder_type: ReminderType;
  priority: ReminderPriority;
  scheduled_time: Date;
  escalation_level?: number;
  max_escalations?: number;
  context_data?: Reminder['context_data'];
}

export interface UpdateReminderData {
  status?: ReminderStatus;
  actual_sent_time?: Date;
  escalation_level?: number;
  context_data?: Reminder['context_data'];
}

export interface CreateReminderPreferencesData {
  user_id: string;
  reminder_frequency?: ReminderFrequency;
  preferred_times?: PreferredTimeSlot[];
  energy_based_adjustment?: boolean;
  gentle_escalation?: boolean;
  max_daily_reminders?: number;
  quiet_hours?: ReminderPreferences['quiet_hours'];
  reminder_types_enabled?: ReminderPreferences['reminder_types_enabled'];
  escalation_preferences?: ReminderPreferences['escalation_preferences'];
  adaptive_learning?: ReminderPreferences['adaptive_learning'];
}

export interface ReminderAnalytics {
  user_id: string;
  date_range: {
    start: Date;
    end: Date;
  };
  total_reminders_sent: number;
  response_rate: number;
  average_effectiveness: number;
  optimal_times: string[];
  energy_correlation: {
    low_energy_response_rate: number;
    high_energy_response_rate: number;
  };
  type_effectiveness: Record<ReminderType, number>;
  escalation_statistics: {
    average_escalations_needed: number;
    first_reminder_success_rate: number;
  };
}