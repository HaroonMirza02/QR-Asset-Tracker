import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Select, SelectOption } from '../common/Select';
import { Alert } from '../common/Alert';
import { assignAssetApi, unassignAssetApi } from '../../api/assets';
import { listEmployeesApi } from '../../api/employees';
import { listLocationsApi } from '../../api/locations';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Asset } from '../../types/asset';
import { Employee, Location } from '../../types/organization';
import { UserCheck, UserX, User, MapPin } from 'lucide-react';

interface AssignAssetModalProps {
  asset: Asset | null;
  mode: 'assign' | 'unassign';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignAssetModal: React.FC<AssignAssetModalProps> = ({
  asset,
  mode,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [targetType, setTargetType] = useState<'employee' | 'location'>('employee');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [note, setNote] = useState('');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetchingOptions, setFetchingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && mode === 'assign') {
      async function loadOptions() {
        try {
          setFetchingOptions(true);
          const [empRes, locRes] = await Promise.all([
            listEmployeesApi({ limit: 100 }),
            listLocationsApi({ limit: 100 }),
          ]);
          setEmployees(empRes.data);
          setLocations(locRes.data);
        } catch (err) {
          console.error('Failed to load assignment target options:', err);
        } finally {
          setFetchingOptions(false);
        }
      }
      loadOptions();
      setNote('');
      setSelectedEmployeeId('');
      setSelectedLocationId('');
      setError(null);
    }
  }, [isOpen, mode]);

  if (!asset) return null;

  const employeeOptions: SelectOption[] = employees.map((emp) => ({
    value: emp.id,
    label: `${emp.name} — ${emp.title} ${emp.status === 'inactive' ? '(INACTIVE)' : ''}`,
  }));

  const locationOptions: SelectOption[] = locations.map((loc) => ({
    value: loc.id,
    label: `${loc.name} [${loc.type}]`,
  }));

  const handleUnassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      await unassignAssetApi(asset.id, { note: note.trim() || undefined });

      showToast('success', `Asset '${asset.assetCode}' unassigned successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (targetType === 'employee' && !selectedEmployeeId) {
      setError('Please select an employee to assign.');
      return;
    }
    if (targetType === 'location' && !selectedLocationId) {
      setError('Please select a location to assign.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await assignAssetApi(asset.id, {
        employeeId: targetType === 'employee' ? selectedEmployeeId : undefined,
        locationId: targetType === 'location' ? selectedLocationId : undefined,
        note: note.trim() || undefined,
      });

      showToast('success', `Asset '${asset.assetCode}' assigned successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'unassign') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Unassign Asset — ${asset.assetCode}`}
        subtitle="Remove the current assignment and set status to Available"
      >
        <form onSubmit={handleUnassignSubmit} className="space-y-4">
          {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

          <p className="text-sm text-slate-700">
            Are you sure you want to unassign <span className="font-bold text-slate-900">{asset.name}</span>? This will clear its assignment record and mark it as <span className="font-semibold text-emerald-700">Available</span>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Unassign Note (Optional)
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for unassigning (e.g. Employee left project, return to inventory)..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50 transition-all shadow-md shadow-amber-600/20"
            >
              <UserX className="w-4 h-4" />
              {loading ? 'Unassigning...' : 'Confirm Unassign'}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Asset — ${asset.assetCode}`}
      subtitle="Assign this asset to an employee or physical location"
    >
      <form onSubmit={handleAssignSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

        {/* Target Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Assign Target Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setTargetType('employee');
                setSelectedLocationId('');
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                targetType === 'employee'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <User className="w-4 h-4" />
              Employee
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetType('location');
                setSelectedEmployeeId('');
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                targetType === 'location'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Location
            </button>
          </div>
        </div>

        {/* Target Selection Dropdown */}
        {targetType === 'employee' ? (
          <Select
            label="Select Employee"
            options={employeeOptions}
            value={selectedEmployeeId}
            onChange={(val) => setSelectedEmployeeId(val)}
            placeholder={fetchingOptions ? 'Loading employees...' : 'Choose an employee'}
            disabled={fetchingOptions}
          />
        ) : (
          <Select
            label="Select Location"
            options={locationOptions}
            value={selectedLocationId}
            onChange={(val) => setSelectedLocationId(val)}
            placeholder={fetchingOptions ? 'Loading locations...' : 'Choose a location'}
            disabled={fetchingOptions}
          />
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Assignment Note (Optional)
          </label>
          <textarea
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Assignment notes or handover details..."
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20"
          >
            <UserCheck className="w-4 h-4" />
            {loading ? 'Assigning...' : 'Assign Asset'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
