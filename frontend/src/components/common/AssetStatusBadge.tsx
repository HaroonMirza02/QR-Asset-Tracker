import React from 'react';
import { AssetStatus } from '../../types/asset';

interface AssetStatusBadgeProps {
  status: AssetStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const AssetStatusBadge: React.FC<AssetStatusBadgeProps> = ({ status, size = 'md' }) => {
  const styles: Record<AssetStatus, { bg: string; dot: string }> = {
    Available: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-500',
    },
    Assigned: {
      bg: 'bg-blue-50 text-blue-800 border-blue-200',
      dot: 'bg-blue-500',
    },
    'In Repair': {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-500',
    },
    Retired: {
      bg: 'bg-slate-100 text-slate-700 border-slate-300',
      dot: 'bg-slate-400',
    },
    Lost: {
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
      dot: 'bg-rose-500',
    },
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  const style = styles[status] || styles.Available;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-sm ${style.bg} ${sizes[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`} />
      {status}
    </span>
  );
};
