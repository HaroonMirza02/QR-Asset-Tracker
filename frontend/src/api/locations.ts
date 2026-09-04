import { apiClient, cleanParams } from './client';
import { Location } from '../types/organization';
import { ApiResponse } from '../types/api';

export interface ListLocationsParams {
  page?: number;
  limit?: number;
  type?: string;
  search?: string;
}

export async function listLocationsApi(
  params: ListLocationsParams = {}
): Promise<ApiResponse<Location[]>> {
  const cleaned = cleanParams(params);
  const res = await apiClient.get<ApiResponse<Location[]>>('/api/locations', { params: cleaned });
  return res.data;
}

export async function getLocationByIdApi(id: string): Promise<Location> {
  const res = await apiClient.get<ApiResponse<Location>>(`/api/locations/${id}`);
  return res.data.data;
}
