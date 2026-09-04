import { apiClient, cleanParams } from './client';
import { Employee } from '../types/organization';
import { ApiResponse } from '../types/api';

export interface ListEmployeesParams {
  page?: number;
  limit?: number;
  status?: string;
  department?: string;
  search?: string;
}

export async function listEmployeesApi(
  params: ListEmployeesParams = {}
): Promise<ApiResponse<Employee[]>> {
  const cleaned = cleanParams(params);
  const res = await apiClient.get<ApiResponse<Employee[]>>('/api/employees', { params: cleaned });
  return res.data;
}

export async function getEmployeeByIdApi(id: string): Promise<Employee> {
  const res = await apiClient.get<ApiResponse<Employee>>(`/api/employees/${id}`);
  return res.data.data;
}
