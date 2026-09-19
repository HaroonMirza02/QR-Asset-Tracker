import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../api/client';
import { PublicAssetProfile } from '../types/asset';
import { AssetStatusBadge } from '../components/common/AssetStatusBadge';
import { AlertCircle, ArrowLeft, RefreshCw, Box, User, MapPin } from 'lucide-react';

type ScanState = { kind: 'loading' | 'invalid' | 'unavailable' } | { kind: 'success'; profile: PublicAssetProfile };
export const PublicScanPage = () => {
  const { qrToken = '' } = useParams();
  const [params] = useSearchParams();
  const tenantId = params.get('t') || '';
  const [state, setState] = useState<ScanState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!/^[a-f0-9]{64}$/.test(qrToken) || !/^[a-fA-F0-9]{24}$/.test(tenantId)) { setState({ kind: 'invalid' }); return; }
    const controller = new AbortController();
    setState({ kind: 'loading' });
    apiClient.get(`/api/public/scan/${qrToken}`, { params: { t: tenantId }, signal: controller.signal, timeout: 15000 })
      .then(r => { if (!controller.signal.aborted) setState({ kind: 'success', profile: r.data.data }); })
      .catch(e => { if (controller.signal.aborted) return; setState({ kind: axios.isAxiosError(e) && [404,422].includes(e.response?.status || 0) ? 'invalid' : 'unavailable' }); });
    return () => controller.abort();
  }, [qrToken, tenantId, attempt]);
  return <main className="min-h-screen bg-slate-50 px-5 py-10 sm:py-16"><div className="max-w-lg mx-auto"><Link to="/" className="flex items-center justify-center gap-1 mb-8 font-extrabold text-xl text-slate-900"><img src="/images/eztrack-logo-ui.png" width="52" height="52" alt="" />EZTrack</Link><section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
    {state.kind === 'loading' ? <div role="status" className="py-16 text-center text-sm text-slate-500">Loading asset profile…</div> : state.kind === 'success' ? <><p className="text-xs text-slate-400 uppercase tracking-widest mb-5">Public asset profile</p><div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-xl grid place-items-center mb-5"><Box size={28} /></div><span className="text-xs font-mono text-indigo-500">{state.profile.assetCode}</span><h1 className="text-2xl font-extrabold tracking-tight mt-2 mb-4">{state.profile.name}</h1><AssetStatusBadge status={state.profile.status} /><dl className="mt-7 divide-y divide-slate-100 text-sm"><div className="py-4 flex justify-between gap-5"><dt className="text-slate-400">Category</dt><dd>{state.profile.category}</dd></div><div className="py-4"><dt className="text-slate-400 mb-2">Description</dt><dd className="leading-relaxed">{state.profile.description || 'No description provided.'}</dd></div><div className="py-4"><dt className="text-slate-400 mb-2">Assignment</dt><dd className="flex items-start gap-2">{state.profile.assignedTo?.type === 'employee' ? <><User size={17} /><span>{state.profile.assignedTo.displayName}<small className="block text-slate-400 mt-1">{state.profile.assignedTo.title}</small></span></> : state.profile.assignedTo?.type === 'location' ? <><MapPin size={17} />{state.profile.assignedTo.name}</> : 'Unassigned'}</dd></div></dl><p className="text-xs text-slate-400 pt-4 border-t border-slate-100">Public information only. Sign in to your workspace to manage assets.</p></> : <div className="text-center py-8" role="alert"><AlertCircle className="mx-auto mb-5 text-amber-500" size={38} /><h1 className="text-xl font-bold mb-3">{state.kind === 'invalid' ? 'QR code not recognized' : 'Unable to load this asset'}</h1><p className="text-sm text-slate-500 leading-relaxed">{state.kind === 'invalid' ? 'This link may be incomplete, replaced, or no longer publicly available. Scan the latest label or contact your asset administrator.' : 'We could not reach the asset service. Check your connection and try again.'}</p>{state.kind === 'unavailable' && <button onClick={() => setAttempt(v => v + 1)} className="inline-flex items-center gap-2 mt-6 rounded-lg px-5 py-3 bg-indigo-600 text-white text-sm"><RefreshCw size={16} />Try again</button>}</div>}
    </section><Link to="/" className="mt-6 flex justify-center items-center gap-2 text-xs text-slate-500"><ArrowLeft size={14} />Back to EZTrack</Link></div></main>;
};

