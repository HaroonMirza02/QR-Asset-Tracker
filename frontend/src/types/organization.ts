export type EmployeeStatus = 'active' | 'inactive';

export interface ContactInfo {
  email?: string | null;
  phone?: string | null;
}

export interface Employee {
  id: string;
  name: string;
  title: string;
  department?: string | null;
  status: EmployeeStatus;
  contactInfo?: ContactInfo;
}

export type LocationType = 'site' | 'building' | 'zone' | 'room' | 'other';

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  address?: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}
