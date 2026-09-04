import { apiClient, cleanParams } from './client';
import {
  Asset,
  AssetHistory,
  CreateAssetInput,
  UpdateAssetInput,
  AssignAssetInput,
  UnassignAssetInput,
  ChangeStatusInput,
} from '../types/asset';
import { ApiResponse } from '../types/api';

export interface ListAssetsParams {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  assignedEmployeeId?: string;
  assignedLocationId?: string;
  search?: string;
  isPublicVisible?: boolean;
}

export async function listAssetsApi(params: ListAssetsParams = {}): Promise<ApiResponse<Asset[]>> {
  const cleaned = cleanParams(params);
  const res = await apiClient.get<ApiResponse<Asset[]>>('/api/assets', { params: cleaned });
  return res.data;
}

export async function getAssetByIdApi(
  id: string,
  options: { includeQrImage?: boolean } = {}
): Promise<Asset> {
  const params: Record<string, any> = {};
  if (options.includeQrImage) {
    params.includeQrImage = 'true';
  }
  const res = await apiClient.get<ApiResponse<Asset>>(`/api/assets/${id}`, { params });
  return res.data.data;
}

export async function createAssetApi(data: CreateAssetInput): Promise<Asset> {
  const res = await apiClient.post<ApiResponse<Asset>>('/api/assets', data);
  return res.data.data;
}

export async function updateAssetApi(id: string, data: UpdateAssetInput): Promise<Asset> {
  const res = await apiClient.patch<ApiResponse<Asset>>(`/api/assets/${id}`, data);
  return res.data.data;
}

export async function assignAssetApi(id: string, data: AssignAssetInput): Promise<Asset> {
  const res = await apiClient.post<ApiResponse<Asset>>(`/api/assets/${id}/assign`, data);
  return res.data.data;
}

export async function unassignAssetApi(id: string, data: UnassignAssetInput = {}): Promise<Asset> {
  const res = await apiClient.post<ApiResponse<Asset>>(`/api/assets/${id}/unassign`, data);
  return res.data.data;
}

export async function changeStatusApi(id: string, data: ChangeStatusInput): Promise<Asset> {
  const res = await apiClient.post<ApiResponse<Asset>>(`/api/assets/${id}/status`, data);
  return res.data.data;
}

export async function regenerateQrApi(id: string): Promise<Asset> {
  const res = await apiClient.post<ApiResponse<Asset>>(`/api/assets/${id}/qr/regenerate`);
  return res.data.data;
}

export interface ListHistoryParams {
  page?: number;
  limit?: number;
  eventType?: string;
}

export async function getAssetHistoryApi(
  id: string,
  params: ListHistoryParams = {}
): Promise<ApiResponse<AssetHistory[]>> {
  const cleaned = cleanParams(params);
  const res = await apiClient.get<ApiResponse<AssetHistory[]>>(`/api/assets/${id}/history`, {
    params: cleaned,
  });
  return res.data;
}
