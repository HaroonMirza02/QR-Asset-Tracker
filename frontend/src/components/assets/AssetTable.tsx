import React from 'react';
import { Link } from 'react-router-dom';
import { Asset } from '../../types/asset';
import { AssetStatusBadge } from '../common/AssetStatusBadge';
import { Badge } from '../common/Badge';
import { Eye, Edit3, UserCheck, RefreshCw, EyeOff, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AssetTableProps {
  assets: Asset[];
  onEdit?: (asset: Asset) => void;
  onAssign?: (asset: Asset) => void;
  onUnassign?: (asset: Asset) => void;
  onChangeStatus?: (asset: Asset) => void;
}

export const AssetTable: React.FC<AssetTableProps> = ({
  assets,
  onEdit,
  onAssign,
  onUnassign,
  onChangeStatus,
}) => {
  const { isAdmin } = useAuth();

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <th className="py-3.5 px-4 sm:px-6">Asset Code</th>
            <th className="py-3.5 px-4 sm:px-6">Name</th>
            <th className="py-3.5 px-4 sm:px-6">Category</th>
            <th className="py-3.5 px-4 sm:px-6">Status</th>
            <th className="py-3.5 px-4 sm:px-6">Visibility</th>
            <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-medium">
          {assets.map((asset) => {
            const isAssigned = Boolean(asset.assignedEmployeeId || asset.assignedLocationId);
            const isRetired = asset.status === 'Retired';

            return (
              <tr
                key={asset.id}
                className="hover:bg-slate-50/60 transition-colors group"
              >
                <td className="py-3.5 px-4 sm:px-6 font-bold text-indigo-600 font-mono">
                  {asset.assetCode}
                </td>
                <td className="py-3.5 px-4 sm:px-6">
                  <Link
                    to={`/assets/${asset.id}`}
                    className="font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                  >
                    {asset.name}
                  </Link>
                  {asset.serialNumber && (
                    <p className="text-[11px] text-slate-400 font-mono font-normal">
                      S/N: {asset.serialNumber}
                    </p>
                  )}
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-slate-600 font-medium">
                  {asset.category}
                </td>
                <td className="py-3.5 px-4 sm:px-6">
                  <AssetStatusBadge status={asset.status} size="sm" />
                </td>
                <td className="py-3.5 px-4 sm:px-6">
                  {asset.isPublicVisible ? (
                    <Badge variant="emerald" className="gap-1 text-[10px]">
                      <Globe className="w-3 h-3" /> Public
                    </Badge>
                  ) : (
                    <Badge variant="neutral" className="gap-1 text-[10px]">
                      <EyeOff className="w-3 h-3" /> Private
                    </Badge>
                  )}
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      to={`/assets/${asset.id}`}
                      title="View Details"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>

                    {isAdmin && (
                      <>
                        <button
                          onClick={() => onEdit?.(asset)}
                          disabled={isRetired}
                          title={isRetired ? 'Retired assets cannot be edited' : 'Edit Asset'}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => (isAssigned ? onUnassign?.(asset) : onAssign?.(asset))}
                          disabled={isRetired}
                          title={
                            isRetired
                              ? 'Retired assets cannot be assigned'
                              : isAssigned
                              ? 'Unassign Asset'
                              : 'Assign Asset'
                          }
                          className={`p-1.5 rounded-lg transition-colors ${
                            isAssigned
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                          } disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed`}
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onChangeStatus?.(asset)}
                          disabled={isRetired}
                          title={isRetired ? 'Retired asset state is terminal' : 'Change Status'}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
