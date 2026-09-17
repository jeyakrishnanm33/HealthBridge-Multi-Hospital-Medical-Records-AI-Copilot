import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Stethoscope,
  User,
  Calendar,
  AlertCircle,
  Loader2,
  Ban,
  Eye,
  Info,
} from 'lucide-react';
import { fetchConsents, revokeConsent } from '../services/api';
import ConsentDetailModal from './ConsentDetailModal';

const STATUS_THEME = {
  ACTIVE: {
    label: 'Active & Permitted',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: CheckCircle2,
  },
  REVOKED: {
    label: 'Revoked by Patient',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    icon: XCircle,
  },
  EXPIRED: {
    label: 'Expired',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: Clock,
  },
};

export default function ConsentList({ currentUser }) {
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [selectedConsent, setSelectedConsent] = useState(null);

  // Revocation modal state
  const [revokingConsent, setRevokingConsent] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokingAction, setRevokingAction] = useState(false);

  const loadConsents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchConsents({
        status: statusFilter,
      });
      setConsents(data.consents || []);
    } catch (err) {
      setError(err.message || 'Failed to load clinical consents');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadConsents();
  }, [loadConsents]);

  const handleConfirmRevoke = async () => {
    if (!revokingConsent) return;
    setRevokingAction(true);
    setError('');
    try {
      await revokeConsent(revokingConsent.id || revokingConsent._id, revokeReason);
      setRevokingConsent(null);
      setRevokeReason('');
      await loadConsents();
    } catch (err) {
      setError(err.message || 'Failed to revoke clinical consent');
    } finally {
      setRevokingAction(false);
    }
  };

  const isPatient = currentUser?.role === 'PATIENT';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Clinical Consent Registry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isPatient
              ? 'Manage active data-sharing permissions and revoke cross-hospital access instantly'
              : 'Review valid authorizations granting access to external patient clinical records'}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {['ALL', 'ACTIVE', 'REVOKED', 'EXPIRED'].map((st) => (
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

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-900/40 rounded-2xl border border-slate-800/80">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="text-sm">Loading consent authorizations...</span>
        </div>
      ) : consents.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80">
          <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No Consents Recorded</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {statusFilter === 'ALL'
              ? 'There are no consent records registered.'
              : `No consent artifacts found with status '${statusFilter.toLowerCase()}'.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {consents.map((c) => {
            const consentId = c.id || c._id;
            const effectiveStatus = c.effectiveStatus || 'ACTIVE';
            const theme = STATUS_THEME[effectiveStatus] || STATUS_THEME.ACTIVE;
            const StatusIcon = theme.icon;

            return (
              <div
                key={consentId}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3.5">
                  {/* Top row */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${theme.bg} ${theme.border} ${theme.text}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {theme.label}
                    </span>

                    <span className="text-xs text-slate-500 font-mono">
                      EXP: {new Date(c.expiresAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Doctor & Facility */}
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-teal-400" />
                      {c.requestingDoctor?.fullName || 'Physician'}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      At: {c.requestingHospital?.name || 'Local Hospital'}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-sky-500" />
                      Records from: {c.sourceHospital?.name || 'Source Hospital'}
                    </div>
                  </div>

                  {/* Scopes */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Granular Clinical Scopes
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {['VISITS', 'DIAGNOSES', 'MEDICATIONS', 'LAB_RESULTS', 'PRESCRIPTIONS', 'DOCUMENTS'].map((scopeName) => {
                        const isPermitted = c.scopes?.includes(scopeName);
                        if (!isPermitted && effectiveStatus !== 'ACTIVE') return null;
                        return (
                          <span
                            key={scopeName}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                              isPermitted
                                ? 'bg-teal-500/10 border-teal-500/30 text-teal-300 font-semibold'
                                : 'bg-slate-900/40 border-slate-800 text-slate-600 line-through'
                            }`}
                          >
                            {isPermitted ? `✓ ${scopeName.replace('_', ' ')}` : `✕ ${scopeName.replace('_', ' ')}`}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => setSelectedConsent(c)}
                    className="text-slate-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>

                  {isPatient && effectiveStatus === 'ACTIVE' && (
                    <button
                      onClick={() => setRevokingConsent(c)}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold transition-colors flex items-center gap-1"
                    >
                      <Ban className="w-3 h-3" />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Consent Detail Modal */}
      {selectedConsent && (
        <ConsentDetailModal
          consent={selectedConsent}
          isOpen={true}
          onClose={() => setSelectedConsent(null)}
          onRevokeClick={(c) => setRevokingConsent(c)}
          isPatient={isPatient}
        />
      )}

      {/* Revocation Confirmation Dialog */}
      {revokingConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Revoke Clinical Consent</h3>
                <p className="text-xs text-slate-400">Immediate termination of cross-hospital data access</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to revoke consent for{' '}
              <strong className="text-white">{revokingConsent.requestingDoctor?.fullName}</strong>? The doctor will
              immediately lose authorization to query your external records at{' '}
              <strong className="text-white">{revokingConsent.sourceHospital?.name}</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reason for Revocation (Optional)
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={2}
                placeholder="e.g. Treatment completed, no longer consulting..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRevokingConsent(null)}
                disabled={revokingAction}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl"
              >
                Keep Consent Active
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={revokingAction}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-rose-500 hover:bg-rose-400 text-white flex items-center gap-1.5 shadow-lg shadow-rose-500/20"
              >
                {revokingAction ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Ban className="w-3.5 h-3.5" />
                )}
                <span>Confirm Revocation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
