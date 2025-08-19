// Simplified mock API client that works
export const simpleMockClient = {
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

  async request(endpoint: string, options?: any) {
    console.log('🔧 Mock API request:', endpoint, options?.method);
    
    await new Promise(resolve => setTimeout(resolve, 200));

    if (endpoint.includes('/focus/sessions') && options?.method === 'POST') {
      return {
        session: {
          id: 'session-' + Date.now(),
          user_id: '1',
          duration: 25,
          start_time: new Date(),
          distractions: []
        }
      };
    }

    if (endpoint.includes('/complete') && options?.method === 'POST') {
      return {
        session: {
          id: 'session-123',
          completed: true,
          end_time: new Date()
        }
      };
    }

    return { success: true };
  },

  // Add other methods as needed
  async createFocusSession(data: any) {
    return this.request('/focus/sessions', { method: 'POST', body: JSON.stringify(data) });
  },

  async completeFocusSession(id: string, data: any) {
    return this.request(`/focus/sessions/${id}/complete`, { method: 'POST', body: JSON.stringify(data) });
  },

  async addDistraction(sessionId: string, data: any) {
    return this.request(`/focus/sessions/${sessionId}/distractions`, { method: 'POST', body: JSON.stringify(data) });
  },

  async checkHyperfocus(sessionId: string) {
    return this.request(`/focus/sessions/${sessionId}/hyperfocus-check`);
  }
};