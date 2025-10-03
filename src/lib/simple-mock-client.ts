import type { IApiClient } from './api-client';

// Simplified mock API client that works
export const simpleMockClient: IApiClient = {
  async login(email: string, password: string) {
    console.log('🔧 Mock login called:', email);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      user: {
        id: '1',
        email: email,
        name: email.split('@')[0] || 'Test User',
        role: 'user'
      },
      token: 'mock-jwt-token-' + Date.now()
    };
  },

  async register(email: string, password: string, name: string) {
    console.log('🔧 Mock register called:', email);
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      user: {
        id: '1',
        email,
        name,
        role: 'user'
      },
      token: 'mock-jwt-token-' + Date.now()
    };
  },

  async getCurrentUser() {
    console.log('🔧 Mock getCurrentUser called');
    return {
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user'
      }
    };
  },

  async logout() {
    console.log('🔧 Mock logout called');
    return { success: true };
  },

  async getTasks(filters?: any) {
    console.log('🔧 Mock getTasks called');
    await new Promise(resolve => setTimeout(resolve, 200));
    return { tasks: [] };
  },

  async getTask(id: string) {
    console.log('🔧 Mock getTask called:', id);
    await new Promise(resolve => setTimeout(resolve, 200));
    return { task: { id, title: 'Mock Task' } };
  },

  async createTask(taskData: any) {
    console.log('🔧 Mock createTask called');
    await new Promise(resolve => setTimeout(resolve, 200));
    return { task: { id: 'task-' + Date.now(), ...taskData } };
  },

  async updateTask(id: string, taskData: any) {
    console.log('🔧 Mock updateTask called:', id);
    await new Promise(resolve => setTimeout(resolve, 200));
    return { task: { id, ...taskData } };
  },

  async completeTask(id: string) {
    console.log('🔧 Mock completeTask called:', id);
    await new Promise(resolve => setTimeout(resolve, 200));
    return { task: { id, completed: true } };
  },

  async deleteTask(id: string) {
    console.log('🔧 Mock deleteTask called:', id);
    await new Promise(resolve => setTimeout(resolve, 200));
    return { success: true };
  },

  async getTaskStats() {
    console.log('🔧 Mock getTaskStats called');
    await new Promise(resolve => setTimeout(resolve, 200));
    return { stats: { total: 0, completed: 0, pending: 0 } };
  },

  async getUserProfile() {
    console.log('🔧 Mock getUserProfile called');
    await new Promise(resolve => setTimeout(resolve, 200));
    return { user: { id: '1', name: 'Test User', email: 'test@example.com' } };
  },

  async updateUserProfile(userData: any) {
    console.log('🔧 Mock updateUserProfile called');
    await new Promise(resolve => setTimeout(resolve, 200));
    return { user: { id: '1', ...userData } };
  },

  async createFocusSession(data: any) {
    console.log('🔧 Mock createFocusSession called');
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      session: {
        id: 'session-' + Date.now(),
        user_id: '1',
        duration: data.duration || 25,
        start_time: new Date().toISOString(),
        distractions: []
      }
    };
  },

  async getFocusSessions(limit?: number) {
    console.log('🔧 Mock getFocusSessions called');
    await new Promise(resolve => setTimeout(resolve, 200));
    return { sessions: [] };
  },

  async getFocusSession(id: string) {
    console.log('🔧 Mock getFocusSession called:', id);
    await new Promise(resolve => setTimeout(resolve, 200));
    return { session: { id, duration: 25 } };
  },

  async updateFocusSession(id: string, sessionData: any) {
    console.log('🔧 Mock updateFocusSession called:', id);
    await new Promise(resolve => setTimeout(resolve, 200));
    return { session: { id, ...sessionData } };
  },

  async completeFocusSession(id: string, data: any) {
    console.log('🔧 Mock completeFocusSession called:', id);
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      session: {
        id,
        completed: true,
        end_time: new Date().toISOString(),
        ...data
      }
    };
  },

  async addDistraction(sessionId: string, data: any) {
    console.log('🔧 Mock addDistraction called:', sessionId);
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      distraction: {
        id: 'distraction-' + Date.now(),
        session_id: sessionId,
        ...data
      }
    };
  },

  async checkHyperfocus(sessionId: string) {
    console.log('🔧 Mock checkHyperfocus called:', sessionId);
    await new Promise(resolve => setTimeout(resolve, 200));
    return { hyperfocus: false };
  },

  async getFocusStats() {
    console.log('🔧 Mock getFocusStats called');
    await new Promise(resolve => setTimeout(resolve, 200));
    return { stats: { total_sessions: 0, total_duration: 0 } };
  }
};