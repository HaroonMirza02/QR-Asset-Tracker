import React, { useEffect, useState } from 'react';
import { Select, SelectOption } from '../common/Select';
import { SearchInput } from '../common/SearchInput';
import { listEmployeesApi } from '../../api/employees';
import { listLocationsApi } from '../../api/locations';
import { Employee, Location } from '../../types/organization';
import { Filter, X } from 'lucide-react';

interface AssetFiltersProps {
  status?: string;
  category?: string;
  assignedEmployeeId?: string;
  assignedLocationId?: string;
  search?: string;
  onFilterChange: (filters: {
    status?: string;
    category?: string;
    assignedEmployeeId?: string;
    assignedLocationId?: string;
    search?: string;
  }) => void;
  onReset: () => void;
}

export const AssetFilters: React.FC<AssetFiltersProps> = ({
  status = '',
  category = '',
  assignedEmployeeId = '',
  assignedLocationId = '',
  search = '',
  onFilterChange,
  onReset,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [empRes, locRes] = await Promise.all([
          listEmployeesApi({ limit: 100 }),
          listLocationsApi({ limit: 100 }),
        ]);
        setEmployees(empRes.data);
        setLocations(locRes.data);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    }
    loadOptions();
  }, []);

  const statusOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'Available', label: 'Available' },
    { value: 'Assigned', label: 'Assigned' },
    { value: 'In Repair', label: 'In Repair' },
    { value: 'Retired', label: 'Retired' },
    { value: 'Lost', label: 'Lost' },
  ];

  const categoryOptions: SelectOption[] = [
    { value: '', label: 'All Categories' },
    { value: 'Laptop', label: 'Laptop' },
    { value: 'Vehicle', label: 'Vehicle' },
    { value: 'Tool', label: 'Tool' },
    { value: 'Furniture', label: 'Furniture' },
    { value: 'Equipment', label: 'Equipment' },
  ];

  const employeeOptions: SelectOption[] = [
    { value: '', label: 'All Employees' },
    ...employees.map((emp) => ({
      value: emp.id,
      label: `${emp.name} (${emp.title})`,
    })),
  ];

  const locationOptions: SelectOption[] = [
    { value: '', label: 'All Locations' },
    ...locations.map((loc) => ({
      value: loc.id,
      label: `${loc.name} [${loc.type}]`,
    })),
  ];

  const hasActiveFilters = Boolean(
    status || category || assignedEmployeeId || assignedLocationId || search
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Filter & Search Assets</h3>
            <p className="text-[11px] text-slate-400 font-medium">Refine asset list by state or criteria</p>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <SearchInput
          value={search}
          onChange={(val) => onFilterChange({ status, category, assignedEmployeeId, assignedLocationId, search: val })}
          placeholder="Search by code, name..."
          className="lg:col-span-1"
        />

        <Select
          options={statusOptions}
          value={status}
          onChange={(val) => onFilterChange({ status: val, category, assignedEmployeeId, assignedLocationId, search })}
          placeholder="Status"
        />

        <Select
          options={categoryOptions}
          value={category}
          onChange={(val) => onFilterChange({ status, category: val, assignedEmployeeId, assignedLocationId, search })}
          placeholder="Category"
        />

        <Select
          options={employeeOptions}
          value={assignedEmployeeId}
          onChange={(val) => onFilterChange({ status, category, assignedEmployeeId: val, assignedLocationId: '', search })}
          placeholder="Assigned Employee"
        />

        <Select
          options={locationOptions}
          value={assignedLocationId}
          onChange={(val) => onFilterChange({ status, category, assignedEmployeeId: '', assignedLocationId: val, search })}
          placeholder="Assigned Location"
        />
      </div>
    </div>
  );
};
