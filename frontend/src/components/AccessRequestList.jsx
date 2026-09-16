import React, { useState, useEffect, useCallback } from 'react';
import {
  FileKey,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Building2,
  User,
  Stethoscope,
  Calendar,
  AlertCircle,
  Loader2,
  Filter,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Send,
  Plus,
} from 'lucide-react';
import {
  fetchAccessRequests,
  approveAccessRequest,
  denyAccessRequest,
  cancelAccessRequest,
} from '../services/api';

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending Approval',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: Clock,
  },
  APPROVED: {
    label: 'Approved & Active',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: CheckCircle2,
  },
  DENIED: {
    label: 'Request Denied',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    icon: XCircle,
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-slate-700/20',
    border: 'border-slate-700/40',
    text: 'text-slate-400',
    icon: Ban,
  },
  EXPIRED: {
    label: 'Expired',
    bg: 'bg-slate-800/20',
    border: 'border-slate-800/40',
    text: 'text-slate-500',
    icon: Clock,
  },
};

export default function AccessRequestList({
  currentUser,
  onRequestNew,
  onConsentCreated,
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Approval modal state for patients
  const [approvingRequestId, setApprovingRequestId] = useState(null);
  const [approvalDays, setApprovalDays] = useState(7);
  const [approvalScopes, setApprovalScopes] = useState([]);

  // Denial / Cancellation state
  const [denyingRequestId, setDenyingRequestId] = useState(null);
  const [denyReason, setDenyReason] = useState('');
  const [cancellingRequestId, setCancellingRequestId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAccessRequests({
        status: statusFilter,
      });
      setRequests(data.requests || data.accessRequests || []);
    } catch (err) {
      setError(err.message || 'Failed to load access requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleOpenApprove = (req) => {
    setApprovingRequestId(req.id || req._id);
    setApprovalDays(7);
    setApprovalScopes(req.requestedScopes || []);
  };

  const handleConfirmApprove = async () => {
    if (!approvingRequestId) return;
    setActionLoadingId(approvingRequestId);
    setError('');
    try {
      const expiresAt = new Date(Date.now() + approvalDays * 24 * 60 * 60 * 1000).toISOString();
      await approveAccessRequest(approvingRequestId, {
        expiresAt,
        scopes: approvalScopes,
      });
      setApprovingRequestId(null);
      await loadRequests();
      if (onConsentCreated) onConsentCreated();
    } catch (err) {
      setError(err.message || 'Failed to approve access request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDeny = async () => {
    if (!denyingRequestId) return;
    setActionLoadingId(denyingRequestId);
    setError('');
    try {
      await denyAccessRequest(denyingRequestId, denyReason);
      setDenyingRequestId(null);
      setDenyReason('');
      await loadRequests();
    } catch (err) {
      setError(err.message || 'Failed to deny access request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingRequestId) return;
    setActionLoadingId(cancellingRequestId);
    setError('');
    try {
      await cancelAccessRequest(cancellingRequestId, cancelReason);
      setCancellingRequestId(null);
      setCancelReason('');
      await loadRequests();
    } catch (err) {
      setError(err.message || 'Failed to cancel access request');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileKey className="w-5 h-5 text-teal-400" />
            Cross-Hospital Access Requests
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {currentUser?.role === 'PATIENT'
              ? 'Review and manage data-sharing requests initiated by attending physicians'
              : 'Track cross-hospital records access requests submitted to external patient facilities'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentUser?.role === 'DOCTOR' && onRequestNew && (
            <button
              onClick={onRequestNew}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-teal-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Access Request</span>
            </button>
          )}

          {/* Filter tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {['ALL', 'PENDING', 'APPROVED', 'DENIED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-colors capitalize ${
                  statusFilter === st
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-900/40 rounded-2xl border border-slate-800/80">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
          <span className="text-sm">Loading access requests...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80">
          <FileKey className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No Access Requests Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {statusFilter === 'ALL'
              ? 'There are currently no cross-hospital records access requests recorded.'
              : `No access requests with status '${statusFilter.toLowerCase()}'.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((req) => {
            const reqId = req.id || req._id;
            const statusConfig = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = statusConfig.icon;
            const isProcessing = actionLoadingId === reqId;

            return (
              <div
                key={reqId}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition-all space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-3.5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig.label}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-500">ID: {reqId.slice(-8).toUpperCase()}</span>
                </div>

                {/* Facility & Participants Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Doctor & Requesting Hospital */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/40">
                    <div className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5" /> Requesting Physician
                    </div>
                    <div className="font-semibold text-slate-200">
                      {req.requestingDoctor?.fullName || 'Physician'}
                    </div>
                    <div className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      {req.requestingHospital?.name || 'Requesting Hospital'}
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/40">
                    <div className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" /> Source Facility
                    </div>
                    <div className="font-semibold text-slate-200">
                      {req.sourceHospital?.name || 'External Facility'}
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Records Custodian ({req.sourceHospital?.hospitalCode || 'HOSP'})
                    </div>
                  </div>

                  {/* Patient */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/40">
                    <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Patient Owner
                    </div>
                    <div className="font-semibold text-slate-200">
                      {req.patient?.user?.name || req.patient?.patientId || 'Patient'}
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Patient ID: {req.patient?.patientId || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Requested Scopes Badges */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Requested Clinical Records
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {req.requestedScopes?.map((sc) => (
                      <span
                        key={sc}
                        className="px-2.5 py-0.5 rounded-lg text-xs bg-slate-800 text-slate-200 border border-slate-700 font-medium"
                      >
                        {sc.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Purpose & Notes */}
                {(req.purpose || req.notes) && (
                  <div className="text-xs text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-800/40 space-y-1">
                    <div className="font-medium text-slate-300">
                      Purpose: <span className="text-teal-300 font-normal">{req.purpose || 'TREATMENT'}</span>
                    </div>
                    {req.notes && <div className="italic text-slate-400 font-normal">"{req.notes}"</div>}
                  </div>
                )}

                {/* Decision Reason if Denied or Cancelled */}
                {req.decisionReason && (
                  <div className="text-xs p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                    <span className="font-semibold">Reason:</span> {req.decisionReason}
                  </div>
                )}

                {/* Interactive Action Buttons */}
                {req.status === 'PENDING' && (
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                    {/* Patient Actions: Approve / Deny */}
                    {currentUser?.role === 'PATIENT' && (
                      <>
                        <button
                          onClick={() => setDenyingRequestId(reqId)}
                          disabled={isProcessing}
                          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-colors"
                        >
                          Deny Access
                        </button>
                        <button
                          onClick={() => handleOpenApprove(req)}
                          disabled={isProcessing}
                          className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20 transition-all flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Approve Request
                        </button>
                      </>
                    )}

                    {/* Doctor Actions: Cancel Own Request */}
                    {currentUser?.role === 'DOCTOR' && (
                      <button
                        onClick={() => setCancellingRequestId(reqId)}
                        disabled={isProcessing}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        Cancel Request
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Patient Approve Modal */}
      {approvingRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Approve Clinical Consent</h3>
                <p className="text-xs text-slate-400">Grant authorized access for the requested duration</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Consent Validity Duration</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { days: 3, label: '3 Days' },
                  { days: 7, label: '7 Days' },
                  { days: 30, label: '30 Days' },
                ].map((d) => (
                  <button
                    key={d.days}
                    type="button"
                    onClick={() => setApprovalDays(d.days)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      approvalDays === d.days
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div>
                You are authorizing the requesting physician to inspect records matching:{' '}
                <span className="text-teal-300 font-medium">
                  {approvalScopes.map((s) => s.replace('_', ' ')).join(', ')}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                You can revoke this consent at any moment from your "My Consents" dashboard.
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setApprovingRequestId(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={actionLoadingId !== null}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-teal-500/20"
              >
                {actionLoadingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirm & Grant Consent</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Deny Modal */}
      {denyingRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" /> Deny Access Request
            </h3>
            <p className="text-xs text-slate-400">
              Are you sure you wish to decline this cross-hospital access request? The physician will not be permitted to view your external records.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Denial (Optional)</label>
              <textarea
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                rows={2}
                placeholder="Brief reason for refusing records transfer..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDenyingRequestId(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmDeny}
                disabled={actionLoadingId !== null}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-rose-500 hover:bg-rose-400 text-white flex items-center gap-1.5 shadow-lg shadow-rose-500/20"
              >
                {actionLoadingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>Deny Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Cancel Modal */}
      {cancellingRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Ban className="w-5 h-5 text-slate-400" /> Cancel Access Request
            </h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to withdraw this request? The patient will no longer receive this authorization prompt.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cancellation Reason (Optional)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                placeholder="Reason for withdrawing request..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancellingRequestId(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={actionLoadingId !== null}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-1.5"
              >
                {actionLoadingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                <span>Confirm Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
