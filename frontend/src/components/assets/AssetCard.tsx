import React from 'react';
import { Link } from 'react-router-dom';
import { Asset } from '../../types/asset';
import { AssetStatusBadge } from '../common/AssetStatusBadge';
import { Badge } from '../common/Badge';
import { Eye, Edit3, UserCheck, RefreshCw, Globe, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AssetCardProps {
  asset: Asset;
  onEdit?: (asset: Asset) => void;
  onAssign?: (asset: Asset) => void;
  onUnassign?: (asset: Asset) => void;
  onChangeStatus?: (asset: Asset) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  onEdit,
  onAssign,
  onUnassign,
  onChangeStatus,
}) => {
  const { isAdmin } = useAuth();
  const isAssigned = Boolean(asset.assignedEmployeeId || asset.assignedLocationId);
  const isRetired = asset.status === 'Retired';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between space-y-3">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-mono text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
            {asset.assetCode}
          </span>
          <AssetStatusBadge status={asset.status} size="sm" />
        </div>

        <Link
          to={`/assets/${asset.id}`}
          className="font-bold text-slate-900 text-base hover:text-indigo-600 transition-colors block line-clamp-1"
        >
          {asset.name}
        </Link>

        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
          <span>{asset.category}</span>
          <span>•</span>
          {asset.isPublicVisible ? (
            <Badge variant="emerald" className="text-[10px] gap-1">
              <Globe className="w-2.5 h-2.5" /> Public
            </Badge>
          ) : (
            <Badge variant="neutral" className="text-[10px] gap-1">
              <EyeOff className="w-2.5 h-2.5" /> Private
            </Badge>
          )}
        </div>

        {asset.serialNumber && (
          <p className="text-[11px] font-mono text-slate-400 mt-2">
            S/N: {asset.serialNumber}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <Link
          to={`/assets/${asset.id}`}
          className="flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <Eye className="w-4 h-4" />
          View Details
        </Link>

        {isAdmin && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit?.(asset)}
              disabled={isRetired}
              title="Edit"
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg disabled:opacity-30"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => (isAssigned ? onUnassign?.(asset) : onAssign?.(asset))}
              disabled={isRetired}
              title={isAssigned ? 'Unassign' : 'Assign'}
              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg disabled:opacity-30"
            >
              <UserCheck className="w-4 h-4" />
            </button>
            <button
              onClick={() => onChangeStatus?.(asset)}
              disabled={isRetired}
              title="Status"
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg disabled:opacity-30"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
