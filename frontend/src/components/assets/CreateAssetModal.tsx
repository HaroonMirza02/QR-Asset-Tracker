import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Select, SelectOption } from '../common/Select';
import { Alert } from '../common/Alert';
import { createAssetApi } from '../../api/assets';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { AssetCategory } from '../../types/asset';
import { Plus, Info } from 'lucide-react';

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateAssetModal: React.FC<CreateAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('Laptop');
  const [description, setDescription] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [assetCode, setAssetCode] = useState('');
  const [isPublicVisible, setIsPublicVisible] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryOptions: SelectOption[] = [
    { value: 'Laptop', label: 'Laptop' },
    { value: 'Vehicle', label: 'Vehicle' },
    { value: 'Tool', label: 'Tool' },
    { value: 'Furniture', label: 'Furniture' },
    { value: 'Equipment', label: 'Equipment' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Asset name is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await createAssetApi({
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        assetCode: assetCode.trim() ? assetCode.trim().toUpperCase() : undefined,
        isPublicVisible,
      });

      showToast('success', `Asset '${name.trim()}' created successfully!`);
      // Reset form
      setName('');
      setDescription('');
      setSerialNumber('');
      setAssetCode('');
      setIsPublicVisible(true);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Asset"
      subtitle="Add a physical asset to your organization inventory"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Asset Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. MacBook Pro 16 inch"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Category"
            options={categoryOptions}
            value={category}
            onChange={(val) => setCategory(val as AssetCategory)}
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Asset Code
              </label>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                OPTIONAL
              </span>
            </div>
            <input
              type="text"
              maxLength={20}
              value={assetCode}
              onChange={(e) => setAssetCode(e.target.value.toUpperCase())}
              placeholder="e.g. AST0099 (Auto-assigned if blank)"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-medium text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Serial Number (Optional)
          </label>
          <input
            type="text"
            maxLength={100}
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="e.g. C02G1234MD6R"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Description (Optional)
          </label>
          <textarea
            rows={3}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional asset notes or specs..."
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-800">Public QR Visibility</p>
              <p className="text-[11px] text-slate-500">Allow unauthenticated public scan lookup</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={isPublicVisible}
            onChange={(e) => setIsPublicVisible(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
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
            <Plus className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Asset'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
