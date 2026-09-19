import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAssetByIdApi, regenerateQrApi } from '../api/assets';
import { getEmployeeByIdApi } from '../api/employees';
import { getLocationByIdApi } from '../api/locations';
import { Asset } from '../types/asset';
import { Employee, Location } from '../types/organization';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../api/client';

import { AssetStatusBadge } from '../components/common/AssetStatusBadge';
import { Badge } from '../components/common/Badge';
import { Spinner } from '../components/common/Spinner';
import { Alert } from '../components/common/Alert';
import { Modal } from '../components/common/Modal';
import { QrLabelModal } from '../components/assets/QrLabelModal';
import { QrLabelCard } from '../components/assets/QrLabelCard';
import { EditAssetModal } from '../components/assets/EditAssetModal';
import { AssignAssetModal } from '../components/assets/AssignAssetModal';
import { ChangeStatusModal } from '../components/assets/ChangeStatusModal';
import { AssetHistoryTimeline } from '../components/assets/AssetHistoryTimeline';

import {
  ArrowLeft,
  Edit3,
  UserCheck,
  RefreshCw,
  QrCode,
  Globe,
  EyeOff,
  User,
  MapPin,
  Tag,
  Hash,
  AlertTriangle,
  ExternalLink,
  Printer,
  FileText,
} from 'lucide-react';

export const AssetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [assignedEmployee, setAssignedEmployee] = useState<Employee | null>(null);
  const [assignedLocation, setAssignedLocation] = useState<Location | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [labelOpen, setLabelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignModal, setAssignModal] = useState<{ mode: 'assign' | 'unassign'; open: boolean }>({
    mode: 'assign',
    open: false,
  });
  const [statusOpen, setStatusOpen] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchAssetDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      setAssignedEmployee(null);
      setAssignedLocation(null);

      // 1. Fetch asset (request includeQrImage=true if Admin)
      const data = await getAssetByIdApi(id);
      setAsset(data);

      // 2. Resolve Raw ObjectIds if assigned
      if (data.assignedEmployeeId) {
        try {
          const emp = await getEmployeeByIdApi(data.assignedEmployeeId);
          setAssignedEmployee(emp);
        } catch {
          /* optional error fallback */
        }
      } else if (data.assignedLocationId) {
        try {
          const loc = await getLocationByIdApi(data.assignedLocationId);
          setAssignedLocation(loc);
        } catch {
          /* optional error fallback */
        }
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin]);

  useEffect(() => {
    fetchAssetDetails();
  }, [fetchAssetDetails]);

  const handleRegenerateQr = async () => {
    if (!asset) return;
    try {
      setRegenerating(true);
      const updated = await regenerateQrApi(asset.id);
      setAsset(updated);
      showToast('success', `New QR Code generated for ${asset.assetCode}! Previous code invalidated.`);
      setRegenerateConfirmOpen(false);
    } catch (err: any) {
      showToast('error', getErrorMessage(err));
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return <Spinner size="lg" label="Loading asset details..." className="py-20" />;
  }

  if (error || !asset) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/assets')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Assets List
        </button>
        <Alert type="error" message={error || 'Asset not found'} />
      </div>
    );
  }

  const isAssigned = Boolean(asset.assignedEmployeeId || asset.assignedLocationId);
  const isRetired = asset.status === 'Retired';

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <button
          onClick={() => navigate('/assets')}
          className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-500 hover:text-indigo-600 hover:bg-slate-100/80 px-3 py-1.5 rounded-xl transition-all duration-150"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Assets Directory
        </button>
      </div>

      {/* Main Asset Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              {asset.assetCode}
            </span>
            <AssetStatusBadge status={asset.status} size="md" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {asset.name}
          </h1>
        </div>

        {/* Action Toolbar (Admin Only) */}
        {isAdmin && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <button
              onClick={() => setEditOpen(true)}
              disabled={isRetired}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
            >
              <Edit3 className="w-4 h-4 text-slate-500" />
              Edit Details
            </button>

            <button
              onClick={() => setAssignModal({ mode: isAssigned ? 'unassign' : 'assign', open: true })}
              disabled={isRetired}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold transition-colors shadow-2xs ${
                isAssigned
                  ? 'border-amber-200 text-amber-900 bg-amber-50 hover:bg-amber-100'
                  : 'border-indigo-200 text-indigo-900 bg-indigo-50 hover:bg-indigo-100'
              } disabled:opacity-40`}
            >
              <UserCheck className="w-4 h-4" />
              {isAssigned ? 'Unassign Target' : 'Assign Target'}
            </button>

            <button
              onClick={() => setStatusOpen(true)}
              disabled={isRetired}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              Change Status
            </button>
          </div>
        )}
      </div>

      {/* Retired Banner warning if applicable */}
      {isRetired && (
        <Alert
          type="warning"
          title="Terminal Retired State"
          message="This asset is marked as Retired. The system prohibits further editing, status changes, or assignment modifications on retired assets."
        />
      )}

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Asset Identity & Attributes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" /> Category
                </span>
                <p className="font-bold text-slate-800">{asset.category}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-slate-400" /> Serial Number
                </span>
                <p className="font-mono font-bold text-slate-800">
                  {asset.serialNumber || 'N/A'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" /> Public Scan
                </span>
                <div>
                  {asset.isPublicVisible ? (
                    <Badge variant="emerald" className="gap-1">
                      <Globe className="w-3 h-3" /> Publicly Viewable
                    </Badge>
                  ) : (
                    <Badge variant="neutral" className="gap-1">
                      <EyeOff className="w-3 h-3" /> Hidden from Public
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {asset.description && (
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Description / Specifications
                </span>
                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                  {asset.description}
                </p>
              </div>
            )}

            {/* Resolved Assignment Block */}
            <div className="pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Current Assignment Target
              </span>

              {assignedEmployee ? (
                <div className="flex items-center gap-3 p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">
                      Assigned Employee
                    </p>
                    <h4 className="text-sm font-extrabold text-slate-900">{assignedEmployee.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      {assignedEmployee.title} • {assignedEmployee.department || 'No dept'}
                    </p>
                  </div>
                </div>
              ) : assignedLocation ? (
                <div className="flex items-center gap-3 p-4 bg-purple-50/60 border border-purple-100 rounded-xl">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">
                      Assigned Physical Location
                    </p>
                    <h4 className="text-sm font-extrabold text-slate-900">{assignedLocation.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Type: {assignedLocation.type} {assignedLocation.address ? `• ${assignedLocation.address}` : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-500 font-medium italic">
                  Unassigned — Currently in organization general inventory
                </div>
              )}
            </div>
          </div>

          {/* Audit History Log Timeline */}
          <AssetHistoryTimeline assetId={asset.id} />
        </div>

        {/* Right Column: QR Tag Card & Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs text-center space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-indigo-600" />
                Physical QR Tag Label
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Print Ready
              </span>
            </div>

            {/* Render High-Contrast Professional QR Label Card */}
            <QrLabelCard asset={asset} id={labelOpen ? 'sidebar-qr-label' : 'printable-qr-label'} />

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  document.body.classList.add('print-label-only');
                  window.print();
                  setTimeout(() => {
                    document.body.classList.remove('print-label-only');
                  }, 1000);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-900/20"
              >
                <Printer className="w-4 h-4" />
                Print QR Tag Label Only
              </button>

              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Print Full Asset Report (Incl. Audit Logs)
              </button>

              {asset.qrToken && (
                <a
                  href={`/scan/${asset.qrToken}${asset.qrCodeUrl && asset.qrCodeUrl.includes('?') ? asset.qrCodeUrl.substring(asset.qrCodeUrl.indexOf('?')) : ''}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-4 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                  Test Public Scan URL
                </a>
              )}
            </div>

            {isAdmin && (
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => setRegenerateConfirmOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200/60 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate QR Token
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <QrLabelModal asset={asset} isOpen={labelOpen} onClose={() => setLabelOpen(false)} />

      <EditAssetModal
        asset={asset}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={fetchAssetDetails}
      />

      <AssignAssetModal
        asset={asset}
        mode={assignModal.mode}
        isOpen={assignModal.open}
        onClose={() => setAssignModal({ mode: 'assign', open: false })}
        onSuccess={fetchAssetDetails}
      />

      <ChangeStatusModal
        asset={asset}
        isOpen={statusOpen}
        onClose={() => setStatusOpen(false)}
        onSuccess={fetchAssetDetails}
      />

      {/* Regenerate Confirmation Modal */}
      <Modal
        isOpen={regenerateConfirmOpen}
        onClose={() => setRegenerateConfirmOpen(false)}
        title="Confirm Regenerate QR Code"
        subtitle="Invalidate existing QR code and generate a new token pair"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Warning: Old QR code will be invalidated!</p>
              <p>
                Regenerating will permanently disable the old physical QR label. Anyone scanning the old QR tag will receive a 404 error until a new label is printed and attached.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setRegenerateConfirmOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRegenerateQr}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 transition-all shadow-md shadow-rose-600/20"
            >
              <RefreshCw className="w-4 h-4" />
              {regenerating ? 'Regenerating...' : 'Regenerate QR Token'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

