import React, { useEffect, useState, useCallback } from 'react';
import { listEmployeesApi, getEmployeeByIdApi, ListEmployeesParams } from '../api/employees';
import { Employee } from '../types/organization';
import { ApiMeta } from '../types/api';
import { useAuth } from '../context/AuthContext';
import { SearchInput } from '../components/common/SearchInput';
import { Select, SelectOption } from '../components/common/Select';
import { Pagination } from '../components/common/Pagination';
import { Spinner } from '../components/common/Spinner';
import { Alert } from '../components/common/Alert';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { Users, Mail, Phone, Building, Briefcase, Eye, ShieldAlert } from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [meta, setMeta] = useState<ApiMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<ListEmployeesParams>({
    page: 1,
    limit: 12,
    status: '',
    department: '',
    search: '',
  });

  // Selected employee for detail modal
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listEmployeesApi(filters);
      setEmployees(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      setError('Failed to load employees list.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleOpenDetail = async (empId: string) => {
    try {
      setFetchingDetail(true);
      setDetailModalOpen(true);
      // Calls GET /api/employees/:id — backend applies field-level contactInfo filtering based on JWT role
      const detailed = await getEmployeeByIdApi(empId);
      setSelectedEmployee(detailed);
    } catch (err: any) {
      console.error('Failed to load employee details:', err);
    } finally {
      setFetchingDetail(false);
    }
  };

  const statusOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const departmentOptions: SelectOption[] = [
    { value: '', label: 'All Departments' },
    { value: 'Operations', label: 'Operations' },
    { value: 'Finance', label: 'Finance' },
    { value: 'IT', label: 'IT' },
    { value: 'Logistics', label: 'Logistics' },
    { value: 'HR', label: 'HR' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Employee Directory
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          View staff profiles and asset assignment personnel targets
        </p>
      </div>

      {/* Unified Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SearchInput
          value={filters.search || ''}
          onChange={(val) => setFilters((prev) => ({ ...prev, search: val, page: 1 }))}
          placeholder="Search employee by name..."
        />

        <Select
          options={statusOptions}
          value={filters.status || ''}
          onChange={(val) => setFilters((prev) => ({ ...prev, status: val, page: 1 }))}
          placeholder="Status Filter"
        />

        <Select
          options={departmentOptions}
          value={filters.department || ''}
          onChange={(val) => setFilters((prev) => ({ ...prev, department: val, page: 1 }))}
          placeholder="Department Filter"
        />
      </div>

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <Spinner size="lg" label="Loading employees..." className="py-16" />
      ) : employees.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-500">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-40 stroke-1" />
          <p className="text-sm font-bold">No employees found matching criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <div
              key={emp.id}
              onClick={() => handleOpenDetail(emp.id)}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-extrabold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {emp.name.charAt(0)}
                  </div>
                  <Badge variant={emp.status === 'active' ? 'emerald' : 'neutral'}>
                    {emp.status}
                  </Badge>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                  {emp.name}
                </h3>
                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  {emp.title}
                </p>
                {emp.department && (
                  <p className="text-xs font-medium text-slate-400 flex items-center gap-1 mt-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {emp.department}
                  </p>
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-bold">
                <span>View Profile</span>
                <Eye className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination meta={meta} onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))} />

      {/* Employee Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedEmployee(null);
        }}
        title="Employee Profile"
        subtitle="Staff identity & permission-controlled contact info"
      >
        {fetchingDetail || !selectedEmployee ? (
          <Spinner label="Fetching profile details..." />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-indigo-600/20">
                {selectedEmployee.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{selectedEmployee.name}</h3>
                <p className="text-xs font-semibold text-slate-500">{selectedEmployee.title}</p>
                <div className="mt-1">
                  <Badge variant={selectedEmployee.status === 'active' ? 'emerald' : 'neutral'}>
                    {selectedEmployee.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs font-medium text-slate-700">
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-400" />
                <span>Department: <strong className="text-slate-900">{selectedEmployee.department || 'N/A'}</strong></span>
              </div>
            </div>

            {/* Contact Info (Only returned by API for Admin role) */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Contact Information (Admin Restricted)
              </span>

              {isAdmin && selectedEmployee.contactInfo ? (
                <div className="space-y-2 bg-indigo-50/50 p-3.5 border border-indigo-100 rounded-xl text-xs font-medium">
                  {selectedEmployee.contactInfo.email && (
                    <div className="flex items-center gap-2 text-slate-800">
                      <Mail className="w-4 h-4 text-indigo-600" />
                      <span>{selectedEmployee.contactInfo.email}</span>
                    </div>
                  )}
                  {selectedEmployee.contactInfo.phone && (
                    <div className="flex items-center gap-2 text-slate-800">
                      <Phone className="w-4 h-4 text-indigo-600" />
                      <span>{selectedEmployee.contactInfo.phone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-xs font-medium">
                  <ShieldAlert className="w-4 h-4 text-slate-400" />
                  <span>Contact info is restricted to Admin role.</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
