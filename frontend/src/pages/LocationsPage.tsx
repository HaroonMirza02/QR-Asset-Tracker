import React, { useEffect, useState, useCallback } from 'react';
import { listLocationsApi, ListLocationsParams } from '../api/locations';
import { Location, LocationType } from '../types/organization';
import { ApiMeta } from '../types/api';
import { SearchInput } from '../components/common/SearchInput';
import { Select, SelectOption } from '../components/common/Select';
import { Pagination } from '../components/common/Pagination';
import { Spinner } from '../components/common/Spinner';
import { Alert } from '../components/common/Alert';
import { Badge } from '../components/common/Badge';
import { MapPin, Building2, Navigation } from 'lucide-react';

export const LocationsPage: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [meta, setMeta] = useState<ApiMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ListLocationsParams>({
    page: 1,
    limit: 12,
    type: '',
    search: '',
  });

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listLocationsApi(filters);
      setLocations(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      setError('Failed to load locations list.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const typeOptions: SelectOption[] = [
    { value: '', label: 'All Location Types' },
    { value: 'site', label: 'Site Campus' },
    { value: 'building', label: 'Building' },
    { value: 'zone', label: 'Zone' },
    { value: 'room', label: 'Room' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Locations Directory
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Physical sites, buildings, and rooms for asset location tracking
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SearchInput
          value={filters.search || ''}
          onChange={(val) => setFilters((prev) => ({ ...prev, search: val, page: 1 }))}
          placeholder="Search location by name..."
        />

        <Select
          options={typeOptions}
          value={filters.type || ''}
          onChange={(val) => setFilters((prev) => ({ ...prev, type: val as LocationType, page: 1 }))}
          placeholder="Filter location type"
        />
      </div>

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <Spinner size="lg" label="Loading locations..." className="py-16" />
      ) : locations.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-500">
          <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40 stroke-1" />
          <p className="text-sm font-bold">No locations found matching criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <Badge variant="indigo" className="uppercase text-[10px]">
                    {loc.type}
                  </Badge>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base">{loc.name}</h3>

                {loc.address && (
                  <p className="text-xs font-medium text-slate-500 flex items-start gap-1.5 mt-2">
                    <Navigation className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>{loc.address}</span>
                  </p>
                )}
              </div>

              <div className="pt-3 mt-4 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
                ID: {loc.id}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination meta={meta} onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))} />
    </div>
  );
};
