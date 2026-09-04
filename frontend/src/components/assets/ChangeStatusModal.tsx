import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Select, SelectOption } from '../common/Select';
import { Alert } from '../common/Alert';
import { changeStatusApi } from '../../api/assets';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Asset, AssetStatus } from '../../types/asset';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface ChangeStatusModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ChangeStatusModal: React.FC<ChangeStatusModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [status, setStatus] = useState<AssetStatus>('Available');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAssigned = Boolean(asset?.assignedEmployeeId || asset?.assignedLocationId);
  const isRetired = asset?.status === 'Retired';

  useEffect(() => {
    if (asset) {
      setStatus(asset.status);
      setNote('');
      setError(null);
    }
  }, [asset]);

  if (!asset) return null;

  const statusOptions: SelectOption[] = [
    {
      value: 'Available',
      label: 'Available',
      disabled: isAssigned, // EC-13 rule
    },
    { value: 'Assigned', label: 'Assigned', disabled: !isAssigned },
    { value: 'In Repair', label: 'In Repair' },
    { value: 'Retired', label: 'Retired (Terminal State)' },
    { value: 'Lost', label: 'Lost' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRetired) return;

    if (status === 'Available' && isAssigned) {
      setError('Cannot set status to Available while asset is assigned. Unassign the asset first.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await changeStatusApi(asset.id, {
        status,
        note: note.trim() || undefined,
      });

      showToast('success', `Asset '${asset.assetCode}' status changed to '${status}'!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Change Status — ${asset.assetCode}`}
      subtitle="Update operational status and log transition note"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

        {isAssigned && status === 'Available' && (
          <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              This asset is currently assigned. You must unassign it before returning status to Available.
            </p>
          </div>
        )}

        <Select
          label="New Status"
          options={statusOptions}
          value={status}
          onChange={(val) => setStatus(val as AssetStatus)}
          disabled={isRetired}
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Status Change Note (Optional)
          </label>
          <textarea
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isRetired}
            placeholder="Reason for status change (e.g. Sent to repair depot, decommissioned)..."
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
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
          {!isRetired && (
            <button
              type="submit"
              disabled={loading || (isAssigned && status === 'Available')}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-600/20"
            >
              <RefreshCw className="w-4 h-4" />
              {loading ? 'Updating...' : 'Update Status'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};
