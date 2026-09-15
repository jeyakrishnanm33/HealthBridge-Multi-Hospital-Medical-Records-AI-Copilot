import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { updateHospitalStatus } from '../services/api';

export default function HospitalStatusActions({ hospital, currentUser, onStatusUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN';

  const handleAction = async (targetStatus) => {
    setError(null);
    setLoading(true);
    try {
      const updated = await updateHospitalStatus(hospital.id, targetStatus);
      onStatusUpdated(updated);
    } catch (err) {
      setError(err.message || 'Failed to update hospital status');
    } finally {
      setLoading(false);
    }
  };

  if (!isSystemAdmin) {
    return (
      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center space-x-2">
        <ShieldAlert className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <span>Only authenticated System Administrators can modify hospital lifecycle statuses.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-4 border-t border-slate-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          System Admin Lifecycle Actions
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
          SYSTEM_ADMIN
        </span>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {hospital.status === 'PENDING' && (
          <>
            <button
              onClick={() => handleAction('APPROVED')}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white transition-all shadow-md disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Approve Hospital</span>
            </button>

            <button
              onClick={() => handleAction('REJECTED')}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white transition-all shadow-md disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              <span>Reject Hospital</span>
            </button>
          </>
        )}

        {hospital.status === 'APPROVED' && (
          <button
            onClick={() => handleAction('SUSPENDED')}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white transition-all shadow-md disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>Suspend Hospital</span>
          </button>
        )}

        {(hospital.status === 'REJECTED' || hospital.status === 'SUSPENDED') && (
          <span className="text-xs text-slate-500 italic">
            This hospital is in terminal state ({hospital.status}). No further transitions are permitted by lifecycle policy.
          </span>
        )}
      </div>
    </div>
  );
}
