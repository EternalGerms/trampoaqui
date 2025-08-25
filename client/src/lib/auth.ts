import { apiRequest } from "./queryClient";

export interface User {
  id: string;
  email: string;
  name: string;
  isProviderEnabled: boolean;
  bio?: string;
  experience?: string;
  location?: string;
  city?: string;
  state?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

class AuthManager {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    this.user = userStr ? JSON.parse(userStr) : null;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest('POST', '/api/auth/login', { email, password });
    const data = await response.json();
    
    this.setAuth(data.token, data.user);
    return data;
  }

  async register(userData: { email: string; password: string; name: string; phone?: string; cpf: string; birthDate: string; }): Promise<AuthResponse> {
    const response = await apiRequest('POST', '/api/auth/register', userData);
    const data = await response.json();
    
    this.setAuth(data.token, data.user);
    return data;
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.token) return null;
    
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });
      
      if (response.ok) {
        const user = await response.json();
        this.user = user;
        localStorage.setItem('user', JSON.stringify(user));
        return user;
      }
    } catch (error) {
      console.error('Failed to get current user:', error);
    }
    
    return null;
  }

  logout(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  setAuth(token: string, user: User): void {
    this.token = token;
    this.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }
}

export const authManager = new AuthManager();

// Helper function to make authenticated API requests
export async function authenticatedRequest(method: string, url: string, data?: unknown): Promise<Response> {
  const token = authManager.getToken();
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }

  return response;
}
