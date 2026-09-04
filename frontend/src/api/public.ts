import { apiClient } from './client';
import { PublicAssetProfile } from '../types/asset';
import { ApiResponse } from '../types/api';

export async function scanPublicQrApi(
  qrToken: string,
  tenantId: string
): Promise<PublicAssetProfile> {
  const res = await apiClient.get<ApiResponse<PublicAssetProfile>>(
    `/api/public/scan/${encodeURIComponent(qrToken)}`,
    {
      params: { t: tenantId },
    }
  );
  return res.data.data;
}
