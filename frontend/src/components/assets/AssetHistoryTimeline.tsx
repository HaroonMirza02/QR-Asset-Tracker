import React, { useEffect, useState, useCallback } from 'react';
import { getAssetHistoryApi } from '../../api/assets';
import { AssetHistory, HistoryEventType } from '../../types/asset';
import { ApiMeta } from '../../types/api';
import { Select, SelectOption } from '../common/Select';
import { Pagination } from '../common/Pagination';
import { Spinner } from '../common/Spinner';
import { Alert } from '../common/Alert';
import {
  History,
  PlusCircle,
  RefreshCw,
  UserCheck,
  MapPin,
  UserX,
  Edit,
  Clock,
} from 'lucide-react';

interface AssetHistoryTimelineProps {
  assetId: string;
}

export const AssetHistoryTimeline: React.FC<AssetHistoryTimelineProps> = ({ assetId }) => {
  const [history, setHistory] = useState<AssetHistory[]>([]);
  const [meta, setMeta] = useState<ApiMeta | undefined>();
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAssetHistoryApi(assetId, {
        page,
        limit: 10,
        eventType: eventType || undefined,
      });
      setHistory(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      setError('Failed to load asset history timeline.');
    } finally {
      setLoading(false);
    }
  }, [assetId, page, eventType]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const eventTypeOptions: SelectOption[] = [
    { value: '', label: 'All Event Types' },
    { value: 'Created', label: 'Created' },
    { value: 'StatusChange', label: 'Status Change' },
    { value: 'AssignedToEmployee', label: 'Assigned to Employee' },
    { value: 'AssignedToLocation', label: 'Assigned to Location' },
    { value: 'Unassigned', label: 'Unassigned' },
    { value: 'Updated', label: 'Updated Metadata' },
  ];

  const getEventBadge = (type: HistoryEventType) => {
    switch (type) {
      case 'Created':
        return {
          icon: <PlusCircle className="w-4 h-4 text-emerald-600" />,
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          label: 'Asset Created',
        };
      case 'StatusChange':
        return {
          icon: <RefreshCw className="w-4 h-4 text-blue-600" />,
          bg: 'bg-blue-50 border-blue-200 text-blue-800',
          label: 'Status Changed',
        };
      case 'AssignedToEmployee':
        return {
          icon: <UserCheck className="w-4 h-4 text-indigo-600" />,
          bg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
          label: 'Assigned to Employee',
        };
      case 'AssignedToLocation':
        return {
          icon: <MapPin className="w-4 h-4 text-purple-600" />,
          bg: 'bg-purple-50 border-purple-200 text-purple-800',
          label: 'Assigned to Location',
        };
      case 'Unassigned':
        return {
          icon: <UserX className="w-4 h-4 text-amber-600" />,
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          label: 'Unassigned',
        };
      case 'Updated':
        return {
          icon: <Edit className="w-4 h-4 text-slate-600" />,
          bg: 'bg-slate-100 border-slate-200 text-slate-800',
          label: 'Metadata Updated',
        };
      default:
        return {
          icon: <Clock className="w-4 h-4 text-slate-500" />,
          bg: 'bg-slate-100 border-slate-200 text-slate-700',
          label: type,
        };
    }
  };

  const renderValueDeltas = (item: AssetHistory) => {
    const { previousValue, newValue } = item;
    if (!previousValue && !newValue) return null;

    if (item.eventType === 'StatusChange') {
      return (
        <p className="text-xs text-slate-600 mt-1 break-words">
          Status changed from <span className="font-semibold text-slate-800">{previousValue?.status || 'N/A'}</span> to <span className="font-semibold text-indigo-600">{newValue?.status}</span>
        </p>
      );
    }

    if (item.eventType === 'Updated') {
      const keys = Object.keys(newValue || {});
      if (keys.length === 0) return null;
      return (
        <div className="text-xs text-slate-600 mt-1 space-y-1 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100 break-all break-words max-w-full overflow-hidden">
          {keys.map((k) => (
            <div key={k} className="break-all break-words">
              <span className="font-semibold text-slate-800">{k}:</span>{' '}
              <span className="line-through text-slate-400 mr-1.5 break-all">{String(previousValue?.[k] ?? 'none')}</span>
              <span className="text-emerald-700 font-semibold break-all">{String(newValue?.[k])}</span>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Audit History Log</h3>
            <p className="text-[11px] text-slate-400 font-medium">Immutable append-only lifecycle timeline</p>
          </div>
        </div>

        <div className="w-full sm:w-56">
          <Select
            options={eventTypeOptions}
            value={eventType}
            onChange={(val) => {
              setEventType(val);
              setPage(1);
            }}
            placeholder="Filter by event type"
          />
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <Spinner label="Loading history log..." />
      ) : history.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs font-semibold">No history events recorded yet</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {history.map((item) => {
            const badge = getEventBadge(item.eventType);
            const dateStr = new Date(item.createdAt).toLocaleString();

            return (
              <div key={item.id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center group-hover:border-indigo-600 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-indigo-600 transition-colors" />
                </div>

                <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-bold ${badge.bg}`}>
                      {badge.icon}
                      {badge.label}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </div>

                  {renderValueDeltas(item)}

                  {item.note && (
                    <p className="text-xs text-slate-700 italic bg-white p-2 rounded-lg border border-slate-200/60 mt-2 break-words break-all">
                      "{item.note}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination meta={meta} onPageChange={(p) => setPage(p)} />
    </div>
  );
};
