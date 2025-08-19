export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  due_date?: Date;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export interface CreateTaskData {
  user_id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  due_date?: Date;
  tags?: string[];
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
  due_date?: Date;
  tags?: string[];
}