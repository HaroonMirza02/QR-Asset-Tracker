import React, { useEffect, useState, useCallback, useRef } from 'react';
import { listAssetsApi, ListAssetsParams } from '../api/assets';
import { Asset } from '../types/asset';
import { ApiMeta } from '../types/api';
import { useAuth } from '../context/AuthContext';
import { AssetTable } from '../components/assets/AssetTable';
import { AssetCard } from '../components/assets/AssetCard';
import { AssetFilters } from '../components/assets/AssetFilters';
import { CreateAssetModal } from '../components/assets/CreateAssetModal';
import { EditAssetModal } from '../components/assets/EditAssetModal';
import { AssignAssetModal } from '../components/assets/AssignAssetModal';
import { ChangeStatusModal } from '../components/assets/ChangeStatusModal';
import { Pagination } from '../components/common/Pagination';
import { Spinner } from '../components/common/Spinner';
import { Alert } from '../components/common/Alert';
import { Plus, Box, PackageX } from 'lucide-react';

export const AssetListPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [meta, setMeta] = useState<ApiMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<ListAssetsParams>({
    page: 1,
    limit: 12,
    status: '',
    category: '',
    assignedEmployeeId: '',
    assignedLocationId: '',
    search: '',
  });

  // Modal triggers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [assignModal, setAssignModal] = useState<{ mode: 'assign' | 'unassign'; open: boolean }>({
    mode: 'assign',
    open: false,
  });
  const [statusOpen, setStatusOpen] = useState(false);

  const requestRef = useRef<AbortController | null>(null);
  const fetchAssets = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController(); requestRef.current = controller;
    try {
      setLoading(true);
      setError(null);
      const res = await listAssetsApi(filters, controller.signal);
      if (controller.signal.aborted) return;
      setAssets(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setError('Failed to fetch assets list. Please check your backend connection.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAssets();
    return () => requestRef.current?.abort();
  }, [fetchAssets]);

  const handleFilterChange = (newFilters: Partial<ListAssetsParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 12,
      status: '',
      category: '',
      assignedEmployeeId: '',
      assignedLocationId: '',
      search: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Box className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Asset Directory
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage, track, assign, and audit physical organization assets
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            Create Asset
          </button>
        )}
      </div>

      {/* Filters Section */}
      <AssetFilters
        status={filters.status}
        category={filters.category}
        assignedEmployeeId={filters.assignedEmployeeId}
        assignedLocationId={filters.assignedLocationId}
        search={filters.search}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <Spinner size="lg" label="Loading assets directory..." className="py-16" />
      ) : assets.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <PackageX className="w-8 h-8 stroke-1" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No matching assets found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 font-medium">
            No assets match your search or filter parameters. Try clearing your filters or creating a new asset.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block">
            <AssetTable
              assets={assets}
              onEdit={(asset) => {
                setSelectedAsset(asset);
                setEditOpen(true);
              }}
              onAssign={(asset) => {
                setSelectedAsset(asset);
                setAssignModal({ mode: 'assign', open: true });
              }}
              onUnassign={(asset) => {
                setSelectedAsset(asset);
                setAssignModal({ mode: 'unassign', open: true });
              }}
              onChangeStatus={(asset) => {
                setSelectedAsset(asset);
                setStatusOpen(true);
              }}
            />
          </div>

          {/* Mobile Card Grid View (Hidden on desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onEdit={(a) => {
                  setSelectedAsset(a);
                  setEditOpen(true);
                }}
                onAssign={(a) => {
                  setSelectedAsset(a);
                  setAssignModal({ mode: 'assign', open: true });
                }}
                onUnassign={(a) => {
                  setSelectedAsset(a);
                  setAssignModal({ mode: 'unassign', open: true });
                }}
                onChangeStatus={(a) => {
                  setSelectedAsset(a);
                  setStatusOpen(true);
                }}
              />
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            meta={meta}
            onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
          />
        </>
      )}

      {/* Modals */}
      <CreateAssetModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchAssets}
      />

      <EditAssetModal
        asset={selectedAsset}
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedAsset(null);
        }}
        onSuccess={fetchAssets}
      />

      <AssignAssetModal
        asset={selectedAsset}
        mode={assignModal.mode}
        isOpen={assignModal.open}
        onClose={() => {
          setAssignModal({ mode: 'assign', open: false });
          setSelectedAsset(null);
        }}
        onSuccess={fetchAssets}
      />

      <ChangeStatusModal
        asset={selectedAsset}
        isOpen={statusOpen}
        onClose={() => {
          setStatusOpen(false);
          setSelectedAsset(null);
        }}
        onSuccess={fetchAssets}
      />
    </div>
  );
};

