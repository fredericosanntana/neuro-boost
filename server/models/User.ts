export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'user' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role?: 'user' | 'admin';
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  role?: 'user' | 'admin';
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  created_at: Date;
  updated_at: Date;
}