import { apiClient } from './client';
import { LoginPayload, LoginResult } from '../types/auth';
import { ApiResponse } from '../types/api';

export async function loginApi(credentials: LoginPayload): Promise<LoginResult> {
  const res = await apiClient.post<ApiResponse<LoginResult>>('/api/auth/login', credentials);
  return res.data.data;
}
