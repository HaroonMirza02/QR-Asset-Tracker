import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { scanPublicQrApi } from '../api/public';
import { PublicAssetProfile } from '../types/asset';
import { AssetStatusBadge } from '../components/common/AssetStatusBadge';
import { Spinner } from '../components/common/Spinner';
import {
  QrCode,
  ShieldCheck,
  AlertCircle,
  Tag,
  User,
  MapPin,
  CheckCircle,
  FileText,
  Building,
  Layers,
  Sparkles,
} from 'lucide-react';

export const PublicScanPage: React.FC = () => {
  const { qrToken } = useParams<{ qrToken: string }>();
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('t') || '';

  const [profile, setProfile] = useState<PublicAssetProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadPublicScan() {
      if (!qrToken || !tenantId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setNotFound(false);
        const data = await scanPublicQrApi(qrToken, tenantId);
        setProfile(data);
      } catch (err) {
        // Backend returns 404 for malformed token, unknown token, inactive tenant, or non-public asset.
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadPublicScan();
  }, [qrToken, tenantId]);

  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 font-sans relative overflow-hidden">
      {/* Dynamic Ambient Background Lights */}
      <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-[500px] h-[500px] bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl border border-white/20 relative z-10 animate-in fade-in zoom-in-95 duration-300 space-y-6">
        {/* Brand Header & Security Verification Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-base text-slate-900 leading-tight block">
                Public Asset Verification
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mt-0.5">
                Official Organization Security Scan
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold self-start sm:self-auto">
            {/* <ShieldCheck className="w-4 h-4 text-emerald-600" /> */}
            <span>Verified Tag Scan</span>
          </div>
        </div>

        {loading ? (
          <Spinner size="lg" label="Verifying QR asset tag..." className="py-16" />
        ) : notFound || !profile ? (
          /* Generic Friendly Error Screen */
          <div className="text-center py-12 space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">QR Code Not Recognized</h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto mt-2 leading-relaxed">
                This QR tag could not be verified. It may be inactive, decommissioned, invalid, or hidden from public scan lookup by organization security policy.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                Invalid or Expired Asset Tag
              </span>
            </div>
          </div>
        ) : (
          /* Premium Public Profile View */
          <div className="space-y-6">
            {/* Hero Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 shadow-xs text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-xs font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl shadow-xs">
                  {profile.assetCode}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  {profile.category}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {profile.name}
              </h1>

              <div className="pt-1 flex items-center justify-center">
                <AssetStatusBadge status={profile.status} size="lg" />
              </div>
            </div>

            {/* Information Grid: Attributes & Assignment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Description Block */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Asset Description</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  {profile.description || 'No detailed specifications provided for this asset.'}
                </p>
              </div>

              {/* Assignment Target Block */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Current Assignment Target</span>
                </div>

                {profile.assignedTo ? (
                  profile.assignedTo.type === 'employee' ? (
                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                          Assigned Staff
                        </p>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {profile.assignedTo.displayName}
                        </h4>
                        {profile.assignedTo.title && (
                          <p className="text-xs text-slate-500 font-medium">
                            {profile.assignedTo.title}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                          Assigned Location
                        </p>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {profile.assignedTo.name}
                        </h4>
                        {profile.assignedTo.locationType && (
                          <p className="text-xs text-slate-500 font-medium">
                            Type: {profile.assignedTo.locationType}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-500 font-medium italic pt-1">
                    Unassigned — Currently in general organization inventory
                  </p>
                )}
              </div>
            </div>

            {/* Footer Trust Assurance */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600">
                {/* <Sparkles className="w-4 h-4 text-indigo-600" /> */}
                Verified Organization Asset
              </span>
              {/* <span>Scanned via Security Protocol</span> */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
