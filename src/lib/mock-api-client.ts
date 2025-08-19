// Mock API client for testing without backend
class MockApiClient {
  private baseURL = 'mock://api';
  private mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user' as const,
    created_at: new Date(),
    updated_at: new Date()
  };

  private mockSessions: any[] = [];

  async request(endpoint: string, options?: any): Promise<any> {
    console.log('Mock API call:', endpoint, options);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    if (endpoint === '/auth/login' && options?.method === 'POST') {
      const body = JSON.parse(options.body);
      console.log('Login attempt:', body);
      
      // Accept any email/password for testing
      const token = 'mock-jwt-token-' + Date.now();
      return {
        user: this.mockUser,
        token
      };
    }

    if (endpoint === '/auth/me') {
      return { user: this.mockUser };
    }

    if (endpoint === '/focus/sessions' && options?.method === 'POST') {
      const sessionData = JSON.parse(options.body);
      const newSession = {
        id: 'session-' + Date.now(),
        user_id: this.mockUser.id,
        ...sessionData,
        start_time: new Date(),
        distractions: [],
        created_at: new Date(),
        updated_at: new Date()
      };
      this.mockSessions.push(newSession);
      return { session: newSession };
    }

    if (endpoint.includes('/focus/sessions/') && endpoint.includes('/complete')) {
      const sessionId = endpoint.split('/')[3];
      const session = this.mockSessions.find(s => s.id === sessionId);
      if (session) {
        const updateData = JSON.parse(options.body);
        Object.assign(session, {
          ...updateData,
          end_time: new Date(),
          completed: true,
          actual_duration: session.duration
        });
        return { session };
      }
    }

    if (endpoint.includes('/focus/sessions/') && endpoint.includes('/distractions')) {
      const sessionId = endpoint.split('/')[3];
      const session = this.mockSessions.find(s => s.id === sessionId);
      if (session) {
        const distraction = JSON.parse(options.body);
        session.distractions.push({
          id: 'dist-' + Date.now(),
          ...distraction,
          timestamp: new Date()
        });
        return { session };
      }
    }

    if (endpoint.includes('/focus/sessions/') && endpoint.includes('/hyperfocus-check')) {
      return {
        hyperfocus_detected: false,
        session_id: endpoint.split('/')[3],
        current_duration: 25
      };
    }

    // Default success response
    return { success: true };
  }

  // Implement other methods to match the real API client interface
  async login(email: string, password: string) {
    console.log('Mock login called with:', email, password);
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    console.log('Mock login result:', result);
    return result;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async createFocusSession(sessionData: any) {
    return this.request('/focus/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  }

  async completeFocusSession(id: string, data: any) {
    return this.request(`/focus/sessions/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async addDistraction(sessionId: string, distraction: any) {
    return this.request(`/focus/sessions/${sessionId}/distractions`, {
      method: 'POST',
      body: JSON.stringify(distraction)
    });
  }

  async checkHyperfocus(sessionId: string) {
    return this.request(`/focus/sessions/${sessionId}/hyperfocus-check`);
  }
}

export const mockApiClient = new MockApiClient();
export default mockApiClient;