export type AssetStatus = 'Available' | 'Assigned' | 'In Repair' | 'Retired' | 'Lost';

export type AssetCategory = 'Laptop' | 'Vehicle' | 'Tool' | 'Furniture' | 'Equipment';

export interface Asset {
  id: string;
  assetCode: string;
  name: string;
  category: AssetCategory;
  description?: string | null;
  serialNumber?: string | null;
  status: AssetStatus;
  assignedEmployeeId?: string | null;
  assignedLocationId?: string | null;
  isPublicVisible: boolean;
  qrToken?: string;
  qrCodeUrl?: string;
  qrCodeImageBase64?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type HistoryEventType =
  | 'Created'
  | 'StatusChange'
  | 'AssignedToEmployee'
  | 'AssignedToLocation'
  | 'Unassigned'
  | 'Updated';

export interface AssetHistory {
  id: string;
  assetId: string;
  eventType: HistoryEventType;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  performedBy: string;
  note?: string | null;
  createdAt: string;
}

export interface PublicAssignedTo {
  type: 'employee' | 'location';
  displayName?: string;
  name?: string;
  title?: string;
  locationType?: string;
}

export interface PublicAssetProfile {
  assetCode: string;
  name: string;
  category: AssetCategory;
  description?: string | null;
  status: AssetStatus;
  assignedTo?: PublicAssignedTo | null;
}

export interface CreateAssetInput {
  name: string;
  category: AssetCategory;
  description?: string;
  serialNumber?: string;
  isPublicVisible?: boolean;
  assetCode?: string;
}

export interface UpdateAssetInput {
  name?: string;
  category?: AssetCategory;
  description?: string;
  serialNumber?: string;
  isPublicVisible?: boolean;
}

export interface AssignAssetInput {
  employeeId?: string;
  locationId?: string;
  note?: string;
}

export interface UnassignAssetInput {
  note?: string;
}

export interface ChangeStatusInput {
  status: AssetStatus;
  note?: string;
}
