import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Select, SelectOption } from '../common/Select';
import { Alert } from '../common/Alert';
import { updateAssetApi } from '../../api/assets';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Asset, AssetCategory } from '../../types/asset';
import { Save, AlertOctagon } from 'lucide-react';

interface EditAssetModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditAssetModal: React.FC<EditAssetModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('Laptop');
  const [description, setDescription] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [isPublicVisible, setIsPublicVisible] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRetired = asset?.status === 'Retired';

  useEffect(() => {
    if (asset) {
      setName(asset.name || '');
      setCategory(asset.category || 'Laptop');
      setDescription(asset.description || '');
      setSerialNumber(asset.serialNumber || '');
      setIsPublicVisible(asset.isPublicVisible !== false);
      setError(null);
    }
  }, [asset]);

  const categoryOptions: SelectOption[] = [
    { value: 'Laptop', label: 'Laptop' },
    { value: 'Vehicle', label: 'Vehicle' },
    { value: 'Tool', label: 'Tool' },
    { value: 'Furniture', label: 'Furniture' },
    { value: 'Equipment', label: 'Equipment' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;
    if (isRetired) return;

    if (!name.trim()) {
      setError('Asset name is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await updateAssetApi(asset.id, {
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        isPublicVisible,
      });

      showToast('success', `Asset '${name.trim()}' updated successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!asset) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Asset — ${asset.assetCode}`}
      subtitle="Modify asset information and public visibility"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {isRetired ? (
          <div className="flex items-start gap-3 p-4 bg-slate-100 border border-slate-300 rounded-xl text-slate-700">
            <AlertOctagon className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-slate-900 mb-0.5">Asset is Retired (Immutable State)</p>
              <p className="text-slate-600">
                This asset has been retired. The backend permanently prohibits editing metadata for retired assets.
              </p>
            </div>
          </div>
        ) : null}

        {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

        <fieldset disabled={isRetired} className="space-y-4">
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
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              options={categoryOptions}
              value={category}
              onChange={(val) => setCategory(val as AssetCategory)}
              disabled={isRetired}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Serial Number
              </label>
              <input
                type="text"
                maxLength={100}
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div>
              <p className="text-xs font-bold text-slate-800">Public Scan Visibility</p>
              <p className="text-[11px] text-slate-500">Allow public scans to locate this asset</p>
            </div>
            <input
              type="checkbox"
              disabled={isRetired}
              checked={isPublicVisible}
              onChange={(e) => setIsPublicVisible(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
            />
          </div>
        </fieldset>

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
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};
