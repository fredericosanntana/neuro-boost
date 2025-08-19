const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
    code: string;
    statusCode: number;
  };
}

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }

      return data.data as T;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, name: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // Task endpoints
  async getTasks(filters?: {
    completed?: boolean;
    priority?: string;
    tags?: string[];
  }) {
    const params = new URLSearchParams();
    
    if (filters?.completed !== undefined) {
      params.append('completed', filters.completed.toString());
    }
    
    if (filters?.priority) {
      params.append('priority', filters.priority);
    }
    
    if (filters?.tags && filters.tags.length > 0) {
      params.append('tags', filters.tags.join(','));
    }

    const query = params.toString();
    const endpoint = `/tasks${query ? `?${query}` : ''}`;
    
    return this.request(endpoint);
  }

  async getTask(id: string) {
    return this.request(`/tasks/${id}`);
  }

  async createTask(taskData: {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    due_date?: string;
    tags?: string[];
  }) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(id: string, taskData: Partial<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    completed: boolean;
    due_date: string;
    tags: string[];
  }>) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  async completeTask(id: string) {
    return this.request(`/tasks/${id}/complete`, {
      method: 'PATCH',
    });
  }

  async deleteTask(id: string) {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  async getTaskStats() {
    return this.request('/tasks/stats');
  }

  // User endpoints
  async getUserProfile() {
    return this.request('/users/profile');
  }

  async updateUserProfile(userData: {
    name?: string;
    email?: string;
  }) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Focus session endpoints
  async createFocusSession(sessionData: {
    task_id?: string;
    duration: number;
    ambient_sound?: string;
  }) {
    return this.request('/focus/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  async getFocusSessions(limit?: number) {
    const params = new URLSearchParams();
    if (limit) {
      params.append('limit', limit.toString());
    }
    
    const query = params.toString();
    const endpoint = `/focus/sessions${query ? `?${query}` : ''}`;
    
    return this.request(endpoint);
  }

  async getFocusSession(id: string) {
    return this.request(`/focus/sessions/${id}`);
  }

  async updateFocusSession(id: string, sessionData: {
    end_time?: string;
    completed?: boolean;
    actual_duration?: number;
    effectiveness_rating?: number;
    interruption_reason?: string;
  }) {
    return this.request(`/focus/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData),
    });
  }

  async completeFocusSession(id: string, data: {
    effectiveness_rating: number;
    interruption_reason?: string;
  }) {
    return this.request(`/focus/sessions/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addDistraction(sessionId: string, distraction: {
    type: string;
    severity: number;
    description?: string;
  }) {
    return this.request(`/focus/sessions/${sessionId}/distractions`, {
      method: 'POST',
      body: JSON.stringify(distraction),
    });
  }

  async checkHyperfocus(sessionId: string) {
    return this.request(`/focus/sessions/${sessionId}/hyperfocus-check`);
  }

  async getFocusStats() {
    return this.request('/focus/stats');
  }
}

// Import mock client for development
import { simpleMockClient } from './simple-mock-client';

// Use mock API client for development when backend is not running
const isDevelopment = import.meta.env.DEV;
const useMockApi = isDevelopment && !import.meta.env.VITE_USE_REAL_API;

console.log('🔧 API Client Setup:', { 
  isDevelopment, 
  useRealAPI: import.meta.env.VITE_USE_REAL_API, 
  useMockApi,
  usingMock: useMockApi ? 'YES' : 'NO'
});

export const apiClient = useMockApi ? simpleMockClient : new ApiClient();
export default apiClient;