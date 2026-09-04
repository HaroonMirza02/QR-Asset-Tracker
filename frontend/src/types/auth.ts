export type UserRole = 'Admin' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  expiresIn: number;
  user: User;
}
